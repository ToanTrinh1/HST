import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNavigation from '../components/BottomNavigation';
import TopBar from '../components/TopBar';
import chatAPI from '../api/endpoints/chat.api';
import ChatMessages from '../components/Chat/ChatMessages';
import ChatInput from '../components/Chat/ChatInput';
import ChatSidebar from '../components/Chat/ChatSidebar';
import { useChatMessages } from '../components/Chat/useChatMessages';
import websocketService from '../services/websocket.service';
import { buildAvatarUrl } from '../utils/avatar';
import './ChatPage.css';

/**
 * Trang chat thống nhất cho cả user và admin.
 * - User (embedded=false): danh sách admin, có TopBar + BottomNavigation.
 * - Admin (embedded=true): danh sách user/thread, chỉ nội dung chat (đã nằm trong AdminPage).
 */
const ChatPage = ({ embedded = false }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [peerList, setPeerList] = useState([]);
  const [peerSearch, setPeerSearch] = useState('');
  const [activePeer, setActivePeer] = useState(null);
  const [isLoadingPeers, setIsLoadingPeers] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const peerId = activePeer?.user_id ?? activePeer?.id;
  const peerDisplayName = activePeer?.user_name ?? activePeer?.name ?? (embedded ? 'User' : 'Admin');

  const {
    chatMessages,
    isChatLoading,
    isLoadingMore,
    hasMoreMessages,
    chatMessagesRef,
    shouldScrollToBottomRef,
    previousScrollHeightRef,
    isMaintainingScrollRef,
    fetchChatMessages,
    addMessage,
    markAsReadByReader,
  } = useChatMessages(peerId, true, location.key);

  const fetchPeers = useCallback(async () => {
    setIsLoadingPeers(true);
    try {
      const res = await chatAPI.listThreads();
      if (res.success && Array.isArray(res.data)) {
        setPeerList(res.data);
        if (!activePeer && res.data.length > 0) {
          setActivePeer(res.data[0]);
        }
      } else {
        setPeerList([]);
      }
    } catch (error) {
      console.error('❌ Lỗi khi lấy danh sách chat:', error);
      setPeerList([]);
    } finally {
      setIsLoadingPeers(false);
    }
  }, [activePeer]);

  // Luôn load danh sách user/admin khi vào trang (kể cả chưa có tin nhắn nào)
  useEffect(() => {
    fetchPeers();
    if (embedded) {
      const intervalId = setInterval(fetchPeers, 15000);
      return () => clearInterval(intervalId);
    }
  }, [fetchPeers, embedded]);

  const markMessagesAsRead = useCallback(async (userId) => {
    if (!userId || !user?.id) return;
    try {
      await chatAPI.markRead(userId);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notifications-refresh'));
      }
      fetchPeers();
    } catch (error) {
      console.error('❌ Lỗi khi đánh dấu đã đọc:', error);
    }
  }, [user?.id, fetchPeers]);

  const markMessagesAsReadIfVisible = useCallback(
    (userId) => {
      if (document.visibilityState !== 'visible') return;
      markMessagesAsRead(userId);
    },
    [markMessagesAsRead]
  );

  const markedReadRef = useRef(new Set());

  useEffect(() => {
    if (!peerId) return;
    shouldScrollToBottomRef.current = true;
    markedReadRef.current.delete(peerId);
    fetchChatMessages(peerId);
    markMessagesAsReadIfVisible(peerId);
  }, [peerId, fetchChatMessages, markMessagesAsReadIfVisible]);

  useEffect(() => {
    if (!peerId || !user?.id || isChatLoading || chatMessages.length === 0) return;
    const hasUnreadFromOther = chatMessages.some(
      (msg) => msg.sender_id === peerId && msg.receiver_id === user.id && !msg.is_read
    );
    if (hasUnreadFromOther && !markedReadRef.current.has(peerId)) {
      markedReadRef.current.add(peerId);
      markMessagesAsReadIfVisible(peerId);
    }
  }, [chatMessages, peerId, user?.id, isChatLoading, markMessagesAsReadIfVisible]);

  useEffect(() => {
    if (!peerId || !user?.id) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markMessagesAsRead(peerId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [peerId, user?.id, markMessagesAsRead]);

  // Realtime: tin nhắn mới + đã xem — đăng ký listener khi có user (kể cả peerId null để vẫn nhận và cập nhật sidebar)
  useEffect(() => {
    if (!user?.id) return;

    const handleChatMessage = (payload) => {
      const chatMessage = payload;
      const involvesMe = chatMessage.receiver_id === user.id || chatMessage.sender_id === user.id;
      if (!involvesMe) return;

      const isForCurrentPeer =
        (chatMessage.sender_id === user.id && chatMessage.receiver_id === peerId) ||
        (chatMessage.sender_id === peerId && chatMessage.receiver_id === user.id);

      if (isForCurrentPeer) {
        addMessage(chatMessage);
        if (chatMessage.sender_id === peerId && chatMessage.receiver_id === user.id) {
          markMessagesAsReadIfVisible(peerId);
        }
      }
      fetchPeers();
    };

    const handleChatMessagesRead = (payload) => {
      const readerId = payload?.reader_id;
      if (readerId && readerId === peerId) markAsReadByReader(readerId);
    };

    websocketService.on('chat_message', handleChatMessage);
    websocketService.on('chat_messages_read', handleChatMessagesRead);

    return () => {
      websocketService.off('chat_message', handleChatMessage);
      websocketService.off('chat_messages_read', handleChatMessagesRead);
    };
  }, [user?.id, peerId, addMessage, markMessagesAsReadIfVisible, markAsReadByReader, fetchPeers]);

  const handleSendChat = async () => {
    const content = chatInput.trim();
    if (!content || !peerId) return;
    const res = await chatAPI.sendMessage(content, peerId);
    if (res.success && res.data) {
      setChatInput('');
      addMessage(res.data);
      fetchPeers();
    } else {
      alert(res.error || 'Không thể gửi tin nhắn');
    }
  };

  const handleSendWithImage = async (content, imageFile) => {
    if (!peerId) return;
    const uploadRes = await chatAPI.uploadChatImage(imageFile);
    if (!uploadRes.success || !uploadRes.data?.url) {
      alert(uploadRes.error || 'Không thể tải ảnh lên');
      return;
    }
    const res = await chatAPI.sendMessage(content || '', peerId, uploadRes.data.url);
    if (res.success && res.data) {
      setChatInput('');
      addMessage(res.data);
      fetchPeers();
    } else {
      alert(res.error || 'Không thể gửi tin nhắn');
    }
  };

  const filteredPeers = peerList.filter((item) =>
    (item.name || item.user_name || '').toLowerCase().includes(peerSearch.trim().toLowerCase())
  );

  const sidebarTitle = embedded ? 'Danh sách user & admin' : 'Danh sách admin';
  const sidebarSearchPlaceholder = embedded ? 'Tìm user hoặc admin...' : 'Tìm admin...';
  const sidebarEmptyText = embedded ? 'Chưa có user hoặc admin nào' : 'Chưa có admin nào';
  const headerText = activePeer ? `Chat với ${peerDisplayName}` : (embedded ? 'Chọn user để chat' : 'Chọn admin để chat');

  const chatContent = (
    <div className={embedded ? 'chat-unified-wrapper chat-unified-embedded' : 'chat-unified-wrapper'}>
      <ChatSidebar
        title={sidebarTitle}
        searchPlaceholder={sidebarSearchPlaceholder}
        searchValue={peerSearch}
        onSearchChange={setPeerSearch}
        items={filteredPeers}
        activeItemId={peerId}
        onItemClick={setActivePeer}
        isLoading={isLoadingPeers}
        emptyText={sidebarEmptyText}
        renderItem={(item) => {
          const peerName = item.user_name || item.name || 'User';
          const avatarUrl = buildAvatarUrl(item.avatar_url);
          const lastIsImage = item.last_message_image_url;
          const lastSubtext = lastIsImage
            ? (item.last_message_sender_id === user?.id ? 'Bạn đã gửi một hình ảnh.' : `${peerName} đã gửi một hình ảnh.`)
            : (item.last_message || 'Chưa có tin nhắn.');
          return (
            <>
              <div
                className="chat-sidebar-avatar"
                style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              >
                {!avatarUrl && peerName.charAt(0).toUpperCase()}
              </div>
              <div className="chat-sidebar-info">
                <div className="chat-sidebar-name">{peerName}</div>
                <div className="chat-sidebar-role">{lastSubtext}</div>
              </div>
              {item.unread_count > 0 && (
                <span className="chat-sidebar-unread">{item.unread_count}</span>
              )}
            </>
          );
        }}
        className="chat-unified-sidebar"
      />

      <div className="chat-unified-main">
        <div className="chat-unified-header">{headerText}</div>
        <ChatMessages
          messages={chatMessages}
          currentUserId={user?.id}
          isLoading={isChatLoading}
          isLoadingMore={isLoadingMore}
          messagesRef={chatMessagesRef}
          shouldScrollToBottomRef={shouldScrollToBottomRef}
          previousScrollHeightRef={previousScrollHeightRef}
          isMaintainingScrollRef={isMaintainingScrollRef}
          className="chat-unified-messages"
        />
        <div className="chat-unified-input">
          <ChatInput
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onSend={handleSendChat}
            onSendWithImage={handleSendWithImage}
            disabled={!activePeer}
          />
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return <div className="chat-unified-page chat-unified-embedded-page">{chatContent}</div>;
  }

  return (
    <div className="page-with-bottom-nav">
      <TopBar />
      <div className="chat-page-content">
        {chatContent}
      </div>
      <BottomNavigation />
    </div>
  );
};

export default ChatPage;

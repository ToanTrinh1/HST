import { useState, useRef, useEffect, useCallback } from 'react';
import chatAPI from '../../api/endpoints/chat.api';

const MESSAGE_PAGE_SIZE = 15;

// Helper function to mark messages as read
const markMessagesAsRead = async (targetUserId) => {
  if (!targetUserId) return;
  try {
    await chatAPI.markRead(targetUserId);
  } catch (error) {
    console.error('❌ Lỗi khi đánh dấu đã đọc:', error);
  }
};

export const useChatMessages = (targetUserId, isActive = true, resetKey = null) => {
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const chatMessagesRef = useRef(null);
  const isMountedRef = useRef(true);
  const shouldScrollToBottomRef = useRef(true);
  const previousScrollHeightRef = useRef(0);
  const isMaintainingScrollRef = useRef(false);
  const lastMessageIdRef = useRef(null); // Track last message ID to avoid duplicates

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchChatMessages = useCallback(async (userId, beforeTime = null, isLoadMore = false) => {
    if (!isMountedRef.current || !userId) return;
    
    if (isLoadMore) {
      setIsLoadingMore(true);
      shouldScrollToBottomRef.current = false;
      isMaintainingScrollRef.current = true;
      if (chatMessagesRef.current) {
        previousScrollHeightRef.current = chatMessagesRef.current.scrollHeight;
      }
    } else {
      setIsChatLoading(true);
      shouldScrollToBottomRef.current = true;
      setHasMoreMessages(true);
    }
    
    try {
      const beforeParam = beforeTime ? new Date(beforeTime).toISOString() : null;
      const res = await chatAPI.listMessages(userId, MESSAGE_PAGE_SIZE, 0, beforeParam);
      if (!isMountedRef.current) return;
      
      if (res.success && Array.isArray(res.data)) {
        const newMessages = res.data;
        
        // Backend returns DESC (newest first), we need ASC (oldest first, newest at bottom)
        const sortedMessages = [...newMessages].sort((a, b) => {
          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          return timeA - timeB; // ASC: oldest first
        });
        
        if (isLoadMore) {
          setChatMessages((prev) => [...sortedMessages, ...prev]);
          if (newMessages.length < MESSAGE_PAGE_SIZE) {
            setHasMoreMessages(false);
          }
        } else {
          setChatMessages(sortedMessages);
          if (newMessages.length < MESSAGE_PAGE_SIZE) {
            setHasMoreMessages(false);
          }
          // Track last message ID
          if (sortedMessages.length > 0) {
            lastMessageIdRef.current = sortedMessages[sortedMessages.length - 1].id;
          }
        }
      } else {
        if (!isLoadMore) {
          setChatMessages([]);
        }
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('❌ Lỗi khi lấy tin nhắn:', error);
      if (isMountedRef.current && !isLoadMore) {
        setChatMessages([]);
      }
      setHasMoreMessages(false);
    } finally {
      if (isMountedRef.current) {
        if (isLoadMore) {
          setIsLoadingMore(false);
        } else {
          setIsChatLoading(false);
        }
      }
    }
  }, []);

  const loadOlderMessages = useCallback(() => {
    if (!targetUserId || isLoadingMore || !hasMoreMessages || isMaintainingScrollRef.current) {
      return;
    }

    if (chatMessages.length === 0) {
      return;
    }

    const oldestMessage = chatMessages[0];
    if (oldestMessage?.created_at) {
      fetchChatMessages(targetUserId, oldestMessage.created_at, true);
    }
  }, [targetUserId, chatMessages, isLoadingMore, hasMoreMessages, fetchChatMessages]);

  // Load 15 tin mới nhất khi đổi peer hoặc khi vào lại màn chat (resetKey thay đổi)
  useEffect(() => {
    if (!targetUserId || !isActive) return;
    setChatMessages([]);
    setHasMoreMessages(true);
    shouldScrollToBottomRef.current = true;
    isMaintainingScrollRef.current = false;
    fetchChatMessages(targetUserId);
  }, [targetUserId, isActive, resetKey, fetchChatMessages]);

  // Removed auto-refresh interval - user can manually refresh if needed

  // Handle scroll to load older messages
  useEffect(() => {
    const messagesContainer = chatMessagesRef.current;
    if (!messagesContainer || !isActive) return;

    const handleScroll = () => {
      if (messagesContainer.scrollTop < 200 && hasMoreMessages && !isLoadingMore) {
        loadOlderMessages();
      }
    };

    messagesContainer.addEventListener('scroll', handleScroll);
    return () => messagesContainer.removeEventListener('scroll', handleScroll);
  }, [hasMoreMessages, isLoadingMore, loadOlderMessages, isActive]);

  // Add new message to the list (for real-time updates)
  const addMessage = useCallback((newMessage) => {
    setChatMessages((prev) => {
      // Check if message already exists
      if (prev.some((msg) => msg.id === newMessage.id)) {
        return prev;
      }
      // Add to end and sort
      const updated = [...prev, newMessage].sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeA - timeB;
      });
      lastMessageIdRef.current = newMessage.id;
      return updated;
    });
    shouldScrollToBottomRef.current = true;
  }, []);

  // Real-time "đã xem": khi đối phương đã đọc tin nhắn, cập nhật is_read cho tin nhắn mình gửi tới họ
  const markAsReadByReader = useCallback((readerId) => {
    if (!readerId) return;
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.receiver_id === readerId ? { ...msg, is_read: true } : msg
      )
    );
  }, []);

  return {
    chatMessages,
    isChatLoading,
    isLoadingMore,
    hasMoreMessages,
    chatMessagesRef,
    shouldScrollToBottomRef,
    previousScrollHeightRef,
    isMaintainingScrollRef,
    fetchChatMessages,
    loadOlderMessages,
    addMessage,
    markAsReadByReader,
  };
};

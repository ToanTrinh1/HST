import { useRef, useEffect, useState } from 'react';
import { buildAvatarUrl } from '../../utils/avatar';
import './ChatMessages.css';

const ChatMessages = ({
  messages,
  currentUserId,
  isLoading,
  isLoadingMore,
  messagesRef,
  shouldScrollToBottomRef,
  previousScrollHeightRef,
  isMaintainingScrollRef,
  className = '',
}) => {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  // Chỉ ẩn nút khi tin nhắn mới nhất còn thấy (sát đáy); hiện khi đã cuộn lên, tin mới nhất không còn trong viewport
  const scrollCheckThreshold = 20;

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    const handleScroll = () => {
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - scrollCheckThreshold;
      setShowScrollToBottom(!atBottom);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [messages.length, messagesRef]);

  useEffect(() => {
    if (!messagesRef.current) return;
    // Khi load thêm tin cũ: giữ vị trí cuộn, không cuộn xuống
    if (isMaintainingScrollRef.current && previousScrollHeightRef.current > 0) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          const container = messagesRef.current;
          if (container) {
            const newScrollHeight = container.scrollHeight;
            const scrollDifference = newScrollHeight - previousScrollHeightRef.current;
            container.scrollTop = scrollDifference;
            previousScrollHeightRef.current = 0;
            isMaintainingScrollRef.current = false;
          }
        }, 50);
      });
      return;
    }
    if (shouldScrollToBottomRef.current && !isLoadingMore) {
      const scrollToBottom = () => {
        if (messagesRef.current) {
          const container = messagesRef.current;
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
          setShowScrollToBottom(false);
        }
      };
      requestAnimationFrame(() => {
        scrollToBottom();
        setTimeout(() => {
          if (messagesRef.current && shouldScrollToBottomRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
            shouldScrollToBottomRef.current = false;
            setShowScrollToBottom(false);
          }
        }, 50);
      });
    }
  }, [messages, isLoadingMore, messagesRef, shouldScrollToBottomRef, previousScrollHeightRef, isMaintainingScrollRef]);

  const handleScrollToBottomClick = () => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: 'smooth'
    });
    setShowScrollToBottom(false);
  };

  return (
    <div className={`chat-messages-container ${className}`} ref={messagesRef}>
      {isLoading ? (
        <div className="chat-empty">Đang tải...</div>
      ) : (
        <>
          {isLoadingMore && (
            <div className="chat-loading-more">
              Đang tải tin nhắn cũ hơn...
            </div>
          )}
          {messages.length === 0 ? (
            <div className="chat-empty">Chưa có tin nhắn</div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              const imageUrl = msg.image_url ? buildAvatarUrl(msg.image_url) : null;
              return (
                <div key={msg.id} className={`chat-message ${isMine ? 'mine' : 'theirs'}`}>
                  <div className="chat-bubble">
                    {imageUrl && (
                      <div className="chat-bubble-image-wrap">
                        <img
                          src={imageUrl}
                          alt="Ảnh chat"
                          className="chat-bubble-image"
                          onClick={() => setLightboxImage(imageUrl)}
                        />
                      </div>
                    )}
                    {msg.content ? <div className="chat-bubble-text">{msg.content}</div> : null}
                  </div>
                  <div className="chat-message-footer">
                  {isMine && (
                      <div className="chat-read-status">
                        {msg.is_read ? 'Đã xem' : 'Đã gửi'}
                      </div>
                    )}
                    <div className="chat-time">
                      {msg.created_at ? new Date(msg.created_at).toLocaleString('vi-VN') : ''}
                    </div>
                    {isMine && (
                      <div className="chat-read-status">
                        {msg.is_read ? '✓✓' : '✓'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
      {showScrollToBottom && messages.length > 0 && (
        <button
          type="button"
          className="chat-scroll-to-bottom"
          onClick={handleScrollToBottomClick}
          aria-label="Về tin nhắn mới nhất"
        >
          ↓
        </button>
      )}
      {lightboxImage && (
        <div
          className="chat-lightbox-overlay"
          onClick={() => setLightboxImage(null)}
          role="button"
          tabIndex={0}
          aria-label="Đóng ảnh"
          onKeyDown={(e) => e.key === 'Escape' && setLightboxImage(null)}
        >
          <button
            type="button"
            className="chat-lightbox-close"
            onClick={() => setLightboxImage(null)}
            aria-label="Đóng"
          >
            ×
          </button>
          <img
            src={lightboxImage}
            alt="Xem ảnh"
            className="chat-lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ChatMessages;

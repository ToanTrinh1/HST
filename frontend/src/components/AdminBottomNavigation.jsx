import './AdminBottomNavigation.css';
import { useState, useEffect } from 'react';

// Tạm thời tắt tab Chat admin (đổi thành true để bật lại)
const SHOW_CHAT_TAB = false;

const AdminBottomNavigation = ({ activeTab, onTabChange }) => {
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  useEffect(() => {
    const handler = (event) => {
      if (!event.detail) return;
      const count = typeof event.detail.count === 'number' ? event.detail.count : 0;
      setChatUnreadCount(count);
    };
    window.addEventListener('chat-unread-count', handler);
    return () => window.removeEventListener('chat-unread-count', handler);
  }, []);

  return (
    <div className="admin-bottom-nav">
      <button
        className={`admin-nav-item ${activeTab === 'danh-sach-keo' ? 'active' : ''}`}
        onClick={() => onTabChange('danh-sach-keo')}
      >
        <span className="admin-nav-icon">📋</span>
        <span className="admin-nav-label">Danh sách kèo</span>
      </button>
      <button
        className={`admin-nav-item ${activeTab === 'rut-tien' ? 'active' : ''}`}
        onClick={() => onTabChange('rut-tien')}
      >
        <span className="admin-nav-icon">💰</span>
        <span className="admin-nav-label">Rút tiền</span>
      </button>
      <button
        className={`admin-nav-item ${activeTab === 'loi-nhuan' ? 'active' : ''}`}
        onClick={() => onTabChange('loi-nhuan')}
      >
        <span className="admin-nav-icon">📊</span>
        <span className="admin-nav-label">Lợi nhuận</span>
      </button>
      {SHOW_CHAT_TAB && (
        <button
          className={`admin-nav-item ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => onTabChange('chat')}
        >
          <span className="nav-icon-wrapper">
            <span className="admin-nav-icon">💬</span>
            {chatUnreadCount > 0 && (
              <span className="nav-badge">{chatUnreadCount}</span>
            )}
          </span>
          <span className="admin-nav-label">Chat</span>
        </button>
      )}
    </div>
  );
};

export default AdminBottomNavigation;

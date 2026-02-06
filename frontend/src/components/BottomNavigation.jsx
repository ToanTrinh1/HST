import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './BottomNavigation.css';

// Tạm thời tắt tab Đơn hàng và Chat (đổi thành true để bật lại)
const SHOW_ORDERS_TAB = false;
const SHOW_CHAT_TAB = false;

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  const isActive = (path) => {
    return location.pathname === path;
  };

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
    <div className="bottom-navigation">
      <button
        className={`nav-item ${isActive('/') ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Trang chủ</span>
      </button>
      {SHOW_ORDERS_TAB && (
        <button
          className={`nav-item ${isActive('/orders') ? 'active' : ''}`}
          onClick={() => navigate('/orders')}
        >
          <span className="nav-icon">📦</span>
          <span className="nav-label">Đơn hàng</span>
        </button>
      )}
      <button
        className={`nav-item ${isActive('/profile') ? 'active' : ''}`}
        onClick={() => navigate('/profile')}
      >
        <span className="nav-icon">👤</span>
        <span className="nav-label">Cá nhân</span>
      </button>
      {SHOW_CHAT_TAB && (
        <button
          className={`nav-item ${isActive('/chat') ? 'active' : ''}`}
          onClick={() => navigate('/chat')}
        >
          <span className="nav-icon-wrapper">
            <span className="nav-icon">💬</span>
            {chatUnreadCount > 0 && (
              <span className="nav-badge">{chatUnreadCount}</span>
            )}
          </span>
          <span className="nav-label">Chat</span>
        </button>
      )}
    </div>
  );
};

export default BottomNavigation;


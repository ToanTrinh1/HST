import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { buildAvatarUrl } from '../utils/avatar';
import notificationAPI from '../api/endpoints/notification.api';
import websocketService from '../services/websocket.service';
import './TopBar.css';
import EditProfileModal from './EditProfileModal';

const TopBar = ({ onEditProfile }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  // Thông báo chỉ hoạt động cho admin (khi đơn hàng cập nhật trạng thái); user đã tắt chat & đơn hàng
  const isAdmin = user?.vai_tro === 'admin' || user?.vai_tro === 'admin_tong';
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');
  const unreadCountRef = useRef(0);
  const chatUnreadRef = useRef(0);
  const originalTitleRef = useRef(typeof document !== 'undefined' ? document.title : 'Tèo Cao Thủ');
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const titleBlinkIntervalRef = useRef(null);
  const lastChatSenderNameRef = useRef('');
  const lastHasNewOrderRef = useRef(false);
  const lastOrderUpdatedByRef = useRef(''); // Tên người cập nhật đơn (hiện trên title tab)
  const effectiveUnreadForTabRef = useRef(0); // Số đỏ tab/chuông: chỉ tính Chờ chấp nhận (order_status_changed) + chat, bỏ Đơn hàng mới

  // Lấy chữ cái đầu tiên của tên để hiển thị trong avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  // Lấy URL avatar hoặc hiển thị initials
  const getAvatarDisplay = () => {
    return buildAvatarUrl(user?.avatar_url);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowDropdown(false);
  };

  const handleProfileClick = () => {
    // Ưu tiên mở modal chỉnh sửa profile dùng chung cho mọi page
    setShowEditProfileModal(true);
    // Nếu page cụ thể muốn làm thêm gì đó, vẫn có thể truyền onEditProfile
    if (onEditProfile) {
      onEditProfile();
    }
    setShowDropdown(false);
  };

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Function to start blinking title - nhấp nháy liên tục cho đến khi tab được active
  const startTitleBlink = useCallback((unreadCount, isChatMessage, hasNewOrder = false, orderUpdatedBy = '') => {
    // Clear existing interval
    if (titleBlinkIntervalRef.current) {
      clearInterval(titleBlinkIntervalRef.current);
      titleBlinkIntervalRef.current = null;
    }

    // Don't start blinking if tab is already visible
    if (!document.hidden) {
      return;
    }

    const baseTitle = originalTitleRef.current || 'Tèo Cao Thủ';
    let isShowingCount = true;

    titleBlinkIntervalRef.current = setInterval(() => {
      // Stop blinking if tab becomes visible
      if (!document.hidden) {
        if (titleBlinkIntervalRef.current) {
          clearInterval(titleBlinkIntervalRef.current);
          titleBlinkIntervalRef.current = null;
        }
        document.title = baseTitle;
        return;
      }

      if (isChatMessage && isShowingCount) {
        document.title = `(${unreadCount}) ${baseTitle}`;
      } else if (isChatMessage && !isShowingCount) {
        const senderName = lastChatSenderNameRef.current || 'Ai đó';
        document.title = `${senderName} đã nhắn tin cho bạn`;
      } else if ((orderUpdatedBy || lastOrderUpdatedByRef.current) && !isShowingCount) {
        const name = orderUpdatedBy || lastOrderUpdatedByRef.current;
        document.title = `${name} đã cập nhật đơn - ${baseTitle}`;
      } else {
        document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
      }

      isShowingCount = !isShowingCount;
    }, 1000); // Blink every 1 second
  }, []);

  // Fetch notifications từ API (chỉ admin mới có thông báo)
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !isAdmin) return;
    setIsLoadingNotifications(true);
    try {
      const res = await notificationAPI.list(50, 0);
      if (res.success && Array.isArray(res.data)) {
        setNotifications(res.data);

        const totalUnread = res.data.filter((n) => !n.is_read).length;
        const chatUnread = res.data.filter((n) => !n.is_read && n.type === 'chat_message').length;
        const effectiveUnread = res.data.filter((n) => !n.is_read && n.type !== 'new_order').length;
        effectiveUnreadForTabRef.current = effectiveUnread;

        // Gửi event global cho BottomNavigation để hiện badge chat
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('chat-unread-count', {
              detail: { count: chatUnread },
            })
          );
        }

        // Tắt banner khi đã đọc hết thông báo / đã xem tin nhắn
        if (totalUnread === 0) {
          setBannerMessage('');
        }

        const hasNewOrder = res.data.some((n) => !n.is_read && n.type === 'new_order');
        lastHasNewOrderRef.current = hasNewOrder;
        // Lấy tên người cập nhật từ thông báo order_status_changed mới nhất (chưa đọc)
        const latestOrderStatusNotif = res.data.find((n) => !n.is_read && n.type === 'order_status_changed');
        let orderUpdatedBy = '';
        if (latestOrderStatusNotif) {
          try {
            if (latestOrderStatusNotif.data && typeof latestOrderStatusNotif.data === 'string') {
              const data = JSON.parse(latestOrderStatusNotif.data);
              if (data.updated_by_name) orderUpdatedBy = data.updated_by_name;
            }
          } catch (_) {}
          if (!orderUpdatedBy && latestOrderStatusNotif.message) {
            const match = latestOrderStatusNotif.message.match(/^(.+?)\s+đã cập nhật trạng thái đơn/);
            if (match && match[1]) orderUpdatedBy = match[1];
          }
          if (orderUpdatedBy) lastOrderUpdatedByRef.current = orderUpdatedBy;
        }
        if (totalUnread > unreadCountRef.current) {
          const hasNewChat = chatUnread > chatUnreadRef.current;
          const hasOrderStatusChanged = !!latestOrderStatusNotif;
          setBannerMessage(
            hasNewChat ? 'Bạn có tin nhắn mới.' :
            hasNewOrder ? 'Có đơn hàng mới cần duyệt.' :
            hasOrderStatusChanged && orderUpdatedBy ? `${orderUpdatedBy} đã cập nhật đơn hàng.` :
            'Bạn có thông báo mới.'
          );

          if (hasNewChat) {
            const latestChatNotif = res.data.find((n) => !n.is_read && n.type === 'chat_message');
            if (latestChatNotif && latestChatNotif.message) {
              let senderName = 'Ai đó';
              if (latestChatNotif.message.includes('đã gửi tin nhắn mới')) {
                const match = latestChatNotif.message.match(/^(.+?)\s+đã gửi tin nhắn mới/);
                if (match && match[1]) senderName = match[1];
              } else if (latestChatNotif.message.includes('Admin đã gửi')) {
                senderName = 'Admin';
              }
              lastChatSenderNameRef.current = senderName;
            }
          }

          if (effectiveUnread > 0 && typeof document !== 'undefined' && document.hidden) {
            startTitleBlink(effectiveUnread, hasNewChat, false, orderUpdatedBy || lastOrderUpdatedByRef.current);
          }
        }

        unreadCountRef.current = totalUnread;
        chatUnreadRef.current = chatUnread;
      } else {
        setNotifications([]);
        unreadCountRef.current = 0;
        chatUnreadRef.current = 0;
        effectiveUnreadForTabRef.current = 0;
        lastHasNewOrderRef.current = false;
        lastOrderUpdatedByRef.current = '';
        setBannerMessage('');
      }
    } catch (error) {
      console.error('❌ Lỗi khi lấy thông báo:', error);
      setNotifications([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [isAuthenticated, isAdmin, startTitleBlink]);

  const handleMarkNotificationRead = async (id) => {
    if (!id) return;
    const res = await notificationAPI.markRead(id);
    if (res.success) {
      fetchNotifications();
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    const res = await notificationAPI.markAllRead();
    if (res.success) {
      fetchNotifications();
    }
  };

  // Fetch notifications khi component mount (chỉ admin)
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    fetchNotifications();
  }, [isAuthenticated, isAdmin, fetchNotifications]);

  // Khi chat được đánh dấu đã đọc, server đã mark notification → refresh (chỉ admin)
  useEffect(() => {
    if (!isAdmin) return;
    const handler = () => fetchNotifications();
    window.addEventListener('notifications-refresh', handler);
    return () => window.removeEventListener('notifications-refresh', handler);
  }, [isAdmin, fetchNotifications]);

  // Listen to WebSocket events for real-time notifications (chỉ admin)
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

    const handleNotification = (notification) => {
      console.log('TopBar - 📨 New notification received:', notification);
      // Add new notification to the list and update counts
      setNotifications((prev) => {
        // Check if notification already exists (avoid duplicates)
        const exists = prev.some((n) => n.id === notification.id);
        if (exists) return prev;
        
        const updated = [notification, ...prev];
        
        const totalUnread = updated.filter((n) => !n.is_read).length;
        const chatUnread = updated.filter((n) => !n.is_read && n.type === 'chat_message').length;
        const effectiveUnread = updated.filter((n) => !n.is_read && n.type !== 'new_order').length;

        unreadCountRef.current = totalUnread;
        chatUnreadRef.current = chatUnread;
        effectiveUnreadForTabRef.current = effectiveUnread;

        // Show banner and update title
        const hasNewChat = notification.type === 'chat_message';
        const hasNewOrder = notification.type === 'new_order';
        const isOrderStatusChanged = notification.type === 'order_status_changed';
        let orderUpdatedBy = '';
        if (isOrderStatusChanged && notification.message) {
          // Message format: "Tên đã cập nhật trạng thái đơn X từ Y sang Z" hoặc lấy từ data
          try {
            if (notification.data && typeof notification.data === 'string') {
              const data = JSON.parse(notification.data);
              if (data.updated_by_name) orderUpdatedBy = data.updated_by_name;
            }
          } catch (_) {}
          if (!orderUpdatedBy && notification.message) {
            const match = notification.message.match(/^(.+?)\s+đã cập nhật trạng thái đơn/);
            if (match && match[1]) orderUpdatedBy = match[1];
          }
          if (orderUpdatedBy) lastOrderUpdatedByRef.current = orderUpdatedBy;
        }
        setBannerMessage(
          hasNewChat ? 'Bạn có tin nhắn mới.' :
          hasNewOrder ? 'Có đơn hàng mới cần duyệt.' :
          isOrderStatusChanged && orderUpdatedBy ? `${orderUpdatedBy} đã cập nhật đơn hàng.` :
          'Bạn có thông báo mới.'
        );

        // Extract sender name from notification message for chat messages
        if (hasNewChat && notification.message) {
          let senderName = 'Ai đó';
          if (notification.message.includes('đã gửi tin nhắn mới')) {
            const match = notification.message.match(/^(.+?)\s+đã gửi tin nhắn mới/);
            if (match && match[1]) senderName = match[1];
          } else if (notification.message.includes('Admin đã gửi')) {
            senderName = 'Admin';
          }
          lastChatSenderNameRef.current = senderName;
        }

        lastHasNewOrderRef.current = hasNewOrder;
        if (typeof document !== 'undefined' && document.hidden) {
          startTitleBlink(effectiveUnread, hasNewChat, false, orderUpdatedBy || lastOrderUpdatedByRef.current);
        }
        if (isOrderStatusChanged && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('admin-orders-refresh'));
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('chat-unread-count', {
              detail: { count: chatUnread },
            })
          );
        }
        return updated;
      });
    };

    const handleChatMessage = (chatMessage) => {
      console.log('TopBar - 💬 New chat message received:', chatMessage);
      // Refresh notifications to get updated chat notification
      fetchNotifications();
    };

    // Register WebSocket listeners
    websocketService.on('notification', handleNotification);
    websocketService.on('chat_message', handleChatMessage);

    return () => {
      websocketService.off('notification', handleNotification);
      websocketService.off('chat_message', handleChatMessage);
    };
  }, [isAuthenticated, isAdmin, startTitleBlink]);

  // Khôi phục title khi tab được focus lại và dừng blinking
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) {
        // Stop blinking when tab becomes visible
        if (titleBlinkIntervalRef.current) {
          clearInterval(titleBlinkIntervalRef.current);
          titleBlinkIntervalRef.current = null;
        }
        // Restore original title
        if (originalTitleRef.current) {
          document.title = originalTitleRef.current;
        }
      } else {
        const effectiveUnread = effectiveUnreadForTabRef.current;
        const chatUnread = chatUnreadRef.current;
        const orderUpdatedBy = lastOrderUpdatedByRef.current;
        if (effectiveUnread > 0) {
          startTitleBlink(effectiveUnread, chatUnread > 0, false, orderUpdatedBy);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      // Cleanup interval on unmount
      if (titleBlinkIntervalRef.current) {
        clearInterval(titleBlinkIntervalRef.current);
      }
    };
  }, [startTitleBlink]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <div className="top-bar">
        <div className="top-bar-brand">
          <h2>Tèo Cao Thủ</h2>
        </div>
        <div className="top-bar-menu">
          {/* Notification Icon - chỉ hiển thị cho admin (thông báo khi đơn hàng cập nhật trạng thái) */}
          {isAdmin && (
          <div style={{ position: 'relative' }} ref={notificationRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) {
                  fetchNotifications();
                }
              }}
              className="top-bar-notification-btn"
              title="Thông báo"
            >
              🔔
              {notifications.filter((n) => !n.is_read && n.type !== 'new_order').length > 0 && (
                <span className="notification-badge">
                  {notifications.filter((n) => !n.is_read && n.type !== 'new_order').length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <strong>Thông báo</strong>
                  <button
                    onClick={handleMarkAllNotificationsRead}
                    className="notification-mark-all-btn"
                  >
                    Đã đọc hết
                  </button>
                </div>
                {isLoadingNotifications ? (
                  <div className="notification-loading">Đang tải...</div>
                ) : notifications.length === 0 ? (
                  <div className="notification-empty">Chưa có thông báo</div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleMarkNotificationRead(item.id)}
                      className={`notification-item ${!item.is_read ? 'notification-unread' : ''}`}
                    >
                      <div className="notification-title">{item.title}</div>
                      <div className="notification-message">{item.message}</div>
                      <div className="notification-time">
                        {item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          )}

          {/* Avatar */}
          <div className="avatar-container" ref={dropdownRef}>
            <div
              className="avatar"
              onClick={() => setShowDropdown(!showDropdown)}
              style={getAvatarDisplay() ? {
                backgroundImage: `url(${getAvatarDisplay()})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } : {}}
            >
              {!getAvatarDisplay() && getInitials(user?.name)}
            </div>
            {showDropdown && (
              <div className="dropdown-menu">
                <div
                  className="dropdown-item"
                  onClick={handleProfileClick}
                >
                  Chỉnh sửa hồ sơ cá nhân
                </div>
                <div className="dropdown-item" onClick={handleLogout}>
                  Đăng xuất
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {bannerMessage && (
        <div
          className="top-bar-banner"
          onClick={() => setBannerMessage('')}
        >
          {bannerMessage}
        </div>
      )}

      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
      />
    </>
  );
};

export default TopBar;

import { buildAvatarUrl } from '../../utils/avatar';
import './ChatSidebar.css';

const ChatSidebar = ({
  title,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  items,
  activeItemId,
  onItemClick,
  isLoading,
  emptyText = 'Chưa có dữ liệu',
  renderItem,
  className = '',
}) => {
  return (
    <div className={`chat-sidebar ${className}`}>
      <div className="chat-sidebar-header">{title}</div>
      <div className="chat-sidebar-search">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="chat-sidebar-list">
        {isLoading ? (
          <div className="chat-sidebar-empty">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="chat-sidebar-empty">{emptyText}</div>
        ) : (
          items.map((item) => (
            <div
              key={item.id || item.user_id}
              className={`chat-sidebar-item ${(activeItemId === (item.id || item.user_id)) ? 'active' : ''}`}
              onClick={() => onItemClick(item)}
            >
              {renderItem ? renderItem(item) : (() => {
                const name = item.name || item.user_name || 'U';
                const avatarUrl = buildAvatarUrl(item.avatar_url);
                return (
                  <>
                    <div
                      className="chat-sidebar-avatar"
                      style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                    >
                      {!avatarUrl && name.charAt(0).toUpperCase()}
                    </div>
                    <div className="chat-sidebar-info">
                      <div className="chat-sidebar-name">{name === 'U' ? 'Unknown' : name}</div>
                      <div className="chat-sidebar-role">{item.role || item.last_message || ''}</div>
                    </div>
                  </>
                );
              })()}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;

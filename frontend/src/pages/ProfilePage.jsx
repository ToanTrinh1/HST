import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import BottomNavigation from '../components/BottomNavigation';
import { donHangAPI } from '../api/endpoints/don_hang.api';
import './ProfilePage.css';
import './HomePage.css';

const ProfilePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [doneTasks, setDoneTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [showCancelReasonModal, setShowCancelReasonModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    // Handle search logic here
    console.log('Searching for:', searchQuery);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowDropdown(false);
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined || num === '') return '-';
    const n = Number(num);
    if (Number.isNaN(n)) return '-';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleProfileClick = () => {
    navigate('/profile');
    setShowDropdown(false);
  };

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchDoneTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const res = await donHangAPI.layDanhSachDonHang(50, 0);
      if (res.success && Array.isArray(res.data)) {
        const done = res.data.filter((item) => item.status === 'DONE' || item.status === 'HỦY BỎ' || item.status === 'ĐỀN');
        // Debug: Log dữ liệu để kiểm tra các trường mới
        if (done.length > 0) {
          console.log('🔍 Sample task data:', done[0]);
          console.log('🔍 Account:', done[0].account);
          console.log('🔍 Password:', done[0].password);
          console.log('🔍 Region:', done[0].region);
          console.log('🔍 Completed_at:', done[0].completed_at);
        }
        setDoneTasks(done);
      } else {
        setDoneTasks([]);
      }
    } catch (error) {
      console.error('❌ Lỗi khi lấy danh sách kèo DONE/HỦY BỎ/ĐỀN:', error);
      setDoneTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Fetch danh sách kèo đã hoàn thành (DONE) và lắng nghe sự kiện/global focus
  useEffect(() => {
    fetchDoneTasks();

    const handleRefresh = (event) => {
      console.log('🔄 ProfilePage - Nhận được event bet-receipt-status-changed:', event?.detail);
      fetchDoneTasks();
    };

    // Sử dụng capture phase để đảm bảo nhận được event
    window.addEventListener('bet-receipt-status-changed', handleRefresh, true);
    window.addEventListener('focus', handleRefresh);

    return () => {
      window.removeEventListener('bet-receipt-status-changed', handleRefresh, true);
      window.removeEventListener('focus', handleRefresh);
    };
  }, []);

  // Lấy chữ cái đầu tiên của tên để hiển thị trong avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="page-with-bottom-nav">
      <div className="home-navbar">
        <div className="navbar-brand">
          <h2>My App</h2>
        </div>
        <div className="navbar-menu">
          {isAuthenticated ? (
            <>
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </form>
              <div className="avatar-container" ref={dropdownRef}>
                <div
                  className="avatar"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  {getInitials(user?.name)}
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
            </>
          ) : (
            <>
              <Link to="/login" className="btn-nav">
                Đăng nhập
              </Link>
              <Link to="/register" className="btn-nav">
                Đăng ký
              </Link>
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </form>
            </>
          )}
        </div>
      </div>
      <div className="profile-content personal-dashboard">
        <div className="personal-box personal-box-left">
          <h3>Nhiệm vụ đã hoàn thành</h3>
          <div className="personal-box-body">
            {isLoadingTasks ? (
              'Đang tải...'
            ) : doneTasks.length === 0 ? (
              'Chưa có dữ liệu'
            ) : (
              <div className="task-list-compact">
                <div className="task-list-header">
                  <span>Nhiệm vụ</span>
                  <span>Loại kèo</span>
                  <span>Tiền kèo</span>
                  <span>Công thực nhận</span>
                  <span>Thao tác</span>
                  <span>Tài khoản</span>
                  <span>Mật khẩu</span>
                  <span>Khu vực</span>
                  <span>Thời gian hoàn thành</span>
                </div>
                <div className="task-list-body">
                  {doneTasks.map((task) => {
                    const formatDateTime = (dateTime) => {
                      if (!dateTime) return '-';
                      try {
                        const date = new Date(dateTime);
                        return date.toLocaleString('vi-VN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                      } catch (e) {
                        return '-';
                      }
                    };
                    return (
                      <div key={task.id} className="task-list-row">
                        <span>{task.task_code || task.task || '-'}</span>
                        <span>{task.bet_type || task.betType || '-'}</span>
                        <span>
                          {formatNumber(task.web_bet_amount_cny ?? task.webBet)}
                        </span>
                        <span>{formatNumber(task.actual_amount_cny ?? task.actualAmount)}</span>
                        <span>
                          {(task.status === 'HỦY BỎ' || task.status === 'ĐỀN') ? (
                            <button
                              className="task-detail-btn"
                              type="button"
                              onClick={() => {
                                setSelectedTask(task);
                                setShowCancelReasonModal(true);
                              }}
                            >
                              Chi tiết
                            </button>
                          ) : (
                            '-'
                          )}
                        </span>
                        <span>{task.account || '-'}</span>
                        <span>{task.password || '-'}</span>
                        <span>{task.region || '-'}</span>
                        <span>{formatDateTime(task.completed_at)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="personal-box personal-box-center">
          <h3>Nhiệm vụ cần làm</h3>
          <p className="personal-box-subtitle">Ưu tiên hôm nay</p>
          <div className="personal-box-body">Chưa có dữ liệu</div>
        </div>

        <div className="personal-box personal-box-right">
          <h3>Tài chính</h3>
          <p className="personal-box-subtitle">Số dư & tổng hợp</p>
          <div className="personal-box-body">Chưa có dữ liệu</div>
        </div>
      </div>

      {showCancelReasonModal && selectedTask && (
        <div
          className="reason-modal-overlay"
          onClick={() => setShowCancelReasonModal(false)}
        >
          <div
            className="reason-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="reason-modal-header">
              <h3>Chi tiết nhiệm vụ</h3>
              <button
                className="reason-modal-close"
                onClick={() => setShowCancelReasonModal(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="reason-modal-body">
              <div className="reason-section">
                <h4>{selectedTask.status === 'ĐỀN' ? 'Lý do đền' : 'Lý do hủy bỏ'}</h4>
                <p>{selectedTask.cancel_reason || 'Không có lý do'}</p>
              </div>
              <div className="task-detail-table-section">
                <h4>Thông tin tài chính</h4>
                <table className="task-detail-table">
                  <thead>
                    <tr>
                      <th>Tiền kèo</th>
                      <th>Tiền kèo thực nhận</th>
                      <th>Công thực nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{formatNumber(selectedTask.web_bet_amount_cny ?? selectedTask.webBet)}</td>
                      <td>{formatNumber(selectedTask.actual_received_cny ?? selectedTask.actualReceived)}</td>
                      <td>{formatNumber(selectedTask.actual_amount_cny ?? selectedTask.actualAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="reason-modal-footer">
              <button
                className="reason-modal-button"
                type="button"
                onClick={() => setShowCancelReasonModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNavigation />
    </div>
  );
};

export default ProfilePage;


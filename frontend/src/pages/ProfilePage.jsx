import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import BottomNavigation from '../components/BottomNavigation';
import { donHangAPI } from '../api/endpoints/don_hang.api';
import { walletAPI } from '../api/endpoints/wallet.api';
import { withdrawalAPI } from '../api/endpoints/withdrawal.api';
import './ProfilePage.css';
import './HomePage.css';

const ProfilePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [doneTasks, setDoneTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [isLoadingPendingTasks, setIsLoadingPendingTasks] = useState(false);
  const [inProgressTasks, setInProgressTasks] = useState([]); // Các nhiệm vụ đang thực hiện (status = "ĐANG THỰC HIỆN")
  const [isLoadingInProgressTasks, setIsLoadingInProgressTasks] = useState(false);
  const [showCancelReasonModal, setShowCancelReasonModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [totalReceivedCNY, setTotalReceivedCNY] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [isLoadingWithdrawal, setIsLoadingWithdrawal] = useState(false);
  const [monthFilter, setMonthFilter] = useState(''); // Filter theo tháng cho đơn hàng đã xử lí
  const [showMonthFilter, setShowMonthFilter] = useState(false); // Hiển thị dropdown filter tháng
  const [showTaskModal, setShowTaskModal] = useState(false); // Hiển thị modal bảng nhiệm vụ
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
      // Đóng dropdown filter tháng khi click bên ngoài
      if (showMonthFilter && !event.target.closest('[data-month-filter]')) {
        setShowMonthFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMonthFilter]);

  const fetchDoneTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const res = await donHangAPI.layDanhSachDonHang(50, 0);
      if (res.success && Array.isArray(res.data)) {
        // Backend đã filter theo user hiện tại, chỉ cần filter theo status
        const done = res.data.filter((item) => item.status === 'DONE' || item.status === 'HỦY BỎ' || item.status === 'ĐỀN');
        
        // Debug: Log dữ liệu để kiểm tra các trường mới
        if (done.length > 0) {
          console.log('🔍 Sample task data:', done[0]);
          console.log('🔍 Account:', done[0].account);
          console.log('🔍 Password:', done[0].password);
          console.log('🔍 Region:', done[0].region);
          console.log('🔍 Completed_at:', done[0].completed_at);
          console.log('🔍 User name in task:', done[0].user_name || done[0].name);
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

  const fetchPendingTasks = async () => {
    setIsLoadingPendingTasks(true);
    try {
      const res = await donHangAPI.layDanhSachDonHang(50, 0);
      if (res.success && Array.isArray(res.data)) {
        // Backend đã filter theo user hiện tại
        // Lấy các status đang chờ xử lí (loại bỏ DONE, HỦY BỎ, ĐỀN, ĐANG THỰC HIỆN)
        const excludedStatuses = ['DONE', 'HỦY BỎ', 'ĐỀN', 'ĐANG THỰC HIỆN'];
        const pending = res.data.filter((item) => 
          !excludedStatuses.includes(item.status)
        );
        setPendingTasks(pending);
      } else {
        setPendingTasks([]);
      }
    } catch (error) {
      console.error('❌ Lỗi khi lấy danh sách kèo đang xử lý:', error);
      setPendingTasks([]);
    } finally {
      setIsLoadingPendingTasks(false);
    }
  };

  const fetchInProgressTasks = async () => {
    setIsLoadingInProgressTasks(true);
    try {
      const res = await donHangAPI.layDanhSachDonHang(50, 0);
      if (res.success && Array.isArray(res.data)) {
        // Backend đã filter theo user hiện tại
        // Chỉ lấy các đơn hàng có status "ĐANG THỰC HIỆN"
        const inProgress = res.data.filter((item) => 
          item.status === 'ĐANG THỰC HIỆN'
        );
        setInProgressTasks(inProgress);
      } else {
        setInProgressTasks([]);
      }
    } catch (error) {
      console.error('❌ Lỗi khi lấy danh sách kèo đang thực hiện:', error);
      setInProgressTasks([]);
    } finally {
      setIsLoadingInProgressTasks(false);
    }
  };

  const fetchCurrentUserBalance = async () => {
    if (!user?.id) {
      console.log('⚠️ Chưa có user ID, không thể lấy số dư');
      return;
    }

    setIsLoadingBalance(true);
    try {
      const response = await walletAPI.layDanhSachWallets(100, 0);
      if (response.success && Array.isArray(response.data)) {
        // Tìm wallet của user hiện tại
        const userWallet = response.data.find(
          (item) => item.user?.id === user.id || item.user_id === user.id
        );
        
        if (userWallet && userWallet.wallet) {
          const balance = userWallet.wallet.current_balance_vnd || 0;
          const receivedCNY = userWallet.wallet.total_received_cny || 0;
          setCurrentBalance(balance);
          setTotalReceivedCNY(receivedCNY);
          console.log('✅ Lấy số dư thành công:', balance);
          console.log('✅ Lấy công thực nhận (tệ) thành công:', receivedCNY);
        } else {
          console.log('⚠️ Không tìm thấy wallet cho user:', user.id);
          setCurrentBalance(0);
          setTotalReceivedCNY(0);
        }
      } else {
        console.error('❌ Lỗi khi lấy danh sách wallets:', response.error);
        setCurrentBalance(0);
        setTotalReceivedCNY(0);
      }
    } catch (error) {
      console.error('❌ Lỗi khi lấy số dư:', error);
      setCurrentBalance(0);
      setTotalReceivedCNY(0);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const fetchWithdrawalHistory = async () => {
    if (!user?.id) {
      console.log('⚠️ Chưa có user ID, không thể lấy lịch sử rút tiền');
      return;
    }

    setIsLoadingWithdrawal(true);
    try {
      const response = await withdrawalAPI.layTatCaLichSu();
      if (response.success && Array.isArray(response.data)) {
        // Filter lịch sử rút tiền của user hiện tại
        const userWithdrawals = response.data.filter(
          (item) => item.user_id === user.id || item.user?.id === user.id
        );
        // Sắp xếp theo thời gian tạo mới nhất
        userWithdrawals.sort((a, b) => {
          const dateA = new Date(a.created_at || a.thoi_gian_tao || 0);
          const dateB = new Date(b.created_at || b.thoi_gian_tao || 0);
          return dateB - dateA;
        });
        setWithdrawalHistory(userWithdrawals);
        console.log('✅ Lấy lịch sử rút tiền thành công:', userWithdrawals.length, 'bản ghi');
      } else {
        console.error('❌ Lỗi khi lấy lịch sử rút tiền:', response.error);
        setWithdrawalHistory([]);
      }
    } catch (error) {
      console.error('❌ Lỗi khi lấy lịch sử rút tiền:', error);
      setWithdrawalHistory([]);
    } finally {
      setIsLoadingWithdrawal(false);
    }
  };

  const handleShowWithdrawalDetail = () => {
    setShowWithdrawalModal(true);
    fetchWithdrawalHistory();
  };

  // Fetch danh sách kèo đã hoàn thành (DONE) và đang xử lý, lắng nghe sự kiện/global focus
  useEffect(() => {
    fetchDoneTasks();
    fetchPendingTasks();
    fetchInProgressTasks();
    if (user?.id) {
      fetchCurrentUserBalance();
    }

    const handleRefresh = (event) => {
      console.log('🔄 ProfilePage - Nhận được event bet-receipt-status-changed:', event?.detail);
      fetchDoneTasks();
      fetchPendingTasks();
      fetchInProgressTasks();
      if (user?.id) {
        fetchCurrentUserBalance();
      }
    };

    // Sử dụng capture phase để đảm bảo nhận được event
    window.addEventListener('bet-receipt-status-changed', handleRefresh, true);
    window.addEventListener('focus', handleRefresh);

    return () => {
      window.removeEventListener('bet-receipt-status-changed', handleRefresh, true);
      window.removeEventListener('focus', handleRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
              <div style={{ position: 'relative' }} data-month-filter>
                <button
                  onClick={() => setShowMonthFilter(!showMonthFilter)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: monthFilter ? '#667eea' : '#333',
                    backgroundColor: monthFilter ? '#e8edff' : '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  title="Lọc theo tháng"
                >
                  📅 {monthFilter ? `Tháng: ${monthFilter}` : 'Lọc theo tháng'}
                </button>
                {showMonthFilter && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '8px',
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      minWidth: '200px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      padding: '8px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      onClick={() => {
                        setMonthFilter('');
                        setShowMonthFilter(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        backgroundColor: monthFilter === '' ? '#e8edff' : 'transparent',
                        color: monthFilter === '' ? '#667eea' : '#333',
                        marginBottom: '4px',
                        fontWeight: monthFilter === '' ? '600' : '400'
                      }}
                      onMouseEnter={(e) => {
                        if (monthFilter !== '') {
                          e.target.style.backgroundColor = '#f5f5f5';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (monthFilter !== '') {
                          e.target.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      Tất cả
                    </div>
                    {Array.from(
                      new Set(
                        doneTasks
                          .map((task) => {
                            const completedAt = task.completed_at || task.completedAt;
                            if (!completedAt) return null;
                            try {
                              const date = new Date(completedAt);
                              if (isNaN(date.getTime())) return null;
                              return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                            } catch (e) {
                              return null;
                            }
                          })
                          .filter(Boolean)
                      )
                    )
                      .sort()
                      .reverse()
                      .map((month) => (
                        <div
                          key={month}
                          onClick={() => {
                            setMonthFilter(month);
                            setShowMonthFilter(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            backgroundColor: monthFilter === month ? '#e8edff' : 'transparent',
                            color: monthFilter === month ? '#667eea' : '#333',
                            marginBottom: '4px',
                            fontWeight: monthFilter === month ? '600' : '400'
                          }}
                          onMouseEnter={(e) => {
                            if (monthFilter !== month) {
                              e.target.style.backgroundColor = '#f5f5f5';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (monthFilter !== month) {
                              e.target.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          {month}
                        </div>
                      ))}
                  </div>
                )}
              </div>
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
        {/* Nút "Các nhiệm vụ bạn cần làm" - Box quan trọng nhất */}
        <div className="important-task-button-wrapper">
          <button 
            className="important-task-button"
            onClick={() => {
              setShowTaskModal(true);
            }}
          >
            <div className="important-task-button-content">
              <div className="important-task-icon">📋</div>
              <div className="important-task-text">
                <span className="important-task-title">Các nhiệm vụ bạn cần làm</span>
                <span className="important-task-subtitle">
                  {inProgressTasks.length > 0 
                    ? `${inProgressTasks.length} nhiệm vụ đang thực hiện` 
                    : 'Bạn không có nhiệm vụ nào đang thực hiện. Hãy đi nhận đơn hàng nhé!'}
                </span>
              </div>
              <div className="important-task-arrow">→</div>
            </div>
          </button>
        </div>
        
        <div className="personal-box personal-box-left">
          <h3>Các đơn hàng đang xử lí : {pendingTasks.length}</h3>
          <div className="personal-box-body">
            {isLoadingPendingTasks ? (
              'Đang tải...'
            ) : pendingTasks.length === 0 ? (
              'Chưa có dữ liệu'
            ) : (
              <div className="task-list-compact task-list-pending">
                <div className="task-list-header">
                  <span>Nhiệm vụ</span>
                  <span>Loại kèo</span>
                  <span>Tiền kèo</span>
                  <span>Tiến độ</span>
                </div>
                <div className="task-list-body">
                  {pendingTasks.map((task) => {
                    const statusClass = task.status === 'CHỜ TRỌNG TÀI' 
                      ? 'status-waiting-referee' 
                      : task.status === 'CHỜ CHẤP NHẬN' 
                      ? 'status-pending' 
                      : '';
                    return (
                      <div key={task.id} className="task-list-row">
                        <span>{task.task_code || task.task || '-'}</span>
                        <span>{task.bet_type || task.betType || '-'}</span>
                        <span>
                          {formatNumber(task.web_bet_amount_cny ?? task.webBet)}
                        </span>
                        <span className={statusClass}>{task.status || '-'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="personal-box personal-box-center">
          <h3>Nhiệm vụ đã hoàn thành : {
            monthFilter 
              ? doneTasks.filter((task) => {
                  const completedAt = task.completed_at || task.completedAt;
                  if (!completedAt) return false;
                  try {
                    const date = new Date(completedAt);
                    if (isNaN(date.getTime())) return false;
                    const taskMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    return taskMonth === monthFilter;
                  } catch (e) {
                    return false;
                  }
                }).length
              : doneTasks.length
          }</h3>
          <div className="personal-box-body">
            {isLoadingTasks ? (
              'Đang tải...'
            ) : (() => {
                const filteredDoneTasks = monthFilter
                  ? doneTasks.filter((task) => {
                      const completedAt = task.completed_at || task.completedAt;
                      if (!completedAt) return false;
                      try {
                        const date = new Date(completedAt);
                        if (isNaN(date.getTime())) return false;
                        const taskMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        return taskMonth === monthFilter;
                      } catch (e) {
                        return false;
                      }
                    })
                  : doneTasks;
                
                return filteredDoneTasks.length === 0 ? (
                  'Chưa có dữ liệu'
                ) : (
                  <div className="task-list-compact">
                    <div className="task-list-header">
                      <span>Nhiệm vụ</span>
                      <span>Loại kèo</span>
                      <span>Tiền kèo</span>
                      <span>Công thực nhận</span>
                      <span>Chi tiết</span>
                    </div>
                    <div className="task-list-body">
                      {filteredDoneTasks.map((task) => {
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
                                ''
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>

        <div className="personal-box personal-box-right">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h3 style={{ margin: 0 }}>Số dư hiện tại : </h3>
            {isLoadingBalance ? (
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#666' }}>Đang tải...</span>
            ) : (
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#b7791f' }}>
                {formatNumber(currentBalance)} VND
              </span>
            )}
          </div>
          <p className="personal-box-subtitle">Số dư & tổng hợp</p>
          <div className="personal-box-body">
            {isLoadingBalance ? (
              'Đang tải...'
            ) : (
              <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                <div style={{ marginBottom: '12px' }}>
                  <span>Số ¥ đã nhận: <strong style={{ color: '#b7791f' }}>{formatNumber(totalReceivedCNY)}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={handleShowWithdrawalDetail}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#fff',
                    backgroundColor: '#b7791f',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'background-color 0.2s ease, transform 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#9d6619';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#b7791f';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Chi tiết rút tiền
                </button>
              </div>
            )}
          </div>
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

      {showWithdrawalModal && (
        <div
          className="reason-modal-overlay"
          onClick={() => setShowWithdrawalModal(false)}
        >
          <div
            className="reason-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}
          >
            <div className="reason-modal-header">
              <h3>Chi tiết rút tiền</h3>
              <button
                className="reason-modal-close"
                onClick={() => setShowWithdrawalModal(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="reason-modal-body">
              {isLoadingWithdrawal ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>Đang tải...</div>
              ) : withdrawalHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  Chưa có lịch sử rút tiền
                </div>
              ) : (
                <div>
                  <table className="task-detail-table" style={{ marginTop: '10px' }}>
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Số tiền rút (VND)</th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawalHistory.map((item) => {
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
                          <tr key={item.id}>
                            <td>{formatDateTime(item.created_at || item.thoi_gian_tao)}</td>
                            <td>{formatNumber(item.amount_vnd || item.so_tien_rut_vnd || 0)}</td>
                            <td>{item.notes || item.ghi_chu || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="reason-modal-footer">
              <button
                className="reason-modal-button"
                type="button"
                onClick={() => setShowWithdrawalModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal bảng nhiệm vụ cần làm */}
      {showTaskModal && (
        <div
          className="reason-modal-overlay"
          onClick={() => setShowTaskModal(false)}
        >
          <div
            className="task-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="reason-modal-header">
              <h3>Thông tin</h3>
              <button
                className="reason-modal-close"
                onClick={() => setShowTaskModal(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="task-modal-body">
              {isLoadingInProgressTasks ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  Đang tải...
                </div>
              ) : (() => {
                // Filter theo tên user - chỉ hiển thị đơn hàng của user hiện tại
                const filteredTasks = inProgressTasks.filter((task) => {
                  const taskUserName = task.user_name || task.name || task.userName || '';
                  const currentUserName = user?.name || '';
                  return taskUserName.trim().toLowerCase() === currentUserName.trim().toLowerCase();
                });

                return filteredTasks.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                    Bạn không có nhiệm vụ nào đang thực hiện. Hãy đi nhận đơn hàng nhé!
                  </div>
                ) : (
                  <div className="task-modal-table-wrapper">
                    <table className="task-modal-table">
                      <thead>
                        <tr>
                          <th>Nhiệm vụ</th>
                          <th>Loại kèo</th>
                          <th>Tiền kèo</th>
                          <th>Tài khoản</th>
                          <th>Mật khẩu</th>
                          <th>Khu vực</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.map((task) => (
                          <tr key={task.id}>
                            <td>{task.task_code || task.task || '-'}</td>
                            <td>{task.bet_type || task.betType || '-'}</td>
                            <td>{formatNumber(task.web_bet_amount_cny ?? task.webBet ?? 0)}</td>
                            <td>{task.account || task.tai_khoan || '-'}</td>
                            <td>{task.password || task.mat_khau || '-'}</td>
                            <td>{task.region || task.khu_vuc || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
              
              {/* Thông tin tài khoản nhận kèo */}
              <div className="task-modal-account-info">
                <div className="account-info-header">
                  <h4>Link nhận kèo:</h4>
                  <a 
                    href="https://m.dailiantong.com/#/pages/login/login" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="account-info-link"
                  >
                    https://m.dailiantong.com/#/pages/login/login
                  </a>
                </div>
                <div className="account-info-accounts">
                  <div className="account-item">
                    <div className="account-label">Tài khoản:</div>
                    <div className="account-value">18501753689</div>
                    <div className="account-label">Mật khẩu:</div>
                    <div className="account-value">anhteo123</div>
                  </div>
                  <div className="account-separator">—</div>
                  <div className="account-item">
                    <div className="account-label">Tài khoản:</div>
                    <div className="account-value">19378713623</div>
                    <div className="account-label">Mật khẩu:</div>
                    <div className="account-value">anhteo123</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
};

export default ProfilePage;


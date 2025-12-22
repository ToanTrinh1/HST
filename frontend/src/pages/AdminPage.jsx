import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { donHangAPI } from '../api/endpoints/don_hang.api';
import './HomePage.css';
import './AdminPage.css';

const AdminPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('danh-sach-keo');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  
  // Form state
  const [formData, setFormData] = useState({
    user_name: '',
    task_code: '',
    bet_type: 'web',
    web_bet_amount_cny: '',
    order_code: '',
    notes: '',
    completed_hours: '', // Thời gian hoàn thành (số giờ)
  });

  // Danh sách đơn hàng từ API
  const [betList, setBetList] = useState([]);
  const [isLoadingDonHang, setIsLoadingDonHang] = useState(false);

  const getStatusClass = (status) => {
    switch (status) {
      case 'DONE':
        return 'status-done';
      case 'ĐANG THỰC HIỆN':
        return 'status-in-progress';
      case 'ĐỀN':
        return 'status-compensation';
      case 'CHỜ CHẤP NHẬN':
        return 'status-pending';
      case 'HỦY BỎ':
        return 'status-cancelled';
      case 'ĐANG QUÉT MÃ':
        return 'status-scanning';
      case 'CHỜ TRỌNG TÀI':
        return 'status-waiting-ref';
      default:
        return '';
    }
  };

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

  // Fetch danh sách đơn hàng từ API
  const fetchDonHangList = async () => {
    console.log('🔄 fetchDonHangList được gọi');
    setIsLoadingDonHang(true);
    try {
      console.log('📡 Gọi API layDanhSachDonHang...');
      const response = await donHangAPI.layDanhSachDonHang();
      console.log('📥 API Response:', response);
      
      if (response.success && response.data) {
        console.log('✅ DonHang API Response thành công, số lượng:', response.data.length);
        console.log('DonHang API Response data:', response.data);
        
        // Map dữ liệu từ API về format của bảng
        const mappedData = response.data.map((item) => {
          console.log('🔍 Mapping item:', item, 'user_name:', item.user_name, 'user_id:', item.user_id);
          return {
            id: item.stt || item.id,
            name: item.user_name || 'không có trong db', // Sử dụng user_name (đã join từ DB), nếu không có hiển thị "không có trong db"
            task: item.task_code || '',
            betType: item.bet_type || '',
            webBet: item.web_bet_amount_cny || 0,
            orderCode: item.order_code || '',
            note: item.notes || '',
            status: item.status || '',
            actualReceived: item.actual_received_cny || 0,
            compensation: item.compensation_cny || '',
            actualAmount: item.actual_amount_cny || 0,
            receivedAt: item.received_at || '',
            completedHours: item.completed_hours || '', // Thời gian hoàn thành (số giờ)
            completedAt: item.completed_at || '', // Thời gian hoàn thành thực tế (datetime)
            timeRemainingHours: item.time_remaining_hours || '',
            timeRemainingFormatted: item.time_remaining_formatted || '', // Thời gian còn lại đã format (giờ:phút)
          };
        });
        console.log('✅ Mapped data:', mappedData);
        setBetList(mappedData);
      } else {
        console.error('❌ Lỗi khi lấy danh sách đơn hàng:', response.error);
        setBetList([]);
      }
    } catch (error) {
      console.error('❌ Exception khi fetch danh sách đơn hàng:', error);
      setBetList([]);
    } finally {
      setIsLoadingDonHang(false);
    }
  };

  // Load danh sách đơn hàng khi component mount và khi activeTab là 'danh-sach-keo'
  useEffect(() => {
    console.log('🔄 useEffect activeTab:', activeTab);
    if (activeTab === 'danh-sach-keo') {
      console.log('✅ activeTab là danh-sach-keo, gọi fetchDonHangList');
      fetchDonHangList();
    }
  }, [activeTab]);


  // Lấy chữ cái đầu tiên của tên để hiển thị trong avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  // Xử lý thay đổi form
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Xử lý tạo đơn hàng
  const handleCreateDonHang = async (e) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const dataToSend = {
        user_name: formData.user_name,
        task_code: formData.task_code,
        bet_type: formData.bet_type,
        web_bet_amount_cny: parseFloat(formData.web_bet_amount_cny),
        order_code: formData.order_code || undefined,
        notes: formData.notes || undefined,
        completed_hours: formData.completed_hours ? parseInt(formData.completed_hours) : undefined,
      };

      const response = await donHangAPI.taoDonHang(dataToSend);

      if (response.success) {
        alert('Tạo đơn hàng thành công!');
        setShowCreateModal(false);
        // Reset form
        setFormData({
          user_name: '',
          task_code: '',
          bet_type: 'web',
          web_bet_amount_cny: '',
          order_code: '',
          notes: '',
          completed_hours: '',
        });
        // Reload danh sách đơn hàng
        fetchDonHangList();
      } else {
        alert('Lỗi: ' + (response.error || 'Không thể tạo đơn hàng'));
      }
    } catch (error) {
      console.error('Lỗi khi tạo đơn hàng:', error);
      alert('Có lỗi xảy ra khi tạo đơn hàng');
    } finally {
      setIsCreating(false);
    }
  };

  // Đóng modal khi click bên ngoài
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showCreateModal) {
        setShowCreateModal(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showCreateModal]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'danh-sach-keo':
        return (
          <div className="admin-tab-content">
            <div className="admin-action-bar">
              <button 
                className="btn-create-don-hang"
                onClick={() => setShowCreateModal(true)}
              >
                ➕ Tạo đơn hàng
              </button>
            </div>
            <div className="bet-list-table-wrapper">
              <table className="bet-list-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Tên</th>
                    <th>Thời gian nhận kèo</th>
                    <th>Thời gian hoàn thành</th>
                    <th>Nhiệm vụ</th>
                    <th>Loại kèo</th>
                    <th>Tiền kèo web</th>
                    <th>Mã đơn hàng</th>
                    <th>Ghi chú</th>
                    <th>Thời gian còn lại</th>
                    <th>Tiến độ hoàn thành</th>
                    <th>Tiền kèo thực nhận</th>
                    <th>Tiền đền</th>
                    <th>Công thực nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingDonHang ? (
                    <tr>
                      <td colSpan="14" style={{ textAlign: 'center', padding: '20px' }}>
                        Đang tải...
                      </td>
                    </tr>
                  ) : betList.length === 0 ? (
                    <tr>
                      <td colSpan="14" style={{ textAlign: 'center', padding: '20px' }}>
                        Chưa có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    betList.map((bet) => (
                      <tr key={bet.id}>
                        <td>{bet.id}</td>
                        <td>{bet.name}</td>
                        <td>{bet.receivedAt ? new Date(bet.receivedAt).toLocaleString('vi-VN') : ''}</td>
                        <td>{bet.completedHours || ''}</td>
                        <td>{bet.task}</td>
                        <td>{bet.betType}</td>
                        <td>{bet.webBet}</td>
                        <td>{bet.orderCode || ''}</td>
                        <td>{bet.note}</td>
                        <td>{bet.timeRemainingFormatted || bet.timeRemainingHours || ''}</td>
                        <td>
                          <select 
                            className={`status-select ${getStatusClass(bet.status)}`} 
                            value={bet.status}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              setBetList(prevList => 
                                prevList.map(item => 
                                  item.id === bet.id ? { ...item, status: newStatus } : item
                                )
                              );
                            }}
                          >
                            <option value="ĐANG THỰC HIỆN">ĐANG THỰC HIỆN</option>
                            <option value="DONE">DONE</option>
                            <option value="CHỜ CHẤP NHẬN">CHỜ CHẤP NHẬN</option>
                            <option value="HỦY BỎ">HỦY BỎ</option>
                            <option value="ĐỀN">ĐỀN</option>
                            <option value="ĐANG QUÉT MÃ">ĐANG QUÉT MÃ</option>
                            <option value="CHỜ TRỌNG TÀI">CHỜ TRỌNG TÀI</option>
                          </select>
                        </td>
                        <td>{bet.actualReceived || ''}</td>
                        <td>{bet.compensation || ''}</td>
                        <td>{bet.actualAmount ? bet.actualAmount.toFixed(1).replace('.', ',') : ''}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'rut-tien':
        return (
          <div className="admin-tab-content">
            <h3>Rút tiền</h3>
            <p>Nội dung rút tiền sẽ được cập nhật sau này</p>
          </div>
        );
      case 'loi-nhuan':
        return (
          <div className="admin-tab-content">
            <h3>Lợi nhuận</h3>
            <p>Nội dung lợi nhuận sẽ được cập nhật sau này</p>
          </div>
        );
      default:
        return null;
    }
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
      <div className="admin-content">
        {renderTabContent()}
      </div>

      {/* Modal tạo đơn hàng */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tạo đơn hàng mới</h2>
              <button 
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateDonHang} className="create-don-hang-form">
              <div className="form-group">
                <label htmlFor="user_name">Tên <span className="required">*</span></label>
                <input
                  type="text"
                  id="user_name"
                  name="user_name"
                  value={formData.user_name}
                  onChange={handleFormChange}
                  required
                  placeholder="Nhập tên người dùng"
                />
              </div>

              <div className="form-group">
                <label htmlFor="task_code">Nhiệm vụ <span className="required">*</span></label>
                <input
                  type="text"
                  id="task_code"
                  name="task_code"
                  value={formData.task_code}
                  onChange={handleFormChange}
                  required
                  placeholder="VD: kc4-96-ct, lb3-kc1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="bet_type">Loại kèo <span className="required">*</span></label>
                <select
                  id="bet_type"
                  name="bet_type"
                  value={formData.bet_type}
                  onChange={handleFormChange}
                  required
                >
                  <option value="web">web</option>
                  <option value="Kèo ngoài">Kèo ngoài</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="web_bet_amount_cny">Tiền kèo web (CNY) <span className="required">*</span></label>
                <input
                  type="number"
                  id="web_bet_amount_cny"
                  name="web_bet_amount_cny"
                  value={formData.web_bet_amount_cny}
                  onChange={handleFormChange}
                  required
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="order_code">Mã đơn hàng</label>
                <input
                  type="text"
                  id="order_code"
                  name="order_code"
                  value={formData.order_code}
                  onChange={handleFormChange}
                  placeholder="Tùy chọn"
                />
              </div>

              <div className="form-group">
                <label htmlFor="notes">Ghi chú</label>
                <input
                  type="text"
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  placeholder="Tùy chọn"
                />
              </div>

              <div className="form-group">
                <label htmlFor="completed_hours">Thời gian hoàn thành (giờ)</label>
                <input
                  type="number"
                  id="completed_hours"
                  name="completed_hours"
                  value={formData.completed_hours}
                  onChange={handleFormChange}
                  min="0"
                  placeholder="Nhập số giờ để hoàn thành (ví dụ: 40)"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={isCreating}
                >
                  {isCreating ? 'Đang tạo...' : 'Xác nhận tạo đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="admin-bottom-nav">
        <button
          className={`admin-nav-item ${activeTab === 'danh-sach-keo' ? 'active' : ''}`}
          onClick={() => setActiveTab('danh-sach-keo')}
        >
          <span className="admin-nav-icon">📋</span>
          <span className="admin-nav-label">Danh sách kèo</span>
        </button>
        <button
          className={`admin-nav-item ${activeTab === 'rut-tien' ? 'active' : ''}`}
          onClick={() => setActiveTab('rut-tien')}
        >
          <span className="admin-nav-icon">💰</span>
          <span className="admin-nav-label">Rút tiền</span>
        </button>
        <button
          className={`admin-nav-item ${activeTab === 'loi-nhuan' ? 'active' : ''}`}
          onClick={() => setActiveTab('loi-nhuan')}
        >
          <span className="admin-nav-icon">📊</span>
          <span className="admin-nav-label">Lợi nhuận</span>
        </button>
      </div>
    </div>
  );
};

export default AdminPage;

import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { donHangAPI } from '../api/endpoints/don_hang.api';
import { walletAPI } from '../api/endpoints/wallet.api';
import { depositAPI } from '../api/endpoints/deposit.api';
import { withdrawalAPI } from '../api/endpoints/withdrawal.api';
import { userAPI } from '../api/endpoints/user.api';
import './HomePage.css';
import './AdminPage.css';

const AdminPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('danh-sach-keo');
  const [activeRutTienTab, setActiveRutTienTab] = useState('danh-sach'); // Sub-tab trong tab rút tiền
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Modal nạp tiền
  const [showNapTienModal, setShowNapTienModal] = useState(false);
  const [isNapTien, setIsNapTien] = useState(false);
  const [napTienFormData, setNapTienFormData] = useState({
    user_name: '',
    amount_vnd: '',
  });
  
  // Modal rút tiền
  const [showRutTienModal, setShowRutTienModal] = useState(false);
  const [isRutTien, setIsRutTien] = useState(false);
  const [rutTienFormData, setRutTienFormData] = useState({
    user_name: '',
    amount_vnd: '',
  });
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

  // Danh sách wallets từ API
  const [walletList, setWalletList] = useState([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  // Danh sách users để autocomplete
  const [userList, setUserList] = useState([]);
  const [filteredUserList, setFilteredUserList] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userInputRef = useRef(null);

  // Nap tien user dropdown
  const [napTienFilteredUserList, setNapTienFilteredUserList] = useState([]);
  const [showNapTienUserDropdown, setShowNapTienUserDropdown] = useState(false);
  const napTienUserInputRef = useRef(null);

  // Rut tien user dropdown
  const [rutTienFilteredUserList, setRutTienFilteredUserList] = useState([]);
  const [showRutTienUserDropdown, setShowRutTienUserDropdown] = useState(false);
  const rutTienUserInputRef = useRef(null);

  // Bet type dropdown
  const [showBetTypeDropdown, setShowBetTypeDropdown] = useState(false);
  const betTypeInputRef = useRef(null);
  const betTypeOptions = ['web', 'Kèo ngoài'];

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
            id: item.id, // ID thực sự (UUID) để gọi API
            stt: item.stt, // Số thứ tự để hiển thị
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

  // Fetch danh sách wallets từ API
  const fetchWalletList = async () => {
    console.log('🔄 fetchWalletList được gọi');
    setIsLoadingWallet(true);
    try {
      console.log('📡 Gọi API layDanhSachWallets...');
      const response = await walletAPI.layDanhSachWallets();
      console.log('📥 Wallet API Response:', response);
      
      if (response.success && response.data) {
        console.log('✅ Wallet API Response thành công, số lượng:', response.data.length);
        console.log('📊 Wallet data mẫu:', response.data[0]);
        setWalletList(response.data);
      } else {
        console.error('❌ Lỗi khi lấy danh sách wallets:', response.error);
        setWalletList([]);
      }
    } catch (error) {
      console.error('❌ Exception khi fetch danh sách wallets:', error);
      setWalletList([]);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  // Load danh sách đơn hàng khi component mount và khi activeTab thay đổi
  useEffect(() => {
    console.log('🔄 useEffect được gọi, activeTab hiện tại:', activeTab);
    
    if (activeTab === 'danh-sach-keo') {
      console.log('✅ activeTab là danh-sach-keo, gọi fetchDonHangList');
      fetchDonHangList();
    }
  }, [activeTab]);

  // Load danh sách wallets khi vào sub-tab "Danh sách" trong tab "Rút tiền"
  useEffect(() => {
    if (activeTab === 'rut-tien' && activeRutTienTab === 'danh-sach') {
      console.log('✅ activeTab là rut-tien và activeRutTienTab là danh-sach, gọi fetchWalletList');
      fetchWalletList();
    }
  }, [activeTab, activeRutTienTab]);

  // Load danh sách users khi mở modal tạo đơn hàng, nạp tiền, hoặc rút tiền
  useEffect(() => {
    if (showCreateModal || showNapTienModal || showRutTienModal) {
      fetchUserList();
    }
  }, [showCreateModal, showNapTienModal, showRutTienModal]);

  // Fetch danh sách users từ API
  const fetchUserList = async () => {
    try {
      const response = await userAPI.getAllUsers(1000, 0);
      if (response.success && response.data) {
        setUserList(response.data);
        setFilteredUserList(response.data);
        setNapTienFilteredUserList(response.data);
        setRutTienFilteredUserList(response.data);
      }
    } catch (error) {
      console.error('❌ Lỗi khi lấy danh sách users:', error);
    }
  };

  // Filter users khi gõ
  const handleUserNameChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, user_name: value });
    setShowUserDropdown(true);
    
    if (value.trim() === '') {
      setFilteredUserList(userList);
    } else {
      const filtered = userList.filter(user => 
        user.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredUserList(filtered);
    }
  };

  // Chọn user từ dropdown
  const handleUserSelect = (userName) => {
    setFormData({ ...formData, user_name: userName });
    setShowUserDropdown(false);
  };

  // Chọn bet type từ dropdown
  const handleBetTypeSelect = (betType) => {
    setFormData({ ...formData, bet_type: betType });
    setShowBetTypeDropdown(false);
  };

  // Filter users cho nạp tiền
  const handleNapTienUserNameChange = (e) => {
    const value = e.target.value;
    setNapTienFormData({ ...napTienFormData, user_name: value });
    setShowNapTienUserDropdown(true);
    
    if (value.trim() === '') {
      setNapTienFilteredUserList(userList);
    } else {
      const filtered = userList.filter(user => 
        user.name.toLowerCase().includes(value.toLowerCase())
      );
      setNapTienFilteredUserList(filtered);
    }
  };

  // Chọn user cho nạp tiền
  const handleNapTienUserSelect = (userName) => {
    setNapTienFormData({ ...napTienFormData, user_name: userName });
    setShowNapTienUserDropdown(false);
  };

  // Filter users cho rút tiền
  const handleRutTienUserNameChange = (e) => {
    const value = e.target.value;
    setRutTienFormData({ ...rutTienFormData, user_name: value });
    setShowRutTienUserDropdown(true);
    
    if (value.trim() === '') {
      setRutTienFilteredUserList(userList);
    } else {
      const filtered = userList.filter(user => 
        user.name.toLowerCase().includes(value.toLowerCase())
      );
      setRutTienFilteredUserList(filtered);
    }
  };

  // Chọn user cho rút tiền
  const handleRutTienUserSelect = (userName) => {
    setRutTienFormData({ ...rutTienFormData, user_name: userName });
    setShowRutTienUserDropdown(false);
  };

  // Đóng dropdown khi click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userInputRef.current && !userInputRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (betTypeInputRef.current && !betTypeInputRef.current.contains(event.target)) {
        setShowBetTypeDropdown(false);
      }
      if (napTienUserInputRef.current && !napTienUserInputRef.current.contains(event.target)) {
        setShowNapTienUserDropdown(false);
      }
      if (rutTienUserInputRef.current && !rutTienUserInputRef.current.contains(event.target)) {
        setShowRutTienUserDropdown(false);
      }
    };

    if (showUserDropdown || showBetTypeDropdown || showNapTienUserDropdown || showRutTienUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown, showBetTypeDropdown, showNapTienUserDropdown, showRutTienUserDropdown]);

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

  // Format số với dấu chấm phân cách hàng nghìn
  const formatNumberInput = (value) => {
    // Loại bỏ tất cả các ký tự không phải số
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    
    // Format với dấu chấm phân cách hàng nghìn
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Convert số đã format về số thực (loại bỏ dấu chấm)
  const parseFormattedNumber = (formattedValue) => {
    if (!formattedValue) return '';
    return formattedValue.replace(/\./g, '');
  };

  // Format số thành dạng viết tắt (500k, 1.5M, ...)
  const formatNumberAbbr = (value) => {
    const numericValue = parseFloat(parseFormattedNumber(value));
    if (!numericValue || isNaN(numericValue)) return '';
    
    if (numericValue >= 1000000) {
      const millions = numericValue / 1000000;
      // Nếu là số nguyên thì không hiển thị .0
      return (millions % 1 === 0 ? millions.toString() : millions.toFixed(1)) + 'M';
    } else if (numericValue >= 1000) {
      return Math.round(numericValue / 1000) + 'k';
    }
    return numericValue.toString();
  };

  // Handler nạp tiền
  const handleNapTien = async (e) => {
    e.preventDefault();
    setIsNapTien(true);

    try {
      const numericAmount = parseFormattedNumber(napTienFormData.amount_vnd);
      const amountValue = parseFloat(numericAmount);
      
      if (!numericAmount || isNaN(amountValue) || amountValue <= 0) {
        alert('Vui lòng nhập số tiền hợp lệ');
        setIsNapTien(false);
        return;
      }
      
      const dataToSend = {
        user_name: napTienFormData.user_name,
        amount_vnd: amountValue,
      };

      const response = await depositAPI.napTien(dataToSend);

      if (response.success) {
        alert('Nạp tiền thành công!');
        setShowNapTienModal(false);
        setNapTienFormData({ user_name: '', amount_vnd: '' });
        // Reload danh sách wallet
        fetchWalletList();
      } else {
        alert('Lỗi: ' + (response.error || 'Không thể nạp tiền'));
      }
    } catch (error) {
      console.error('Lỗi khi nạp tiền:', error);
      alert('Có lỗi xảy ra khi nạp tiền');
    } finally {
      setIsNapTien(false);
    }
  };

  // Handler rút tiền
  const handleRutTien = async (e) => {
    e.preventDefault();
    setIsRutTien(true);

    try {
      const numericAmount = parseFormattedNumber(rutTienFormData.amount_vnd);
      const amountValue = parseFloat(numericAmount);
      
      if (!numericAmount || isNaN(amountValue) || amountValue <= 0) {
        alert('Vui lòng nhập số tiền hợp lệ');
        setIsRutTien(false);
        return;
      }
      
      const dataToSend = {
        user_name: rutTienFormData.user_name,
        amount_vnd: amountValue,
      };

      const response = await withdrawalAPI.rutTien(dataToSend);

      if (response.success) {
        alert('Rút tiền thành công!');
        setShowRutTienModal(false);
        setRutTienFormData({ user_name: '', amount_vnd: '' });
        // Reload danh sách wallet
        fetchWalletList();
      } else {
        alert('Lỗi: ' + (response.error || 'Không thể rút tiền'));
      }
    } catch (error) {
      console.error('Lỗi khi rút tiền:', error);
      alert('Có lỗi xảy ra khi rút tiền');
    } finally {
      setIsRutTien(false);
    }
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
                        <td>{bet.stt || bet.id}</td>
                        <td>{bet.name}</td>
                        <td>{bet.receivedAt ? new Date(bet.receivedAt).toLocaleString('vi-VN') : ''}</td>
                        <td>{bet.completedHours || ''}</td>
                        <td>{bet.task}</td>
                        <td>{bet.betType}</td>
                        <td>{bet.webBet}</td>
                        <td>{bet.orderCode || ''}</td>
                        <td>{bet.note}</td>
                        <td>{bet.status !== 'DONE' ? (bet.timeRemainingFormatted || bet.timeRemainingHours || '') : ''}</td>
                        <td>
                          <select 
                            className={`status-select ${getStatusClass(bet.status)}`} 
                            value={bet.status}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              const betId = bet.id; // ID thực sự (UUID)
                              
                              // Cập nhật UI ngay lập tức (optimistic update)
                              setBetList(prevList => 
                                prevList.map(item => 
                                  item.id === betId ? { ...item, status: newStatus } : item
                                )
                              );

                              // Gọi API để cập nhật status trên backend
                              try {
                                console.log('📡 Cập nhật status cho đơn hàng ID:', betId, 'Status mới:', newStatus);
                                const response = await donHangAPI.capNhatStatusDonHang(betId, {
                                  status: newStatus
                                });

                                if (response.success && response.data) {
                                  console.log('✅ Cập nhật status thành công:', response.data);
                                  
                                  const newStatus = response.data.status;
                                  const actualAmount = newStatus === 'DONE' 
                                    ? (response.data.actual_amount_cny || 0)
                                    : 0;
                                  
                                  // Cập nhật lại state với dữ liệu từ backend
                                  // Nếu status = DONE, lấy actualAmountCNY từ backend
                                  // Nếu status ≠ DONE, set actualAmount = 0 (không hiển thị)
                                  setBetList(prevList => 
                                    prevList.map(item => {
                                      if (item.id === betId) {
                                        return {
                                          ...item,
                                          status: newStatus,
                                          actualAmount: actualAmount,
                                          actualReceived: response.data.actual_received_cny !== undefined ? response.data.actual_received_cny : item.actualReceived,
                                          compensation: response.data.compensation_cny !== undefined ? response.data.compensation_cny : item.compensation,
                                        };
                                      }
                                      return item;
                                    })
                                  );

                                  // Wallet đã được cập nhật (cả khi DONE và khi đổi từ DONE sang khác)
                                  // Reload lại danh sách wallet để hiển thị số tiền mới
                                  // Thêm delay nhỏ để đảm bảo backend đã cập nhật xong
                                  console.log('💰 Status đã thay đổi, reload lại danh sách wallet...');
                                  setTimeout(() => {
                                    fetchWalletList();
                                  }, 500); // Delay 500ms để đảm bảo backend đã cập nhật xong
                                } else {
                                  console.error('❌ Lỗi cập nhật status:', response.error);
                                  alert('Lỗi: ' + (response.error || 'Không thể cập nhật status'));
                                  // Revert lại status cũ
                                  setBetList(prevList => 
                                    prevList.map(item => 
                                      item.id === betId ? { ...item, status: bet.status } : item
                                    )
                                  );
                                }
                              } catch (error) {
                                console.error('❌ Lỗi khi gọi API cập nhật status:', error);
                                alert('Có lỗi xảy ra khi cập nhật status');
                                // Revert lại status cũ
                                setBetList(prevList => 
                                  prevList.map(item => 
                                    item.id === betId ? { ...item, status: bet.status } : item
                                  )
                                );
                              }
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
                        <td>{bet.status === 'DONE' && bet.actualAmount ? bet.actualAmount.toString() : ''}</td>
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
            {/* Sub-tabs cho Rút tiền và nút Nạp tiền, Rút tiền */}
            <div className="rut-tien-sub-tabs">
              <div className="rut-tien-sub-tabs-left">
                <button
                  className={`rut-tien-sub-tab ${activeRutTienTab === 'danh-sach' ? 'active' : ''}`}
                  onClick={() => setActiveRutTienTab('danh-sach')}
                >
                  Danh sách
                </button>
                <button
                  className={`rut-tien-sub-tab ${activeRutTienTab === 'lich-su' ? 'active' : ''}`}
                  onClick={() => setActiveRutTienTab('lich-su')}
                >
                  Lịch sử
                </button>
              </div>
              <div className="wallet-action-buttons">
                <button className="btn-nap-tien" onClick={() => {
                  setShowNapTienModal(true);
                  setNapTienFormData({ user_name: '', amount_vnd: '' });
                }}>
                  Nạp tiền
                </button>
                <button className="btn-rut-tien" onClick={() => {
                  setShowRutTienModal(true);
                  setRutTienFormData({ user_name: '', amount_vnd: '' });
                }}>
                  Rút tiền
                </button>
              </div>
            </div>

            {/* Nội dung theo sub-tab */}
            {activeRutTienTab === 'danh-sach' ? (
              <div className="bet-list-table-wrapper">
                  <table className="bet-list-table wallet-table">
                  <thead>
                    <tr>
                      <th rowSpan="2">Tên</th>
                      <th>Tệ</th>
                      <th colSpan="3">VND</th>
                    </tr>
                    <tr>
                      <th>Công thực nhận</th>
                      <th>Đã nộp</th>
                      <th>Đã rút</th>
                      <th>SD hiện tại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingWallet ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                          Đang tải...
                        </td>
                      </tr>
                    ) : walletList.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                          Chưa có dữ liệu
                        </td>
                      </tr>
                    ) : (
                    walletList.map((item) => {
                      // Map dữ liệu theo yêu cầu
                      const userName = item.user?.name || ''; // Tên từ nd.ten trong database
                      const totalReceivedCNY = item.wallet?.total_received_cny || 0; // Công thực nhận (Tệ)
                      const totalDepositVND = item.wallet?.total_deposit_vnd || 0; // Đã nộp (VND)
                      const totalWithdrawnVND = item.wallet?.total_withdrawn_vnd || 0; // Đã rút (VND)
                      const currentBalanceVND = item.wallet?.current_balance_vnd || 0; // SD hiện tại (VND) - dùng current_balance_vnd
                      
                      // Format số với dấu chấm (.) - không thay đổi kiểu dữ liệu
                      // Ví dụ: 10.9 giữ nguyên 10.9, 35550 hiển thị 35.550
                      const formatNumber = (num) => {
                        if (num === 0 || num === null || num === undefined) return '0';
                        // Giữ nguyên số thập phân, chỉ format phần nguyên với dấu chấm phân cách hàng nghìn
                        const parts = num.toString().split('.');
                        const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                        return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
                      };
                      
                      return (
                        <tr key={item.wallet?.id || item.user?.id}>
                          <td>{userName}</td>
                          <td>{formatNumber(totalReceivedCNY)}</td>
                          <td>{formatNumber(totalDepositVND)}</td>
                          <td>{formatNumber(totalWithdrawnVND)}</td>
                          <td>{formatNumber(currentBalanceVND)}</td>
                        </tr>
                      );
                    })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                <h3>Đang cập nhật</h3>
              </div>
            )}
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
                <div className="autocomplete-wrapper" ref={userInputRef}>
                  <input
                    type="text"
                    id="user_name"
                    name="user_name"
                    value={formData.user_name}
                    onChange={handleUserNameChange}
                    onFocus={() => setShowUserDropdown(true)}
                    required
                    placeholder="Gõ để tìm kiếm tên người dùng"
                    autoComplete="off"
                  />
                  {showUserDropdown && filteredUserList.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {filteredUserList.map((user) => (
                        <div
                          key={user.id}
                          className="autocomplete-item"
                          onClick={() => handleUserSelect(user.name)}
                        >
                          {user.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label htmlFor="bet_type">Loại kèo <span className="required">*</span></label>
                <div className="autocomplete-wrapper" ref={betTypeInputRef}>
                  <input
                    type="text"
                    id="bet_type"
                    name="bet_type"
                    value={formData.bet_type}
                    onFocus={() => setShowBetTypeDropdown(true)}
                    onClick={() => setShowBetTypeDropdown(true)}
                    readOnly
                    required
                    placeholder="Chọn loại kèo"
                    style={{ cursor: 'pointer' }}
                  />
                  {showBetTypeDropdown && (
                    <div className="autocomplete-dropdown">
                      {betTypeOptions.map((option) => (
                        <div
                          key={option}
                          className="autocomplete-item"
                          onClick={() => handleBetTypeSelect(option)}
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="web_bet_amount_cny">Tiền kèo web ¥ <span className="required">*</span></label>
                <input
                  type="text"
                  id="web_bet_amount_cny"
                  name="web_bet_amount_cny"
                  value={formData.web_bet_amount_cny}
                  onChange={handleFormChange}
                  required
                  placeholder="0.00"
                  pattern="[0-9]*\.?[0-9]*"
                  inputMode="decimal"
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
                  autoComplete="off"
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
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label htmlFor="completed_hours">Thời gian hoàn thành (giờ)</label>
                <input
                  type="text"
                  id="completed_hours"
                  name="completed_hours"
                  value={formData.completed_hours}
                  onChange={handleFormChange}
                  placeholder="Nhập số giờ để hoàn thành (ví dụ: 40)"
                  pattern="[0-9]*"
                  inputMode="numeric"
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

      {/* Modal Nạp tiền */}
      {showNapTienModal && (
        <div className="modal-overlay" onClick={() => setShowNapTienModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nạp tiền</h2>
              <button
                className="modal-close"
                onClick={() => setShowNapTienModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleNapTien} className="create-don-hang-form">
              <div className="form-group">
                <label htmlFor="nap-tien-user-name">Tên người dùng *</label>
                <div className="autocomplete-wrapper" ref={napTienUserInputRef}>
                  <input
                    type="text"
                    id="nap-tien-user-name"
                    value={napTienFormData.user_name}
                    onChange={handleNapTienUserNameChange}
                    onFocus={() => setShowNapTienUserDropdown(true)}
                    required
                    placeholder="Gõ để tìm kiếm tên người dùng"
                    autoComplete="off"
                  />
                  {showNapTienUserDropdown && napTienFilteredUserList.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {napTienFilteredUserList.map((user) => (
                        <div
                          key={user.id}
                          className="autocomplete-item"
                          onClick={() => handleNapTienUserSelect(user.name)}
                        >
                          {user.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="nap-tien-amount">Số tiền VND *</label>
                <input
                  type="text"
                  id="nap-tien-amount"
                  value={napTienFormData.amount_vnd}
                  onChange={(e) => {
                    const formatted = formatNumberInput(e.target.value);
                    setNapTienFormData({ ...napTienFormData, amount_vnd: formatted });
                  }}
                  required
                  placeholder="Nhập số tiền VND (ví dụ: 500.000)"
                  autoComplete="off"
                />
                {napTienFormData.amount_vnd && (
                  <div style={{ 
                    marginTop: '4px', 
                    fontSize: '12px', 
                    color: '#666',
                    fontStyle: 'italic'
                  }}>
                    ≈ {formatNumberAbbr(napTienFormData.amount_vnd)}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowNapTienModal(false)}
                  disabled={isNapTien}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={isNapTien}
                >
                  {isNapTien ? 'Đang nạp...' : 'Xác nhận nạp tiền'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rút tiền */}
      {showRutTienModal && (
        <div className="modal-overlay" onClick={() => setShowRutTienModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Rút tiền</h2>
              <button
                className="modal-close"
                onClick={() => setShowRutTienModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleRutTien} className="create-don-hang-form">
              <div className="form-group">
                <label htmlFor="rut-tien-user-name">Tên người dùng *</label>
                <div className="autocomplete-wrapper" ref={rutTienUserInputRef}>
                  <input
                    type="text"
                    id="rut-tien-user-name"
                    value={rutTienFormData.user_name}
                    onChange={handleRutTienUserNameChange}
                    onFocus={() => setShowRutTienUserDropdown(true)}
                    required
                    placeholder="Gõ để tìm kiếm tên người dùng"
                    autoComplete="off"
                  />
                  {showRutTienUserDropdown && rutTienFilteredUserList.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {rutTienFilteredUserList.map((user) => (
                        <div
                          key={user.id}
                          className="autocomplete-item"
                          onClick={() => handleRutTienUserSelect(user.name)}
                        >
                          {user.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="rut-tien-amount">Số tiền VND *</label>
                <input
                  type="text"
                  id="rut-tien-amount"
                  value={rutTienFormData.amount_vnd}
                  onChange={(e) => {
                    const formatted = formatNumberInput(e.target.value);
                    setRutTienFormData({ ...rutTienFormData, amount_vnd: formatted });
                  }}
                  required
                  placeholder="Nhập số tiền VND cần rút (ví dụ: 500.000)"
                  autoComplete="off"
                />
                {rutTienFormData.amount_vnd && (
                  <div style={{ 
                    marginTop: '4px', 
                    fontSize: '12px', 
                    color: '#666',
                    fontStyle: 'italic'
                  }}>
                    ≈ {formatNumberAbbr(rutTienFormData.amount_vnd)}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowRutTienModal(false)}
                  disabled={isRutTien}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={isRutTien}
                >
                  {isRutTien ? 'Đang rút...' : 'Xác nhận rút tiền'}
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

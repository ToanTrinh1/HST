import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { donHangAPI } from '../api/endpoints/don_hang.api';
import { walletAPI } from '../api/endpoints/wallet.api';
import { depositAPI } from '../api/endpoints/deposit.api';
import { withdrawalAPI } from '../api/endpoints/withdrawal.api';
import { userAPI } from '../api/endpoints/user.api';
import betReceiptHistoryAPI from '../api/endpoints/bet_receipt_history.api';
import './HomePage.css';
import './AdminPage.css';

const AdminPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTopTab, setActiveTopTab] = useState('trang-thong-tin'); // Tab phía trên footer
  const [activeTab, setActiveTab] = useState('danh-sach-keo');
  const [activeDonHangTab, setActiveDonHangTab] = useState('tong-hop'); // Sub-tab trong tab danh sách kèo
  const [activeRutTienTab, setActiveRutTienTab] = useState('danh-sach'); // Sub-tab trong tab rút tiền: 'danh-sach', 'lich-su-rut', 'lich-su-nap'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Modal nạp tiền
  const [showNapTienModal, setShowNapTienModal] = useState(false);
  const [isNapTien, setIsNapTien] = useState(false);
  const [napTienFormData, setNapTienFormData] = useState({
    user_name: '',
    amount_vnd: '',
    notes: '',
  });
  
  // Modal rút tiền
  const [showRutTienModal, setShowRutTienModal] = useState(false);
  const [isRutTien, setIsRutTien] = useState(false);
  const [rutTienFormData, setRutTienFormData] = useState({
    user_name: '',
    amount_vnd: '',
    notes: '',
  });
  
  // Modal nhập ActualReceivedCNY khi chọn status "Hủy bỏ"
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelModalData, setCancelModalData] = useState({
    betId: '',
    oldStatus: '',
    actualReceivedCNY: '',
  });
  
  // Modal nhập CompensationCNY khi chọn status "Đền"
  const [showCompensationModal, setShowCompensationModal] = useState(false);
  const [compensationModalData, setCompensationModalData] = useState({
    betId: '',
    oldStatus: '',
    compensationCNY: '',
  });
  
  // Modal chỉnh sửa đơn hàng
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBetId, setEditingBetId] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
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
  const [totalCurrentBalanceVND, setTotalCurrentBalanceVND] = useState(0);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  // Danh sách lịch sử nạp/rút tiền
  const [depositHistory, setDepositHistory] = useState([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [isLoadingHistoryNapRut, setIsLoadingHistoryNapRut] = useState(false);

  // Bộ lọc lịch sử nạp/rút tiền
  const [depositFilters, setDepositFilters] = useState({
    name: '',
    month: '',
    minAmount: '',
  });
  const [withdrawalFilters, setWithdrawalFilters] = useState({
    name: '',
    month: '',
    minAmount: '',
  });
  const [showWithdrawalFilterInputs, setShowWithdrawalFilterInputs] = useState({
    name: false,
    month: false,
    minAmount: false,
  });
  const [showDepositFilterInputs, setShowDepositFilterInputs] = useState({
    name: false,
    month: false,
    minAmount: false,
  });

  // Options cho dropdown gợi ý (tự động lấy từ dữ liệu hiện có)
  const withdrawalNameOptions = Array.from(
    new Set(withdrawalHistory.map((h) => (h.user_name || '').trim()).filter(Boolean))
  );
  const withdrawalMonthOptions = Array.from(
    new Set(
      withdrawalHistory
        .map((h) => {
          const d = new Date(h.created_at);
          if (isNaN(d.getTime())) return '';
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        })
        .filter(Boolean)
    )
  );
  const withdrawalAmountOptions = Array.from(
    new Set(withdrawalHistory.map((h) => h.amount_vnd).filter((v) => !isNaN(v)))
  )
    .sort((a, b) => a - b)
    .slice(0, 10);

  const depositNameOptions = Array.from(
    new Set(depositHistory.map((h) => (h.user_name || '').trim()).filter(Boolean))
  );
  const depositMonthOptions = Array.from(
    new Set(
      depositHistory
        .map((h) => {
          const d = new Date(h.created_at);
          if (isNaN(d.getTime())) return '';
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        })
        .filter(Boolean)
    )
  );
  const depositAmountOptions = Array.from(
    new Set(depositHistory.map((h) => h.amount_vnd).filter((v) => !isNaN(v)))
  )
    .sort((a, b) => a - b)
    .slice(0, 10);

  // Gợi ý cho bảng danh sách kèo
  const betNameOptions = Array.from(new Set(betList.map((b) => (b.name || '').trim()).filter(Boolean)));
  const betOrderCodeOptions = Array.from(
    new Set(betList.map((b) => (b.orderCode || '').trim()).filter(Boolean))
  );
  const betWebBetOptions = Array.from(
    new Set(
      betList
        .map((b) => {
          const val = typeof b.webBet === 'number' ? b.webBet : parseFloat(b.webBet);
          return isNaN(val) ? null : val;
        })
        .filter((v) => v !== null)
    )
  )
    .sort((a, b) => a - b)
    .slice(0, 10);

  // Danh sách lịch sử chỉnh sửa
  const [historyList, setHistoryList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistoryDetailModal, setShowHistoryDetailModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);

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
      case 'Đơn hàng mới':
        return 'status-new';
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

  // Danh sách các status để tạo tabs (thứ tự từ trái sang phải)
  const statusTabs = [
    { key: 'tong-hop', label: 'Tổng hợp', status: null }, // Tab tổng hợp - hiển thị tất cả
    { key: 'don-hang-moi', label: 'Đơn hàng mới', status: 'Đơn hàng mới' },
    { key: 'dang-quet-ma', label: 'Đang quét mã', status: 'ĐANG QUÉT MÃ' },
    { key: 'dang-thuc-hien', label: 'Đang thực hiện', status: 'ĐANG THỰC HIỆN' },
    { key: 'huy-bo', label: 'Hủy bỏ', status: 'HỦY BỎ' },
    { key: 'cho-chap-nhan', label: 'Chờ chấp nhận', status: 'CHỜ CHẤP NHẬN' },
    { key: 'done', label: 'DONE', status: 'DONE' },
    { key: 'den', label: 'Đền', status: 'ĐỀN' },
    { key: 'cho-trong-tai', label: 'Chờ trọng tài', status: 'CHỜ TRỌNG TÀI' },
  ];

  // Filter states
  const [filters, setFilters] = useState({
    name: '',
    betType: '',
    webBet: '',
    orderCode: '',
  });
  const [showFilterInputs, setShowFilterInputs] = useState({
    name: false,
    betType: false,
    webBet: false,
    orderCode: false,
  });

  // Filter betList theo status và các filters
  const filteredBetList = (activeDonHangTab === 'tong-hop'
    ? betList // Tab tổng hợp - hiển thị tất cả
    : betList.filter(bet => {
        const selectedTab = statusTabs.find(tab => tab.key === activeDonHangTab);
        return selectedTab && selectedTab.status ? bet.status === selectedTab.status : true;
      })
  ).filter(bet => {
    // Filter theo Tên
    if (filters.name && !bet.name?.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }
    // Filter theo Loại kèo
    if (filters.betType && bet.betType !== filters.betType) {
      return false;
    }
    // Filter theo Tiền kèo web (tìm kiếm theo số, hỗ trợ phần nguyên)
    if (filters.webBet) {
      const filterValue = parseFloat(filters.webBet);
      const betValue = typeof bet.webBet === 'number' ? bet.webBet : parseFloat(bet.webBet) || 0;
      if (isNaN(filterValue) || betValue !== filterValue) {
        return false;
      }
    }
    // Filter theo Mã đơn hàng
    if (filters.orderCode && !bet.orderCode?.toLowerCase().includes(filters.orderCode.toLowerCase())) {
      return false;
    }
    return true;
  });

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
        // Lấy tổng SD hiện tại từ response
        if (response.total_current_balance_vnd !== undefined) {
          setTotalCurrentBalanceVND(response.total_current_balance_vnd);
          console.log('💰 Tổng SD hiện tại:', response.total_current_balance_vnd);
        }
      } else {
        console.error('❌ Lỗi khi lấy danh sách wallets:', response.error);
        setWalletList([]);
        setTotalCurrentBalanceVND(0);
      }
    } catch (error) {
      console.error('❌ Exception khi fetch danh sách wallets:', error);
      setWalletList([]);
      setTotalCurrentBalanceVND(0);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  // Disable scroll cho body khi component mount
  useEffect(() => {
    // Disable scroll cho body
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    
    // Cleanup: restore scroll khi component unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, []);

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

  // Fetch lịch sử rút tiền
  const fetchHistoryRut = async () => {
    setIsLoadingHistoryNapRut(true);
    try {
      const withdrawalResponse = await withdrawalAPI.layTatCaLichSu();
      if (withdrawalResponse.success && withdrawalResponse.data) {
        console.log('✅ Lấy lịch sử rút tiền thành công:', withdrawalResponse.data.length, 'records');
        setWithdrawalHistory(withdrawalResponse.data);
      } else {
        console.error('❌ Lỗi khi lấy lịch sử rút tiền:', withdrawalResponse.error);
        setWithdrawalHistory([]);
      }
    } catch (error) {
      console.error('❌ Exception khi fetch lịch sử rút tiền:', error);
      setWithdrawalHistory([]);
    } finally {
      setIsLoadingHistoryNapRut(false);
    }
  };

  // Fetch lịch sử nạp tiền
  const fetchHistoryNap = async () => {
    setIsLoadingHistoryNapRut(true);
    try {
      const depositResponse = await depositAPI.layTatCaLichSu();
      if (depositResponse.success && depositResponse.data) {
        console.log('✅ Lấy lịch sử nạp tiền thành công:', depositResponse.data.length, 'records');
        setDepositHistory(depositResponse.data);
      } else {
        console.error('❌ Lỗi khi lấy lịch sử nạp tiền:', depositResponse.error);
        setDepositHistory([]);
      }
    } catch (error) {
      console.error('❌ Exception khi fetch lịch sử nạp tiền:', error);
      setDepositHistory([]);
    } finally {
      setIsLoadingHistoryNapRut(false);
    }
  };

  // Load lịch sử rút tiền khi vào sub-tab "Lịch sử rút"
  useEffect(() => {
    if (activeTab === 'rut-tien' && activeRutTienTab === 'lich-su-rut') {
      console.log('✅ activeTab là rut-tien và activeRutTienTab là lich-su-rut, gọi fetchHistoryRut');
      fetchHistoryRut();
    }
  }, [activeTab, activeRutTienTab]);

  // Load lịch sử nạp tiền khi vào sub-tab "Lịch sử nạp"
  useEffect(() => {
    if (activeTab === 'rut-tien' && activeRutTienTab === 'lich-su-nap') {
      console.log('✅ activeTab là rut-tien và activeRutTienTab là lich-su-nap, gọi fetchHistoryNap');
      fetchHistoryNap();
    }
  }, [activeTab, activeRutTienTab]);

  // Load danh sách lịch sử chỉnh sửa khi vào tab "Lịch sử chỉnh sửa"
  useEffect(() => {
    if (activeTab === 'danh-sach-keo' && activeTopTab === 'lich-su-chinh-sua') {
      console.log('✅ activeTab là danh-sach-keo và activeTopTab là lich-su-chinh-sua, gọi fetchHistoryList');
      fetchHistoryList();
    }
  }, [activeTab, activeTopTab]);

  // Load danh sách users khi mở modal tạo đơn hàng, chỉnh sửa đơn hàng, nạp tiền, hoặc rút tiền
  useEffect(() => {
    if (showCreateModal || showEditModal || showNapTienModal || showRutTienModal) {
      fetchUserList();
    }
  }, [showCreateModal, showEditModal, showNapTienModal, showRutTienModal]);

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

  // Fetch danh sách lịch sử chỉnh sửa
  const fetchHistoryList = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await betReceiptHistoryAPI.layTatCaLichSu(200, 0);
      if (response.success && response.data) {
        console.log('✅ Lấy danh sách lịch sử thành công:', response.data.length, 'records');
        setHistoryList(response.data);
      } else {
        console.error('❌ Lỗi khi lấy danh sách lịch sử:', response.error);
        setHistoryList([]);
      }
    } catch (error) {
      console.error('❌ Exception khi fetch lịch sử:', error);
      setHistoryList([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Xem chi tiết lịch sử
  const handleViewHistoryDetail = (history) => {
    setSelectedHistory(history);
    setShowHistoryDetailModal(true);
  };

  // Format thời gian
  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Format số thành đơn vị triệu/tỷ (ví dụ: 18.500.000 → "18,5 triệu")
  const formatBalanceToMillion = (num) => {
    if (num === 0 || num === null || num === undefined) return '0';
    
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '0';
    
    // Nếu >= 1 tỷ (1.000.000.000)
    if (numValue >= 1000000000) {
      const ty = numValue / 1000000000;
      // Làm tròn đến 1 chữ số thập phân
      const tyRounded = Math.round(ty * 10) / 10;
      // Nếu là số nguyên thì không hiển thị phần thập phân
      if (tyRounded % 1 === 0) {
        return `${tyRounded.toFixed(0)} tỷ`;
      }
      return `${tyRounded.toFixed(1).replace('.', ',')} tỷ`;
    }
    
    // Nếu >= 1 triệu (1.000.000)
    if (numValue >= 1000000) {
      const trieu = numValue / 1000000;
      // Làm tròn đến 1 chữ số thập phân
      const trieuRounded = Math.round(trieu * 10) / 10;
      // Nếu là số nguyên thì không hiển thị phần thập phân
      if (trieuRounded % 1 === 0) {
        return `${trieuRounded.toFixed(0)} triệu`;
      }
      return `${trieuRounded.toFixed(1).replace('.', ',')} triệu`;
    }
    
    // Nếu < 1 triệu, hiển thị với dấu chấm phân cách hàng nghìn
    const parts = numValue.toString().split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
  };

  // Format số chi tiết với dấu chấm phân cách hàng nghìn (ví dụ: 1600000 → "1.600.000")
  const formatBalanceDetail = (num) => {
    if (num === 0 || num === null || num === undefined) return '0';
    
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '0';
    
    // Làm tròn về số nguyên
    const rounded = Math.round(numValue);
    // Format với dấu chấm phân cách hàng nghìn
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Format tổng SD hiện tại: số chi tiết ~ số đã format (ví dụ: "1.600.000 ~ 1,6 triệu VND")
  const formatTotalBalance = (num) => {
    if (num === 0 || num === null || num === undefined) return '0 ~ 0 VND';
    
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '0 ~ 0 VND';
    
    const detail = formatBalanceDetail(numValue);
    const formatted = formatBalanceToMillion(numValue);
    return `${detail} ~ ${formatted} VND`;
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
        notes: napTienFormData.notes || '',
      };

      const response = await depositAPI.napTien(dataToSend);

      if (response.success) {
        alert('Nạp tiền thành công!');
        setShowNapTienModal(false);
        setNapTienFormData({ user_name: '', amount_vnd: '', notes: '' });
        // Reload danh sách wallet
        fetchWalletList();
        // Reload lịch sử nếu đang ở tab "Lịch sử nạp"
        if (activeRutTienTab === 'lich-su-nap') {
          fetchHistoryNap();
        }
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
        notes: rutTienFormData.notes || '',
      };

      const response = await withdrawalAPI.rutTien(dataToSend);

      if (response.success) {
        alert('Rút tiền thành công!');
        setShowRutTienModal(false);
        setRutTienFormData({ user_name: '', amount_vnd: '', notes: '' });
        // Reload danh sách wallet
        fetchWalletList();
        // Reload lịch sử nếu đang ở tab "Lịch sử rút"
        if (activeRutTienTab === 'lich-su-rut') {
          fetchHistoryRut();
        }
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

  // Handler xác nhận đền (nhập CompensationCNY)
  const handleCompensationStatus = async (e) => {
    e.preventDefault();
    
    try {
      const numericAmount = compensationModalData.compensationCNY.replace(/[^\d.]/g, '');
      const amountValue = parseFloat(numericAmount);
      
      if (numericAmount === '' || isNaN(amountValue) || amountValue <= 0) {
        alert('Tiền đền phải lớn hơn 0');
        return;
      }
      
      const betId = compensationModalData.betId;

      // Gọi API để cập nhật status trên backend
      console.log('📡 Cập nhật status cho đơn hàng ID:', betId, 'Status mới: ĐỀN', 'CompensationCNY:', amountValue);
      const response = await donHangAPI.capNhatStatusDonHang(betId, {
        status: 'ĐỀN',
        compensation_cny: amountValue
      });

      if (response.success && response.data) {
        console.log('✅ Cập nhật status thành công:', response.data);
        
        // Cập nhật lại state với dữ liệu từ backend
        setBetList(prevList => 
          prevList.map(item => {
            if (item.id === betId) {
              return {
                ...item,
                status: 'ĐỀN',
                compensation: response.data.compensation_cny !== undefined ? response.data.compensation_cny : amountValue,
                actualAmount: response.data.actual_amount_cny !== undefined ? response.data.actual_amount_cny : 0, // Sẽ là giá trị âm
              };
            }
            return item;
          })
        );

        // Reload lại danh sách wallet và đơn hàng
        console.log('💰 Status đã thay đổi, reload lại danh sách wallet và đơn hàng...');
        setTimeout(() => {
          fetchWalletList();
          fetchDonHangList();
        }, 500);

        // Đóng modal
        setShowCompensationModal(false);
        setCompensationModalData({
          betId: '',
          oldStatus: '',
          compensationCNY: '',
        });
      } else {
        console.error('❌ Lỗi cập nhật status:', response.error);
        alert('Lỗi: ' + (response.error || 'Không thể cập nhật status'));
        // Revert lại status cũ
        setBetList(prevList => 
          prevList.map(item => {
            if (item.id === betId) {
              return { ...item, status: compensationModalData.oldStatus };
            }
            return item;
          })
        );
      }
    } catch (error) {
      console.error('❌ Lỗi khi gọi API cập nhật status:', error);
      alert('Có lỗi xảy ra khi cập nhật status');
      // Revert lại status cũ
      const betId = compensationModalData.betId;
      setBetList(prevList => 
        prevList.map(item => {
          if (item.id === betId) {
            return { ...item, status: compensationModalData.oldStatus };
          }
          return item;
        })
      );
    }
  };

  // Handler xác nhận hủy bỏ (nhập ActualReceivedCNY)
  const handleCancelStatus = async (e) => {
    e.preventDefault();
    
    try {
      const numericAmount = cancelModalData.actualReceivedCNY.replace(/[^\d.]/g, '');
      const amountValue = parseFloat(numericAmount);
      
      if (numericAmount === '' || isNaN(amountValue) || amountValue < 0) {
        alert('Vui lòng nhập số tiền hợp lệ (≥ 0)');
        return;
      }
      
      const betId = cancelModalData.betId;

      // Gọi API để cập nhật status trên backend
      console.log('📡 Cập nhật status cho đơn hàng ID:', betId, 'Status mới: HỦY BỎ', 'ActualReceivedCNY:', amountValue);
      const response = await donHangAPI.capNhatStatusDonHang(betId, {
        status: 'HỦY BỎ',
        actual_received_cny: amountValue
      });

      if (response.success && response.data) {
        console.log('✅ Cập nhật status thành công:', response.data);
        
        // Cập nhật lại state với dữ liệu từ backend
        setBetList(prevList => 
          prevList.map(item => {
            if (item.id === betId) {
              return {
                ...item,
                status: 'HỦY BỎ',
                actualReceived: response.data.actual_received_cny !== undefined ? response.data.actual_received_cny : amountValue,
                actualAmount: response.data.actual_amount_cny !== undefined ? response.data.actual_amount_cny : 0,
              };
            }
            return item;
          })
        );

        // Reload lại danh sách wallet và đơn hàng
        console.log('💰 Status đã thay đổi, reload lại danh sách wallet và đơn hàng...');
        setTimeout(() => {
          fetchWalletList();
          fetchDonHangList();
        }, 500);

        // Đóng modal
        setShowCancelModal(false);
        setCancelModalData({
          betId: '',
          oldStatus: '',
          actualReceivedCNY: '',
        });
      } else {
        console.error('❌ Lỗi cập nhật status:', response.error);
        alert('Lỗi: ' + (response.error || 'Không thể cập nhật status'));
        // Revert lại status cũ
        setBetList(prevList => 
          prevList.map(item => {
            if (item.id === betId) {
              return { ...item, status: cancelModalData.oldStatus };
            }
            return item;
          })
        );
      }
    } catch (error) {
      console.error('❌ Lỗi khi gọi API cập nhật status:', error);
      alert('Có lỗi xảy ra khi cập nhật status');
      // Revert lại status cũ
      const betId = cancelModalData.betId;
      setBetList(prevList => 
        prevList.map(item => {
          if (item.id === betId) {
            return { ...item, status: cancelModalData.oldStatus };
          }
          return item;
        })
      );
    }
  };

  // Xử lý mở modal chỉnh sửa
  const handleEditBet = (bet) => {
    setEditingBetId(bet.id);
    setFormData({
      user_name: bet.name || '',
      task_code: bet.task || '',
      bet_type: bet.betType || 'web',
      web_bet_amount_cny: bet.webBet?.toString() || '',
      order_code: bet.orderCode || '',
      notes: bet.note || '',
      completed_hours: bet.timeRemainingHours?.toString() || bet.completedHours?.toString() || '',
    });
    setShowEditModal(true);
  };

  // Xử lý cập nhật đơn hàng
  const handleUpdateDonHang = async (e) => {
    e.preventDefault();
    if (!editingBetId) return;
    
    setIsUpdating(true);
    try {
      const dataToSend = {};
      if (formData.user_name) dataToSend.user_name = formData.user_name;
      if (formData.task_code) dataToSend.task_code = formData.task_code;
      if (formData.bet_type) dataToSend.bet_type = formData.bet_type;
      if (formData.web_bet_amount_cny) dataToSend.web_bet_amount_cny = parseFloat(formData.web_bet_amount_cny);
      if (formData.order_code !== undefined) dataToSend.order_code = formData.order_code || null;
      if (formData.notes !== undefined) dataToSend.notes = formData.notes || null;
      if (formData.completed_hours) dataToSend.completed_hours = parseInt(formData.completed_hours);

      const response = await donHangAPI.capNhatDonHang(editingBetId, dataToSend);

      if (response.success) {
        alert('Cập nhật đơn hàng thành công!');
        setShowEditModal(false);
        setEditingBetId(null);
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
        alert('Lỗi: ' + (response.error || 'Không thể cập nhật đơn hàng'));
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật đơn hàng:', error);
      alert('Có lỗi xảy ra khi cập nhật đơn hàng');
    } finally {
      setIsUpdating(false);
    }
  };

  // Xử lý xóa đơn hàng
  const handleDeleteBet = async (betId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) {
      return;
    }

    try {
      const response = await donHangAPI.xoaDonHang(betId);

      if (response.success) {
        alert('Xóa đơn hàng thành công!');
        // Reload danh sách đơn hàng
        fetchDonHangList();
        // Reload danh sách wallet nếu cần
        fetchWalletList();
      } else {
        alert('Lỗi: ' + (response.error || 'Không thể xóa đơn hàng'));
      }
    } catch (error) {
      console.error('Lỗi khi xóa đơn hàng:', error);
      alert('Có lỗi xảy ra khi xóa đơn hàng');
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
    // Nếu đang ở tab "Lịch sử chỉnh sửa" và đang ở tab "Danh sách kèo", hiển thị bảng lịch sử
    if (activeTopTab === 'lich-su-chinh-sua' && activeTab === 'danh-sach-keo') {
      return (
        <div className="admin-tab-content">
          {/* Tiêu đề "Thông tin chỉnh sửa" */}
          <div className="rut-tien-sub-tabs" style={{ justifyContent: 'center', marginBottom: '10px' }}>
            <h2 style={{ 
              margin: 0, 
              padding: '8px 16px', 
              fontSize: '16px', 
              fontWeight: '600',
              color: '#333',
              textAlign: 'center'
            }}>
              Thông tin chỉnh sửa
            </h2>
          </div>
          <div className="bet-list-table-wrapper">
            {isLoadingHistory ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                Đang tải lịch sử...
              </div>
            ) : historyList.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                Chưa có lịch sử chỉnh sửa
              </div>
            ) : (
              <table className="bet-list-table history-edit-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Thời gian</th>
                    <th>Mã đơn hàng</th>
                    <th>Hành động</th>
                    <th>Người thực hiện</th>
                    <th>Mô tả</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((history, index) => {
                    // Lấy mã đơn hàng (order_code) từ old_data hoặc new_data
                    // Backend serialize BetReceipt với key "order_code" (từ json tag)
                    let orderCode = '';
                    try {
                      // Ưu tiên lấy từ new_data (dữ liệu sau khi sửa)
                      if (history.new_data) {
                        const newData = typeof history.new_data === 'string' ? JSON.parse(history.new_data) : history.new_data;
                        orderCode = newData.order_code || '';
                      }
                      // Nếu không có, lấy từ old_data (dữ liệu trước khi sửa)
                      if (!orderCode && history.old_data) {
                        const oldData = typeof history.old_data === 'string' ? JSON.parse(history.old_data) : history.old_data;
                        orderCode = oldData.order_code || '';
                      }
                    } catch (e) {
                      console.error('Error parsing order_code from history:', e);
                    }
                    
                    // Chỉ hiển thị order_code, không fallback về bet_receipt_id
                    // Nếu order_code trống, hiển thị "(Trống)"
                    const displayValue = orderCode || '(Trống)';
                    
                    return (
                      <tr key={history.id}>
                        <td>{index + 1}</td>
                        <td>{formatDateTime(history.created_at)}</td>
                        <td style={{ fontSize: '10px' }}>
                          {displayValue}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              history.action === 'UPDATE' ? 'history-update' : 'history-delete'
                            }`}
                          >
                            {history.action}
                          </span>
                        </td>
                        <td>{history.performed_by_name || 'N/A'}</td>
                        <td>{history.description || '-'}</td>
                        <td>
                          <button
                            onClick={() => handleViewHistoryDetail(history)}
                            style={{
                              padding: '4px 8px',
                              background: '#667eea',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '10px',
                            }}
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      );
    }

    // Tab "Trang thông tin" - hiển thị nội dung "Danh sách kèo"
    // (chỉ khi activeTopTab === 'trang-thong-tin' hoặc không phải 'lich-su-chinh-sua')
    switch (activeTab) {
      case 'danh-sach-keo':
        return (
          <div className="admin-tab-content">
            {/* Sub-tabs cho Danh sách kèo */}
            <div className="rut-tien-sub-tabs">
              <div className="rut-tien-sub-tabs-left">
                {statusTabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={`rut-tien-sub-tab ${activeDonHangTab === tab.key ? 'active' : ''}`}
                    onClick={() => setActiveDonHangTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="wallet-action-buttons">
                <button 
                  className="btn-create-don-hang"
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    padding: '10px 20px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background 0.3s ease'
                  }}
                >
                  ➕ Tạo đơn hàng
                </button>
              </div>
            </div>
            <div className="bet-list-table-wrapper">
              <table className="bet-list-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>Tên</span>
                          <button
                            onClick={() => setShowFilterInputs({ ...showFilterInputs, name: !showFilterInputs.name })}
                            style={{
                              background: filters.name ? '#667eea' : 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Lọc theo tên"
                          >
                            🔍
                          </button>
                        </div>
                        {showFilterInputs.name && (
                          <input
                            type="text"
                            value={filters.name}
                            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                            onBlur={() => {
                              // Đóng filter input khi mất focus sau một chút để cho phép click vào button
                              setTimeout(() => {
                                setShowFilterInputs({ ...showFilterInputs, name: false });
                              }, 200);
                            }}
                            placeholder="Lọc tên..."
                            style={{
                              marginTop: '4px',
                              padding: '4px 8px',
                              width: 'calc(100% - 16px)',
                              fontSize: '11px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              boxSizing: 'border-box',
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {showFilterInputs.name && betNameOptions.length > 0 && (
                          <div className="inline-suggestions">
                            {betNameOptions.map((opt) => (
                              <div
                                key={opt}
                                className="inline-suggestion-item"
                                onMouseDown={() => {
                                  setFilters({ ...filters, name: opt });
                                  setShowFilterInputs({ ...showFilterInputs, name: false });
                                }}
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </th>
                    <th>Thời gian nhận kèo</th>
                    <th>Thời gian hoàn thành</th>
                    <th>Nhiệm vụ</th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>Loại kèo</span>
                          <button
                            onClick={() => setShowFilterInputs({ ...showFilterInputs, betType: !showFilterInputs.betType })}
                            style={{
                              background: filters.betType ? '#667eea' : 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Lọc theo loại kèo"
                          >
                            🔍
                          </button>
                        </div>
                        {showFilterInputs.betType && (
                          <select
                            value={filters.betType}
                            onChange={(e) => setFilters({ ...filters, betType: e.target.value })}
                            onBlur={() => {
                              // Đóng filter input khi mất focus sau một chút để cho phép click vào button
                              setTimeout(() => {
                                setShowFilterInputs({ ...showFilterInputs, betType: false });
                              }, 200);
                            }}
                            style={{
                              marginTop: '4px',
                              padding: '4px 8px',
                              width: 'calc(100% - 16px)',
                              fontSize: '11px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              boxSizing: 'border-box',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Tất cả</option>
                            <option value="web">web</option>
                            <option value="Kèo ngoài">Kèo ngoài</option>
                          </select>
                        )}
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>Tiền kèo web</span>
                          <button
                            onClick={() => setShowFilterInputs({ ...showFilterInputs, webBet: !showFilterInputs.webBet })}
                            style={{
                              background: filters.webBet ? '#667eea' : 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Lọc theo tiền kèo web"
                          >
                            🔍
                          </button>
                        </div>
                        {showFilterInputs.webBet && (
                          <input
                            type="text"
                            value={filters.webBet}
                            onChange={(e) => setFilters({ ...filters, webBet: e.target.value.replace(/[^\d.]/g, '') })}
                            onBlur={() => {
                              // Đóng filter input khi mất focus sau một chút để cho phép click vào button
                              setTimeout(() => {
                                setShowFilterInputs({ ...showFilterInputs, webBet: false });
                              }, 200);
                            }}
                            placeholder="Lọc số tiền..."
                            style={{
                              marginTop: '4px',
                              padding: '4px 8px',
                              width: 'calc(100% - 16px)',
                              fontSize: '11px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              boxSizing: 'border-box',
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {showFilterInputs.webBet && betWebBetOptions.length > 0 && (
                          <div className="inline-suggestions">
                            {betWebBetOptions.map((opt) => (
                              <div
                                key={opt}
                                className="inline-suggestion-item"
                                onMouseDown={() => {
                                  setFilters({ ...filters, webBet: opt.toString() });
                                  setShowFilterInputs({ ...showFilterInputs, webBet: false });
                                }}
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>Mã đơn hàng</span>
                          <button
                            onClick={() => setShowFilterInputs({ ...showFilterInputs, orderCode: !showFilterInputs.orderCode })}
                            style={{
                              background: filters.orderCode ? '#667eea' : 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Lọc theo mã đơn hàng"
                          >
                            🔍
                          </button>
                        </div>
                        {showFilterInputs.orderCode && (
                          <input
                            type="text"
                            value={filters.orderCode}
                            onChange={(e) => setFilters({ ...filters, orderCode: e.target.value })}
                            onBlur={() => {
                              // Đóng filter input khi mất focus sau một chút để cho phép click vào button
                              setTimeout(() => {
                                setShowFilterInputs({ ...showFilterInputs, orderCode: false });
                              }, 200);
                            }}
                            placeholder="Lọc mã đơn hàng..."
                            style={{
                              marginTop: '4px',
                              padding: '4px 8px',
                              width: 'calc(100% - 16px)',
                              fontSize: '11px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              boxSizing: 'border-box',
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {showFilterInputs.orderCode && betOrderCodeOptions.length > 0 && (
                          <div className="inline-suggestions">
                            {betOrderCodeOptions.map((opt) => (
                              <div
                                key={opt}
                                className="inline-suggestion-item"
                                onMouseDown={() => {
                                  setFilters({ ...filters, orderCode: opt });
                                  setShowFilterInputs({ ...showFilterInputs, orderCode: false });
                                }}
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </th>
                    <th>Ghi chú</th>
                    <th>Thời gian còn lại</th>
                    <th>Tiến độ hoàn thành</th>
                    <th>Tiền kèo thực nhận</th>
                    <th>Tiền đền</th>
                    <th>Công thực nhận</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingDonHang ? (
                    <tr>
                      <td colSpan="16" style={{ textAlign: 'center', padding: '20px' }}>
                        Đang tải...
                      </td>
                    </tr>
                  ) : filteredBetList.length === 0 ? (
                    <tr>
                      <td colSpan="16" style={{ textAlign: 'center', padding: '20px' }}>
                        Chưa có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    filteredBetList.map((bet) => (
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
                              
                              // Nếu chọn status "HỦY BỎ", hiển thị modal để nhập ActualReceivedCNY
                              if (newStatus === 'HỦY BỎ') {
                                setCancelModalData({
                                  betId: betId,
                                  oldStatus: bet.status,
                                  actualReceivedCNY: '',
                                });
                                setShowCancelModal(true);
                                // Không cập nhật state, select sẽ tự động giữ giá trị cũ (controlled component)
                                return;
                              }
                              
                              // Nếu chọn status "ĐỀN", hiển thị modal để nhập CompensationCNY
                              if (newStatus === 'ĐỀN') {
                                setCompensationModalData({
                                  betId: betId,
                                  oldStatus: bet.status,
                                  compensationCNY: '',
                                });
                                setShowCompensationModal(true);
                                // Không cập nhật state, select sẽ tự động giữ giá trị cũ (controlled component)
                                return;
                              }
                              
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
                                  const actualAmount = (newStatus === 'DONE' || newStatus === 'HỦY BỎ' || newStatus === 'ĐỀN')
                                    ? (response.data.actual_amount_cny || 0)
                                    : 0;
                                  
                                  // Cập nhật lại state với dữ liệu từ backend
                                  // - Nếu status = DONE: ActualReceivedCNY = WebBetAmountCNY (backend đã tự động set)
                                  // - Nếu status = HỦY BỎ: ActualReceivedCNY là giá trị đã nhập
                                  // - Nếu status = ĐỀN: CompensationCNY là giá trị đã nhập, ActualAmountCNY sẽ là âm (trừ tiền)
                                  // - Nếu đổi từ DONE, HỦY BỎ, hoặc ĐỀN sang status khác: các giá trị sẽ được reset về 0 (backend đã reset)
                                  setBetList(prevList => 
                                    prevList.map(item => {
                                      if (item.id === betId) {
                                        return {
                                          ...item,
                                          status: newStatus,
                                          actualAmount: actualAmount,
                                          // Luôn cập nhật actualReceived từ backend
                                          // Backend sẽ tự động reset về 0 nếu đổi từ DONE hoặc HỦY BỎ sang status khác
                                          actualReceived: response.data.actual_received_cny !== undefined 
                                            ? response.data.actual_received_cny 
                                            : (newStatus !== 'HỦY BỎ' && newStatus !== 'DONE' ? 0 : item.actualReceived),
                                          compensation: response.data.compensation_cny !== undefined 
                                            ? response.data.compensation_cny 
                                            : (newStatus !== 'ĐỀN' ? 0 : item.compensation),
                                        };
                                      }
                                      return item;
                                    })
                                  );

                                  // Wallet đã được cập nhật (cả khi DONE và khi đổi từ DONE sang khác)
                                  // Reload lại danh sách wallet và đơn hàng để hiển thị số tiền mới và cập nhật tab
                                  console.log('💰 Status đã thay đổi, reload lại danh sách wallet và đơn hàng...');
                                  setTimeout(() => {
                                    fetchWalletList();
                                    fetchDonHangList(); // Reload danh sách đơn hàng để cập nhật tab
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
                            <option value="Đơn hàng mới">Đơn hàng mới</option>
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
                        <td>{((bet.status === 'DONE' || bet.status === 'HỦY BỎ' || bet.status === 'ĐỀN') && bet.actualAmount) ? bet.actualAmount.toString() : ''}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleEditBet(bet)}
                              style={{
                                padding: '6px 12px',
                                background: '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                transition: 'background 0.2s ease'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#5568d3'}
                              onMouseLeave={(e) => e.target.style.background = '#667eea'}
                            >
                              ✏️ Chỉnh sửa
                            </button>
                            <button
                              onClick={() => handleDeleteBet(bet.id)}
                              style={{
                                padding: '6px 12px',
                                background: '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                transition: 'background 0.2s ease'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#d32f2f'}
                              onMouseLeave={(e) => e.target.style.background = '#f44336'}
                            >
                              🗑️ Xóa
                            </button>
                          </div>
                        </td>
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
                  className={`rut-tien-sub-tab ${activeRutTienTab === 'lich-su-rut' ? 'active' : ''}`}
                  onClick={() => setActiveRutTienTab('lich-su-rut')}
                >
                  Lịch sử rút
                </button>
                <button
                  className={`rut-tien-sub-tab ${activeRutTienTab === 'lich-su-nap' ? 'active' : ''}`}
                  onClick={() => setActiveRutTienTab('lich-su-nap')}
                >
                  Lịch sử nạp
                </button>
              </div>
              <div className="rut-tien-total-balance">
                <span className="total-balance-label">Tổng SD hiện tại:</span>
                <span className="total-balance-value">
                  {formatTotalBalance(totalCurrentBalanceVND)}
                </span>
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
                      const userName = item.user?.name || '';
                      const totalReceivedCNY = item.wallet?.total_received_cny || 0;
                      const totalDepositVND = item.wallet?.total_deposit_vnd || 0;
                      const totalWithdrawnVND = item.wallet?.total_withdrawn_vnd || 0;
                      const currentBalanceVND = item.wallet?.current_balance_vnd || 0;
                      
                      const formatNumber = (num) => {
                        if (num === 0 || num === null || num === undefined) return '0';
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
            ) : activeRutTienTab === 'lich-su-rut' ? (
              <div className="bet-list-table-wrapper">
                {isLoadingHistoryNapRut ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                    Đang tải lịch sử...
                  </div>
                ) : (
                  <table className="bet-list-table wallet-table">
                    <thead>
                      <tr>
                        <th>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>Thời gian</span>
                              <button
                                className="filter-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowWithdrawalFilterInputs((prev) => ({ ...prev, month: !prev.month }));
                                }}
                                title="Lọc theo tháng"
                              >
                                🔍
                              </button>
                            </div>
                            {showWithdrawalFilterInputs.month && (
                              <input
                                type="month"
                                value={withdrawalFilters.month}
                                onChange={(e) =>
                                  setWithdrawalFilters({ ...withdrawalFilters, month: e.target.value })
                                }
                                onBlur={() =>
                                  setTimeout(
                                    () =>
                                      setShowWithdrawalFilterInputs((prev) => ({ ...prev, month: false })),
                                    150
                                  )
                                }
                                placeholder="Chọn tháng"
                                className="inline-filter-input"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            {showWithdrawalFilterInputs.month && withdrawalMonthOptions.length > 0 && (
                              <div className="inline-suggestions">
                                {withdrawalMonthOptions.map((opt) => (
                                  <div
                                    key={opt}
                                    className="inline-suggestion-item"
                                    onMouseDown={() => {
                                      setWithdrawalFilters({ ...withdrawalFilters, month: opt });
                                      setShowWithdrawalFilterInputs((prev) => ({ ...prev, month: false }));
                                    }}
                                  >
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </th>
                        <th>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>Tên người rút</span>
                              <button
                                className="filter-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowWithdrawalFilterInputs((prev) => ({ ...prev, name: !prev.name }));
                                }}
                                title="Lọc theo tên"
                              >
                                🔍
                              </button>
                            </div>
                            {showWithdrawalFilterInputs.name && (
                              <input
                                type="text"
                                value={withdrawalFilters.name}
                                onChange={(e) =>
                                  setWithdrawalFilters({ ...withdrawalFilters, name: e.target.value })
                                }
                                onBlur={() =>
                                  setTimeout(
                                    () =>
                                      setShowWithdrawalFilterInputs((prev) => ({ ...prev, name: false })),
                                    150
                                  )
                                }
                                placeholder="Nhập tên"
                                className="inline-filter-input"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            {showWithdrawalFilterInputs.name && withdrawalNameOptions.length > 0 && (
                              <div className="inline-suggestions">
                                {withdrawalNameOptions.map((opt) => (
                                  <div
                                    key={opt}
                                    className="inline-suggestion-item"
                                    onMouseDown={() => {
                                      setWithdrawalFilters({ ...withdrawalFilters, name: opt });
                                      setShowWithdrawalFilterInputs((prev) => ({ ...prev, name: false }));
                                    }}
                                  >
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </th>
                        <th>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>Số tiền (VND)</span>
                              <button
                                className="filter-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowWithdrawalFilterInputs((prev) => ({
                                    ...prev,
                                    minAmount: !prev.minAmount,
                                  }));
                                }}
                                title="Lọc theo số tiền"
                              >
                                🔍
                              </button>
                            </div>
                            {showWithdrawalFilterInputs.minAmount && (
                              <input
                                type="number"
                                min="0"
                                value={withdrawalFilters.minAmount}
                                onChange={(e) =>
                                  setWithdrawalFilters({ ...withdrawalFilters, minAmount: e.target.value })
                                }
                                onBlur={() =>
                                  setTimeout(
                                    () =>
                                      setShowWithdrawalFilterInputs((prev) => ({ ...prev, minAmount: false })),
                                    150
                                  )
                                }
                                placeholder="≥ số tiền"
                                className="inline-filter-input"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            {showWithdrawalFilterInputs.minAmount && withdrawalAmountOptions.length > 0 && (
                              <div className="inline-suggestions">
                                {withdrawalAmountOptions.map((opt) => (
                                  <div
                                    key={opt}
                                    className="inline-suggestion-item"
                                    onMouseDown={() => {
                                      setWithdrawalFilters({ ...withdrawalFilters, minAmount: opt.toString() });
                                      setShowWithdrawalFilterInputs((prev) => ({ ...prev, minAmount: false }));
                                    }}
                                  >
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                        {withdrawalHistory
                          .filter((withdrawal) => {
                            // Lọc theo tên
                            if (
                              withdrawalFilters.name &&
                              !(withdrawal.user_name || '')
                                .toLowerCase()
                                .includes(withdrawalFilters.name.toLowerCase())
                            ) {
                              return false;
                            }

                            // Lọc theo tháng (YYYY-MM từ created_at)
                            if (withdrawalFilters.month) {
                              const d = new Date(withdrawal.created_at);
                              if (!isNaN(d.getTime())) {
                                const monthKey = `${d.getFullYear()}-${String(
                                  d.getMonth() + 1
                                ).padStart(2, '0')}`;
                                if (monthKey !== withdrawalFilters.month) {
                                  return false;
                                }
                              }
                            }

                            // Lọc theo minAmount
                            if (withdrawalFilters.minAmount) {
                              const minVal = parseFloat(withdrawalFilters.minAmount);
                              if (!isNaN(minVal) && withdrawal.amount_vnd < minVal) {
                                return false;
                              }
                            }

                            return true;
                          })
                          .map((withdrawal) => {
                            const formatNumber = (num) => {
                              if (num === 0 || num === null || num === undefined) return '0';
                              const parts = num.toString().split('.');
                              const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                              return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
                            };
                            
                            return (
                              <tr key={withdrawal.id}>
                                <td>{formatDateTime(withdrawal.created_at)}</td>
                                <td>{withdrawal.user_name || 'N/A'}</td>
                                <td>{formatNumber(withdrawal.amount_vnd)}</td>
                                <td>{withdrawal.notes || '-'}</td>
                              </tr>
                            );
                          })}
                        {withdrawalHistory.length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                              Chưa có lịch sử rút tiền
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                )}
              </div>
            ) : activeRutTienTab === 'lich-su-nap' ? (
              <div className="bet-list-table-wrapper">
                {isLoadingHistoryNapRut ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                    Đang tải lịch sử...
                  </div>
                ) : (
                  <table className="bet-list-table wallet-table">
                    <thead>
                      <tr>
                        <th>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>Thời gian</span>
                              <button
                                className="filter-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDepositFilterInputs((prev) => ({ ...prev, month: !prev.month }));
                                }}
                                title="Lọc theo tháng"
                              >
                                🔍
                              </button>
                            </div>
                            {showDepositFilterInputs.month && (
                              <input
                                type="month"
                                value={depositFilters.month}
                                onChange={(e) =>
                                  setDepositFilters({ ...depositFilters, month: e.target.value })
                                }
                                onBlur={() =>
                                  setTimeout(
                                    () => setShowDepositFilterInputs((prev) => ({ ...prev, month: false })),
                                    150
                                  )
                                }
                                placeholder="Chọn tháng"
                                className="inline-filter-input"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            {showDepositFilterInputs.month && depositMonthOptions.length > 0 && (
                              <div className="inline-suggestions">
                                {depositMonthOptions.map((opt) => (
                                  <div
                                    key={opt}
                                    className="inline-suggestion-item"
                                    onMouseDown={() => {
                                      setDepositFilters({ ...depositFilters, month: opt });
                                      setShowDepositFilterInputs((prev) => ({ ...prev, month: false }));
                                    }}
                                  >
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </th>
                        <th>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>Tên người nạp</span>
                              <button
                                className="filter-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDepositFilterInputs((prev) => ({ ...prev, name: !prev.name }));
                                }}
                                title="Lọc theo tên"
                              >
                                🔍
                              </button>
                            </div>
                            {showDepositFilterInputs.name && (
                              <input
                                type="text"
                                value={depositFilters.name}
                                onChange={(e) =>
                                  setDepositFilters({ ...depositFilters, name: e.target.value })
                                }
                                onBlur={() =>
                                  setTimeout(
                                    () => setShowDepositFilterInputs((prev) => ({ ...prev, name: false })),
                                    150
                                  )
                                }
                                placeholder="Nhập tên"
                                className="inline-filter-input"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            {showDepositFilterInputs.name && depositNameOptions.length > 0 && (
                              <div className="inline-suggestions">
                                {depositNameOptions.map((opt) => (
                                  <div
                                    key={opt}
                                    className="inline-suggestion-item"
                                    onMouseDown={() => {
                                      setDepositFilters({ ...depositFilters, name: opt });
                                      setShowDepositFilterInputs((prev) => ({ ...prev, name: false }));
                                    }}
                                  >
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </th>
                        <th>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>Số tiền (VND)</span>
                              <button
                                className="filter-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDepositFilterInputs((prev) => ({ ...prev, minAmount: !prev.minAmount }));
                                }}
                                title="Lọc theo số tiền"
                              >
                                🔍
                              </button>
                            </div>
                            {showDepositFilterInputs.minAmount && (
                              <input
                                type="number"
                                min="0"
                                value={depositFilters.minAmount}
                                onChange={(e) =>
                                  setDepositFilters({ ...depositFilters, minAmount: e.target.value })
                                }
                                onBlur={() =>
                                  setTimeout(
                                    () =>
                                      setShowDepositFilterInputs((prev) => ({ ...prev, minAmount: false })),
                                    150
                                  )
                                }
                                placeholder="≥ số tiền"
                                className="inline-filter-input"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            {showDepositFilterInputs.minAmount && depositAmountOptions.length > 0 && (
                              <div className="inline-suggestions">
                                {depositAmountOptions.map((opt) => (
                                  <div
                                    key={opt}
                                    className="inline-suggestion-item"
                                    onMouseDown={() => {
                                      setDepositFilters({ ...depositFilters, minAmount: opt.toString() });
                                      setShowDepositFilterInputs((prev) => ({ ...prev, minAmount: false }));
                                    }}
                                  >
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                        {depositHistory
                          .filter((deposit) => {
                            // Lọc theo tên
                            if (
                              depositFilters.name &&
                              !(deposit.user_name || '')
                                .toLowerCase()
                                .includes(depositFilters.name.toLowerCase())
                            ) {
                              return false;
                            }

                            // Lọc theo tháng (YYYY-MM từ created_at)
                            if (depositFilters.month) {
                              const d = new Date(deposit.created_at);
                              if (!isNaN(d.getTime())) {
                                const monthKey = `${d.getFullYear()}-${String(
                                  d.getMonth() + 1
                                ).padStart(2, '0')}`;
                                if (monthKey !== depositFilters.month) {
                                  return false;
                                }
                              }
                            }

                            // Lọc theo minAmount
                            if (depositFilters.minAmount) {
                              const minVal = parseFloat(depositFilters.minAmount);
                              if (!isNaN(minVal) && deposit.amount_vnd < minVal) {
                                return false;
                              }
                            }

                            return true;
                          })
                          .map((deposit) => {
                            const formatNumber = (num) => {
                              if (num === 0 || num === null || num === undefined) return '0';
                              const parts = num.toString().split('.');
                              const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                              return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
                            };
                            
                            return (
                              <tr key={deposit.id}>
                                <td>{formatDateTime(deposit.created_at)}</td>
                                <td>{deposit.user_name || 'N/A'}</td>
                                <td>{formatNumber(deposit.amount_vnd)}</td>
                                <td>{deposit.notes || '-'}</td>
                              </tr>
                            );
                          })}
                        {depositHistory.length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                              Chưa có lịch sử nạp tiền
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                )}
              </div>
            ) : null}
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

      {/* Modal chỉnh sửa đơn hàng */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => {
          setShowEditModal(false);
          setEditingBetId(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Chỉnh sửa đơn hàng</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingBetId(null);
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateDonHang} className="create-don-hang-form">
              <div className="form-group">
                <label htmlFor="edit_user_name">Tên <span className="required">*</span></label>
                <div className="autocomplete-wrapper" ref={userInputRef}>
                  <input
                    type="text"
                    id="edit_user_name"
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
                <label htmlFor="edit_task_code">Nhiệm vụ <span className="required">*</span></label>
                <input
                  type="text"
                  id="edit_task_code"
                  name="task_code"
                  value={formData.task_code}
                  onChange={handleFormChange}
                  required
                  placeholder="VD: kc4-96-ct, lb3-kc1"
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit_bet_type">Loại kèo <span className="required">*</span></label>
                <div className="autocomplete-wrapper" ref={betTypeInputRef}>
                  <input
                    type="text"
                    id="edit_bet_type"
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
                <label htmlFor="edit_web_bet_amount_cny">Tiền kèo web ¥ <span className="required">*</span></label>
                <input
                  type="text"
                  id="edit_web_bet_amount_cny"
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
                <label htmlFor="edit_order_code">Mã đơn hàng</label>
                <input
                  type="text"
                  id="edit_order_code"
                  name="order_code"
                  value={formData.order_code}
                  onChange={handleFormChange}
                  placeholder="Tùy chọn"
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit_notes">Ghi chú</label>
                <input
                  type="text"
                  id="edit_notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  placeholder="Tùy chọn"
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit_completed_hours">Thời gian hoàn thành (giờ)</label>
                <input
                  type="text"
                  id="edit_completed_hours"
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
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingBetId(null);
                  }}
                  disabled={isUpdating}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Đang cập nhật...' : 'Xác nhận cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

              <div className="form-group">
                <label htmlFor="nap-tien-notes">Ghi chú</label>
                <textarea
                  id="nap-tien-notes"
                  value={napTienFormData.notes}
                  onChange={(e) =>
                    setNapTienFormData({ ...napTienFormData, notes: e.target.value })
                  }
                  rows={3}
                />
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

              <div className="form-group">
                <label htmlFor="rut-tien-notes">Ghi chú</label>
                <textarea
                  id="rut-tien-notes"
                  value={rutTienFormData.notes}
                  onChange={(e) =>
                    setRutTienFormData({ ...rutTienFormData, notes: e.target.value })
                  }
                  rows={3}
                />
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

      {/* Modal nhập ActualReceivedCNY khi chọn status "Hủy bỏ" */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Hủy bỏ đơn hàng</h2>
              <button
                className="modal-close"
                onClick={() => setShowCancelModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCancelStatus} className="create-don-hang-form">
              <div className="form-group">
                <label htmlFor="cancel-actual-received-cny">
                  Tiền kèo thực nhận ¥ <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="cancel-actual-received-cny"
                  value={cancelModalData.actualReceivedCNY}
                  onChange={(e) => {
                    // Cho phép số và dấu chấm (decimal)
                    const value = e.target.value.replace(/[^\d.]/g, '');
                    // Chỉ cho phép một dấu chấm
                    const parts = value.split('.');
                    const formatted = parts.length > 2 
                      ? parts[0] + '.' + parts.slice(1).join('')
                      : value;
                    setCancelModalData({
                      ...cancelModalData,
                      actualReceivedCNY: formatted
                    });
                  }}
                  required
                  placeholder="Nhập số tiền thực nhận (ví dụ: 100.5 hoặc 0)"
                  autoComplete="off"
                  inputMode="decimal"
                />
                <div style={{ 
                  marginTop: '4px', 
                  fontSize: '12px', 
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  Nếu nhập 0, Công thực nhận sẽ là 0
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCancelModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                >
                  Xác nhận hủy bỏ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal nhập CompensationCNY khi chọn status "Đền" */}
      {showCompensationModal && (
        <div className="modal-overlay" onClick={() => setShowCompensationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Đền đơn hàng</h2>
              <button
                className="modal-close"
                onClick={() => setShowCompensationModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCompensationStatus} className="create-don-hang-form">
              <div className="form-group">
                <label htmlFor="compensation-cny">
                  Tiền đền (CNY) <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="compensation-cny"
                  value={compensationModalData.compensationCNY}
                  onChange={(e) => {
                    // Cho phép số và dấu chấm (decimal)
                    const value = e.target.value.replace(/[^\d.]/g, '');
                    // Chỉ cho phép một dấu chấm
                    const parts = value.split('.');
                    const formatted = parts.length > 2 
                      ? parts[0] + '.' + parts.slice(1).join('')
                      : value;
                    setCompensationModalData({
                      ...compensationModalData,
                      compensationCNY: formatted
                    });
                  }}
                  required
                  placeholder="Nhập số tiền đền (ví dụ: 100.5)"
                  autoComplete="off"
                  inputMode="decimal"
                />
                <div style={{ 
                  marginTop: '4px', 
                  fontSize: '12px', 
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  Tiền đền phải lớn hơn 0. Nhập bao nhiêu sẽ trừ bấy nhiêu từ wallet
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCompensationModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                >
                  Xác nhận đền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal chi tiết lịch sử chỉnh sửa */}
      {showHistoryDetailModal && selectedHistory && (
        <div className="modal-overlay" onClick={() => setShowHistoryDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>Chi tiết lịch sử chỉnh sửa</h2>
              <button 
                className="modal-close"
                onClick={() => setShowHistoryDetailModal(false)}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <strong>Hành động:</strong>{' '}
                <span className={`status-badge ${selectedHistory.action === 'UPDATE' ? 'history-update' : 'history-delete'}`}>
                  {selectedHistory.action}
                </span>
              </div>
              {(() => {
                try {
                  // Lấy mã đơn hàng (order_code) từ old_data hoặc new_data
                  // Backend serialize BetReceipt với key "order_code" (từ json tag)
                  let orderCode = '';
                  if (selectedHistory.new_data) {
                    const newData = typeof selectedHistory.new_data === 'string' ? JSON.parse(selectedHistory.new_data) : selectedHistory.new_data;
                    orderCode = newData.order_code || '';
                  }
                  if (!orderCode && selectedHistory.old_data) {
                    const oldData = typeof selectedHistory.old_data === 'string' ? JSON.parse(selectedHistory.old_data) : selectedHistory.old_data;
                    orderCode = oldData.order_code || '';
                  }
                  // Chỉ hiển thị order_code, không fallback về bet_receipt_id
                  // Nếu order_code trống, hiển thị "(Trống)"
                  const displayValue = orderCode || '(Trống)';
                  return (
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Mã đơn hàng:</strong> {displayValue}
                    </div>
                  );
                } catch (e) {
                  console.error('Error parsing order_code in detail modal:', e);
                  return (
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Mã đơn hàng:</strong> (Trống)
                    </div>
                  );
                }
              })()}
              <div style={{ marginBottom: '10px' }}>
                <strong>Thời gian:</strong> {formatDateTime(selectedHistory.created_at)}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Người thực hiện:</strong> {selectedHistory.performed_by_name || 'N/A'}
              </div>
              {selectedHistory.description && (
                <div style={{ marginBottom: '20px' }}>
                  <strong>Mô tả:</strong> {selectedHistory.description}
                </div>
              )}

              {selectedHistory.action === 'UPDATE' && (selectedHistory.old_data || selectedHistory.new_data) && (
                <div style={{ marginTop: '20px' }}>
                  <h3 style={{ marginBottom: '15px' }}>Chi tiết chỉnh sửa:</h3>
                  <div style={{ 
                    background: '#f5f5f5', 
                    padding: '15px', 
                    borderRadius: '8px',
                    maxHeight: '500px',
                    overflowX: 'auto',
                    overflowY: 'auto'
                  }}>
                    {(() => {
                      try {
                        const oldData = selectedHistory.old_data ? JSON.parse(selectedHistory.old_data) : {};
                        const newData = selectedHistory.new_data ? JSON.parse(selectedHistory.new_data) : {};
                        const changedFields = selectedHistory.changed_fields ? JSON.parse(selectedHistory.changed_fields) : {};
                        
                        // Danh sách các trường đã thay đổi
                        const changedFieldKeys = Object.keys(changedFields);
                        
                        // Helper function để map dữ liệu sang format giống bet
                        const mapToBetFormat = (data) => ({
                          stt: data.stt || '',
                          name: data.user_name || '',
                          receivedAt: data.received_at || '',
                          completedHours: data.completed_hours || '',
                          task: data.task_code || '',
                          betType: data.bet_type || '',
                          webBet: data.web_bet_amount_cny || 0,
                          orderCode: data.order_code || '',
                          note: data.notes || '',
                          timeRemainingFormatted: data.time_remaining_formatted || '',
                          timeRemainingHours: data.time_remaining_hours || '',
                          status: data.status || '',
                          actualReceived: data.actual_received_cny || 0,
                          compensation: data.compensation_cny || 0,
                          actualAmount: data.actual_amount_cny || 0,
                        });
                        
                        const oldBet = mapToBetFormat(oldData);
                        const newBet = mapToBetFormat(newData);
                        
                        // Helper function để check xem trường có bị thay đổi không
                        const isChanged = (fieldKey) => {
                          // Map tên trường từ format bet sang format database
                          const fieldMapping = {
                            'stt': 'stt',
                            'name': 'user_name',
                            'receivedAt': 'received_at',
                            'completedHours': 'completed_hours',
                            'task': 'task_code',
                            'betType': 'bet_type',
                            'webBet': 'web_bet_amount_cny',
                            'orderCode': 'order_code',
                            'note': 'notes',
                            'timeRemainingFormatted': 'time_remaining_formatted',
                            'timeRemainingHours': 'time_remaining_hours',
                            'status': 'status',
                            'actualReceived': 'actual_received_cny',
                            'compensation': 'compensation_cny',
                            'actualAmount': 'actual_amount_cny',
                          };
                          return changedFieldKeys.includes(fieldMapping[fieldKey] || fieldKey);
                        };
                        
                        // Helper function để format cell value
                        const formatCellValue = (value, isDate = false) => {
                          if (value === null || value === undefined || value === '') return '';
                          if (isDate && value) {
                            return new Date(value).toLocaleString('vi-VN');
                          }
                          return String(value);
                        };
                        
                        return (
                          <div>
                            {/* Hàng "Trước khi sửa" */}
                            <div style={{ marginBottom: '20px' }}>
                              <h4 style={{ marginBottom: '10px', color: '#f44336', fontSize: '14px', fontWeight: '600' }}>
                                Trước khi sửa:
                              </h4>
                              <table className="bet-list-table" style={{ width: '100%', fontSize: '11px' }}>
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
                                  <tr>
                                    <td style={{ color: isChanged('stt') ? '#f44336' : 'inherit', fontWeight: isChanged('stt') ? '600' : 'normal' }}>{oldBet.stt}</td>
                                    <td style={{ color: isChanged('name') ? '#f44336' : 'inherit', fontWeight: isChanged('name') ? '600' : 'normal' }}>{oldBet.name}</td>
                                    <td style={{ color: isChanged('receivedAt') ? '#f44336' : 'inherit', fontWeight: isChanged('receivedAt') ? '600' : 'normal' }}>{formatCellValue(oldBet.receivedAt, true)}</td>
                                    <td style={{ color: isChanged('completedHours') ? '#f44336' : 'inherit', fontWeight: isChanged('completedHours') ? '600' : 'normal' }}>{oldBet.completedHours || ''}</td>
                                    <td style={{ color: isChanged('task') ? '#f44336' : 'inherit', fontWeight: isChanged('task') ? '600' : 'normal' }}>{oldBet.task}</td>
                                    <td style={{ color: isChanged('betType') ? '#f44336' : 'inherit', fontWeight: isChanged('betType') ? '600' : 'normal' }}>{oldBet.betType}</td>
                                    <td style={{ color: isChanged('webBet') ? '#f44336' : 'inherit', fontWeight: isChanged('webBet') ? '600' : 'normal' }}>{oldBet.webBet}</td>
                                    <td style={{ color: isChanged('orderCode') ? '#f44336' : 'inherit', fontWeight: isChanged('orderCode') ? '600' : 'normal' }}>{oldBet.orderCode || ''}</td>
                                    <td style={{ color: isChanged('note') ? '#f44336' : 'inherit', fontWeight: isChanged('note') ? '600' : 'normal' }}>{oldBet.note}</td>
                                    <td style={{ color: isChanged('timeRemainingFormatted') || isChanged('timeRemainingHours') ? '#f44336' : 'inherit', fontWeight: (isChanged('timeRemainingFormatted') || isChanged('timeRemainingHours')) ? '600' : 'normal' }}>{oldBet.status !== 'DONE' ? (oldBet.timeRemainingFormatted || oldBet.timeRemainingHours || '') : ''}</td>
                                    <td>
                                      <span className={`status-badge ${getStatusClass(oldBet.status)}`} style={{ color: isChanged('status') ? '#f44336' : 'inherit', fontWeight: isChanged('status') ? '600' : 'normal' }}>
                                        {oldBet.status}
                                      </span>
                                    </td>
                                    <td style={{ color: isChanged('actualReceived') ? '#f44336' : 'inherit', fontWeight: isChanged('actualReceived') ? '600' : 'normal' }}>{oldBet.actualReceived || ''}</td>
                                    <td style={{ color: isChanged('compensation') ? '#f44336' : 'inherit', fontWeight: isChanged('compensation') ? '600' : 'normal' }}>{oldBet.compensation || ''}</td>
                                    <td style={{ color: isChanged('actualAmount') ? '#f44336' : 'inherit', fontWeight: isChanged('actualAmount') ? '600' : 'normal' }}>{((oldBet.status === 'DONE' || oldBet.status === 'HỦY BỎ' || oldBet.status === 'ĐỀN') && oldBet.actualAmount) ? oldBet.actualAmount.toString() : ''}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            
                            {/* Hàng "Sau khi sửa" */}
                            <div>
                              <h4 style={{ marginBottom: '10px', color: '#4caf50', fontSize: '14px', fontWeight: '600' }}>
                                Sau khi sửa:
                              </h4>
                              <table className="bet-list-table" style={{ width: '100%', fontSize: '11px' }}>
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
                                  <tr>
                                    <td style={{ color: isChanged('stt') ? '#f44336' : 'inherit', fontWeight: isChanged('stt') ? '600' : 'normal' }}>{newBet.stt}</td>
                                    <td style={{ color: isChanged('name') ? '#f44336' : 'inherit', fontWeight: isChanged('name') ? '600' : 'normal' }}>{newBet.name}</td>
                                    <td style={{ color: isChanged('receivedAt') ? '#f44336' : 'inherit', fontWeight: isChanged('receivedAt') ? '600' : 'normal' }}>{formatCellValue(newBet.receivedAt, true)}</td>
                                    <td style={{ color: isChanged('completedHours') ? '#f44336' : 'inherit', fontWeight: isChanged('completedHours') ? '600' : 'normal' }}>{newBet.completedHours || ''}</td>
                                    <td style={{ color: isChanged('task') ? '#f44336' : 'inherit', fontWeight: isChanged('task') ? '600' : 'normal' }}>{newBet.task}</td>
                                    <td style={{ color: isChanged('betType') ? '#f44336' : 'inherit', fontWeight: isChanged('betType') ? '600' : 'normal' }}>{newBet.betType}</td>
                                    <td style={{ color: isChanged('webBet') ? '#f44336' : 'inherit', fontWeight: isChanged('webBet') ? '600' : 'normal' }}>{newBet.webBet}</td>
                                    <td style={{ color: isChanged('orderCode') ? '#f44336' : 'inherit', fontWeight: isChanged('orderCode') ? '600' : 'normal' }}>{newBet.orderCode || ''}</td>
                                    <td style={{ color: isChanged('note') ? '#f44336' : 'inherit', fontWeight: isChanged('note') ? '600' : 'normal' }}>{newBet.note}</td>
                                    <td style={{ color: isChanged('timeRemainingFormatted') || isChanged('timeRemainingHours') ? '#f44336' : 'inherit', fontWeight: (isChanged('timeRemainingFormatted') || isChanged('timeRemainingHours')) ? '600' : 'normal' }}>{newBet.status !== 'DONE' ? (newBet.timeRemainingFormatted || newBet.timeRemainingHours || '') : ''}</td>
                                    <td>
                                      <span className={`status-badge ${getStatusClass(newBet.status)}`} style={{ color: isChanged('status') ? '#f44336' : 'inherit', fontWeight: isChanged('status') ? '600' : 'normal' }}>
                                        {newBet.status}
                                      </span>
                                    </td>
                                    <td style={{ color: isChanged('actualReceived') ? '#f44336' : 'inherit', fontWeight: isChanged('actualReceived') ? '600' : 'normal' }}>{newBet.actualReceived || ''}</td>
                                    <td style={{ color: isChanged('compensation') ? '#f44336' : 'inherit', fontWeight: isChanged('compensation') ? '600' : 'normal' }}>{newBet.compensation || ''}</td>
                                    <td style={{ color: isChanged('actualAmount') ? '#f44336' : 'inherit', fontWeight: isChanged('actualAmount') ? '600' : 'normal' }}>{((newBet.status === 'DONE' || newBet.status === 'HỦY BỎ' || newBet.status === 'ĐỀN') && newBet.actualAmount) ? newBet.actualAmount.toString() : ''}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      } catch (e) {
                        console.error('Error parsing history data:', e);
                        return <div style={{ color: '#666', fontSize: '13px', padding: '20px', textAlign: 'center' }}>Không thể hiển thị thông tin chỉnh sửa</div>;
                      }
                    })()}
                  </div>
                </div>
              )}

              {selectedHistory.action === 'DELETE' && selectedHistory.old_data && (
                <div style={{ marginTop: '20px' }}>
                  <h3 style={{ marginBottom: '15px', color: '#f44336' }}>Thông tin đơn hàng đã bị xóa:</h3>
                  <div style={{ 
                    background: '#ffebee', 
                    padding: '15px', 
                    borderRadius: '8px',
                    border: '1px solid #f44336',
                    maxHeight: '500px',
                    overflowX: 'auto',
                    overflowY: 'auto'
                  }}>
                    {(() => {
                      try {
                        const oldData = JSON.parse(selectedHistory.old_data);
                        
                        // Map dữ liệu từ old_data sang format giống bet trong danh sách
                        const deletedBet = {
                          stt: oldData.stt || '',
                          name: oldData.user_name || '',
                          receivedAt: oldData.received_at || '',
                          completedHours: oldData.completed_hours || '',
                          task: oldData.task_code || '',
                          betType: oldData.bet_type || '',
                          webBet: oldData.web_bet_amount_cny || 0,
                          orderCode: oldData.order_code || '',
                          note: oldData.notes || '',
                          timeRemainingFormatted: oldData.time_remaining_formatted || '',
                          timeRemainingHours: oldData.time_remaining_hours || '',
                          status: oldData.status || '',
                          actualReceived: oldData.actual_received_cny || 0,
                          compensation: oldData.compensation_cny || 0,
                          actualAmount: oldData.actual_amount_cny || 0,
                        };
                        
                        return (
                          <table className="bet-list-table" style={{ width: '100%', fontSize: '11px' }}>
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
                              <tr>
                                <td>{deletedBet.stt}</td>
                                <td>{deletedBet.name}</td>
                                <td>{deletedBet.receivedAt ? new Date(deletedBet.receivedAt).toLocaleString('vi-VN') : ''}</td>
                                <td>{deletedBet.completedHours || ''}</td>
                                <td>{deletedBet.task}</td>
                                <td>{deletedBet.betType}</td>
                                <td>{deletedBet.webBet}</td>
                                <td>{deletedBet.orderCode || ''}</td>
                                <td>{deletedBet.note}</td>
                                <td>{deletedBet.status !== 'DONE' ? (deletedBet.timeRemainingFormatted || deletedBet.timeRemainingHours || '') : ''}</td>
                                <td>
                                  <span className={`status-badge ${getStatusClass(deletedBet.status)}`}>
                                    {deletedBet.status}
                                  </span>
                                </td>
                                <td>{deletedBet.actualReceived || ''}</td>
                                <td>{deletedBet.compensation || ''}</td>
                                <td>{((deletedBet.status === 'DONE' || deletedBet.status === 'HỦY BỎ' || deletedBet.status === 'ĐỀN') && deletedBet.actualAmount) ? deletedBet.actualAmount.toString() : ''}</td>
                              </tr>
                            </tbody>
                          </table>
                        );
                      } catch (e) {
                        return <div style={{ color: '#666', fontSize: '13px', padding: '20px', textAlign: 'center' }}>Không thể hiển thị thông tin đơn hàng</div>;
                      }
                    })()}
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid #e0e0e0', textAlign: 'right' }}>
              <button
                onClick={() => setShowHistoryDetailModal(false)}
                style={{
                  padding: '8px 16px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top tabs phía trên footer - chỉ hiển thị khi ở tab "Danh sách kèo" */}
      {activeTab === 'danh-sach-keo' && (
        <div className="admin-top-tabs">
          <div className="admin-top-tabs-inner">
            <button
              className={`rut-tien-sub-tab ${activeTopTab === 'trang-thong-tin' ? 'active' : ''}`}
              onClick={() => setActiveTopTab('trang-thong-tin')}
            >
              Trang thông tin
            </button>
            <button
              className={`rut-tien-sub-tab ${activeTopTab === 'lich-su-chinh-sua' ? 'active' : ''}`}
              onClick={() => setActiveTopTab('lich-su-chinh-sua')}
            >
              Lịch sử chỉnh sửa
            </button>
          </div>
        </div>
      )}

      <div className="admin-bottom-nav">
        <button
          className={`admin-nav-item ${activeTab === 'danh-sach-keo' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('danh-sach-keo');
            setActiveTopTab('trang-thong-tin'); // Reset về trang thông tin khi vào Danh sách kèo
          }}
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

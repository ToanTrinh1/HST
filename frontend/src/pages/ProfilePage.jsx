import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import BottomNavigation from '../components/BottomNavigation';
import { donHangAPI } from '../api/endpoints/don_hang.api';
import { walletAPI } from '../api/endpoints/wallet.api';
import { withdrawalAPI } from '../api/endpoints/withdrawal.api';
import { authAPI } from '../api';
import './ProfilePage.css';
import './HomePage.css';

const ProfilePage = () => {
  console.log('🎬 ProfilePage component render');
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
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [isLoadingWithdrawal, setIsLoadingWithdrawal] = useState(false);
  const [monthFilter, setMonthFilter] = useState(''); // Filter theo tháng cho đơn hàng đã xử lí
  const [showMonthFilter, setShowMonthFilter] = useState(false); // Hiển thị dropdown filter tháng
  const [monthlyTotal, setMonthlyTotal] = useState(0); // Tổng số tiền đã nhận theo tháng (từ backend)
  const [isLoadingMonthlyTotal, setIsLoadingMonthlyTotal] = useState(false); // Loading state cho monthly total
  const [showTaskModal, setShowTaskModal] = useState(false); // Hiển thị modal bảng nhiệm vụ
  const [showEditProfileModal, setShowEditProfileModal] = useState(false); // Modal chỉnh sửa profile
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const cropContainerRef = useRef(null);
  const cropImageRef = useRef(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showChangePasswordSection, setShowChangePasswordSection] = useState(false);
  const { user, logout, isAuthenticated, updateUser } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const errorMessageRef = useRef(null);
  const changePasswordSectionRef = useRef(null);
  const modalBodyRef = useRef(null);
  const previousDoneTasksRef = useRef([]); // Lưu danh sách doneTasks trước đó để so sánh

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
    setShowEditProfileModal(true);
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditPhoneNumber(user?.phone_number || '');
    setAvatarPreview(user?.avatar_url ? `http://localhost:8080${user.avatar_url}` : null);
    setSelectedAvatar(null);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setSuccessMessage('');
    setShowChangePasswordSection(false);
    setShowDropdown(false);
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setErrorMessage('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF)');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('File ảnh không được vượt quá 5MB');
        return;
      }

      setErrorMessage('');
      
      // Create preview và mở modal crop
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isMountedRef.current && reader.result) {
          setCropImage(reader.result);
          setCropScale(1);
          setCropPosition({ x: 0, y: 0 });
          setShowCropModal(true);
        }
      };
      reader.onerror = () => {
        if (isMountedRef.current) {
          setErrorMessage('Lỗi khi đọc file ảnh');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropZoom = (delta) => {
    setCropScale((prev) => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const handleCropMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - cropPosition.x,
      y: e.clientY - cropPosition.y,
    });
  };

  const handleCropMouseMove = useCallback((e) => {
    if (isDragging) {
      setCropPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleCropMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleCropImage = () => {
    if (!cropImage || !cropImageRef.current || !cropContainerRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 400; // Kích thước avatar cuối cùng
    canvas.width = size;
    canvas.height = size;

    const img = new Image();
    img.onload = () => {
      const container = cropContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const cropCircleSize = 250; // Kích thước crop circle
      
      // Tính toán kích thước hiển thị của ảnh
      const imgDisplayWidth = img.width * cropScale;
      const imgDisplayHeight = img.height * cropScale;
      
      // Center của container
      const containerCenterX = containerWidth / 2;
      const containerCenterY = containerHeight / 2;
      
      // Vị trí center của ảnh trong container (ảnh được center bằng CSS transform)
      const imgCenterX = containerCenterX + cropPosition.x;
      const imgCenterY = containerCenterY + cropPosition.y;
      
      // Vị trí góc trên trái của ảnh trong container
      const imgTopLeftX = imgCenterX - imgDisplayWidth / 2;
      const imgTopLeftY = imgCenterY - imgDisplayHeight / 2;
      
      // Vị trí của crop circle center trong container
      const cropCircleCenterX = containerCenterX;
      const cropCircleCenterY = containerCenterY;
      
      // Tính toán vị trí crop trong ảnh gốc
      const cropInImgX = cropCircleCenterX - imgTopLeftX;
      const cropInImgY = cropCircleCenterY - imgTopLeftY;
      
      // Chuyển đổi sang tọa độ ảnh gốc
      const sourceX = (cropInImgX / imgDisplayWidth) * img.width - (cropCircleSize / imgDisplayWidth) * img.width / 2;
      const sourceY = (cropInImgY / imgDisplayHeight) * img.height - (cropCircleSize / imgDisplayHeight) * img.height / 2;
      const sourceSize = (cropCircleSize / imgDisplayWidth) * img.width;
      
      // Giới hạn để không vượt quá ảnh gốc
      const finalSourceX = Math.max(0, Math.min(sourceX, img.width - sourceSize));
      const finalSourceY = Math.max(0, Math.min(sourceY, img.height - sourceSize));
      const finalSourceSize = Math.min(sourceSize, img.width - finalSourceX, img.height - finalSourceY);
      
      // Tạo clipping path hình tròn
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
      ctx.clip();
      
      // Vẽ ảnh đã crop
      ctx.drawImage(
        img,
        finalSourceX, finalSourceY, finalSourceSize, finalSourceSize,
        0, 0, size, size
      );

      // Lấy data URL
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          setSelectedAvatar(file);
          setAvatarPreview(URL.createObjectURL(blob));
          setShowCropModal(false);
          setCropImage(null);
        }
      }, 'image/jpeg', 0.9);
    };
    img.src = cropImage;
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      setErrorMessage('Vui lòng nhập tên');
      return;
    }

    // Validate phone chỉ chứa số (nếu có nhập)
    if (editPhoneNumber.trim() && !/^\d+$/.test(editPhoneNumber.trim())) {
      setErrorMessage('Số điện thoại chỉ được chứa chữ số');
      return;
    }

    setIsUpdatingProfile(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await authAPI.updateProfile(editName.trim(), editPhoneNumber.trim() || undefined);
      if (response.success) {
        updateUser(response.data);
        setSuccessMessage('Cập nhật thông tin thành công!');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setShowEditProfileModal(false);
          }
          timeoutRef.current = null;
        }, 1500);
      } else {
        setErrorMessage(response.error || 'Cập nhật thông tin thất bại');
      }
    } catch (error) {
      setErrorMessage('Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setErrorMessage('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu mới và xác nhận không khớp');
      return;
    }

    setIsChangingPassword(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await authAPI.changePassword(oldPassword, newPassword);
      if (response.success) {
        setSuccessMessage('Đổi mật khẩu thành công!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setShowEditProfileModal(false);
          }
          timeoutRef.current = null;
        }, 1500);
      } else {
        setErrorMessage(response.error || 'Đổi mật khẩu thất bại');
      }
    } catch (error) {
      setErrorMessage('Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUploadAvatar = async () => {
    if (!selectedAvatar) {
      setErrorMessage('Vui lòng chọn ảnh đại diện');
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await authAPI.uploadAvatar(selectedAvatar);
      if (response.success) {
        updateUser(response.data);
        setSuccessMessage('Cập nhật ảnh đại diện thành công!');
        setSelectedAvatar(null);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setShowEditProfileModal(false);
          }
          timeoutRef.current = null;
        }, 1500);
      } else {
        setErrorMessage(response.error || 'Upload avatar thất bại');
      }
    } catch (error) {
      setErrorMessage('Có lỗi xảy ra khi upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
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

  const fetchDoneTasks = async (isInitialLoad = false) => {
    // Kiểm tra component còn mounted không
    if (!isMountedRef.current) {
      console.log('⚠️ Component đã unmount, bỏ qua fetchDoneTasks');
      return;
    }
    
    console.log('📥 [fetchDoneTasks] Bắt đầu fetch, isInitialLoad:', isInitialLoad);
    
    setIsLoadingTasks(true);
    try {
      const res = await donHangAPI.layDanhSachDonHang(50, 0);
      if (res.success && Array.isArray(res.data)) {
        // Backend đã filter theo user hiện tại, chỉ cần filter theo status
        const done = res.data.filter((item) => item.status === 'DONE' || item.status === 'HỦY BỎ' || item.status === 'ĐỀN');
        
        console.log('📥 [fetchDoneTasks] Tổng số đơn hàng từ API:', res.data.length);
        console.log('📥 [fetchDoneTasks] Số đơn hàng đã hoàn thành (DONE/HỦY BỎ/ĐỀN):', done.length);
        
        // Debug: Log dữ liệu để kiểm tra các trường mới
        if (done.length > 0) {
          console.log('🔍 Sample task data:', done[0]);
          console.log('🔍 Account:', done[0].account);
          console.log('🔍 Password:', done[0].password);
          console.log('🔍 Region:', done[0].region);
          console.log('🔍 Completed_at:', done[0].completed_at);
          console.log('🔍 User name in task:', done[0].user_name || done[0].name);
        }

        // Cập nhật danh sách trước đó (chỉ khi component còn mounted)
        if (isMountedRef.current) {
          previousDoneTasksRef.current = [...done]; // Copy array để tránh reference issue
          setDoneTasks(done);
        }
      } else {
        if (isMountedRef.current) {
          setDoneTasks([]);
          previousDoneTasksRef.current = [];
        }
      }
    } catch (error) {
      console.error('❌ Lỗi khi lấy danh sách kèo DONE/HỦY BỎ/ĐỀN:', error);
      if (isMountedRef.current) {
        setDoneTasks([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingTasks(false);
      }
    }
  };

  const fetchPendingTasks = async () => {
    if (!isMountedRef.current) return;
    setIsLoadingPendingTasks(true);
    try {
      const res = await donHangAPI.layDanhSachDonHang(50, 0);
      if (!isMountedRef.current) return;
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
      if (isMountedRef.current) {
        setPendingTasks([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingPendingTasks(false);
      }
    }
  };

  const fetchInProgressTasks = async () => {
    if (!isMountedRef.current) return;
    setIsLoadingInProgressTasks(true);
    try {
      const res = await donHangAPI.layDanhSachDonHang(50, 0);
      if (!isMountedRef.current) return;
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
      if (isMountedRef.current) {
        setInProgressTasks([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingInProgressTasks(false);
      }
    }
  };

  const fetchCurrentUserBalance = async () => {
    if (!user?.id || !isMountedRef.current) {
      console.log('⚠️ Chưa có user ID hoặc component đã unmount, không thể lấy số dư');
      return;
    }

    setIsLoadingBalance(true);
    try {
      const response = await walletAPI.layDanhSachWallets(100, 0);
      if (!isMountedRef.current) return;
      if (response.success && Array.isArray(response.data)) {
        // Tìm wallet của user hiện tại
        const userWallet = response.data.find(
          (item) => item.user?.id === user.id || item.user_id === user.id
        );
        
        if (userWallet && userWallet.wallet) {
          const balance = userWallet.wallet.current_balance_vnd || 0;
          setCurrentBalance(balance);
          console.log('✅ Lấy số dư thành công:', balance);
        } else {
          console.log('⚠️ Không tìm thấy wallet cho user:', user.id);
          setCurrentBalance(0);
        }
      } else {
        console.error('❌ Lỗi khi lấy danh sách wallets:', response.error);
        if (isMountedRef.current) {
          setCurrentBalance(0);
        }
      }
    } catch (error) {
      console.error('❌ Lỗi khi lấy số dư:', error);
      if (isMountedRef.current) {
        setCurrentBalance(0);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingBalance(false);
      }
    }
  };

  const fetchWithdrawalHistory = async () => {
    if (!user?.id || !isMountedRef.current) {
      console.log('⚠️ Chưa có user ID hoặc component đã unmount, không thể lấy lịch sử rút tiền');
      return;
    }

    setIsLoadingWithdrawal(true);
    try {
      const response = await withdrawalAPI.layTatCaLichSu();
      if (!isMountedRef.current) return;
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
        if (isMountedRef.current) {
          setWithdrawalHistory([]);
        }
      }
    } catch (error) {
      console.error('❌ Lỗi khi lấy lịch sử rút tiền:', error);
      if (isMountedRef.current) {
        setWithdrawalHistory([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingWithdrawal(false);
      }
    }
  };

  /**
   * Tính "Số ¥ đã nhận"
   * 
   * CÁCH TÍNH:
   * 1. Backend query: SUM(cong_thuc_nhan_te) từ bảng thong_tin_nhan_keo
   * 2. Điều kiện:
   *    - id_nguoi_dung = user hiện tại
   *    - tien_do_hoan_thanh IN ('DONE', 'HỦY BỎ', 'ĐỀN')
   *    - thoi_gian_hoan_thanh IS NOT NULL
   *    - Nếu có month: TO_CHAR(thoi_gian_hoan_thanh, 'YYYY-MM') = tháng được chọn
   *    - Nếu month = null: tính tổng tất cả tháng
   * 
   * cong_thuc_nhan_te (Công thực nhận) được tính khi status chuyển sang DONE/HỦY BỎ/ĐỀN:
   * - DONE: cong_thuc_nhan_te = f(WebBetAmountCNY) (tính theo loại kèo)
   * - HỦY BỎ: cong_thuc_nhan_te = f(ActualReceivedCNY) (nếu ActualReceivedCNY = 0 thì = 0)
   * - ĐỀN: cong_thuc_nhan_te = -CompensationCNY (số âm, sẽ trừ đi)
   */
  const fetchMonthlyTotal = async (month = null) => {
    if (!user?.id || !isMountedRef.current) {
      console.log('⚠️ Chưa có user ID hoặc component đã unmount, không thể lấy tổng số tiền theo tháng');
      return;
    }

    // Nếu month là null hoặc rỗng, truyền null để backend tính tổng tất cả tháng
    // Nếu có month, sử dụng month đó
    const monthToFetch = (month && month !== '') ? month : null;

    setIsLoadingMonthlyTotal(true);
    try {
      console.log('📡 [fetchMonthlyTotal] Gọi API với tháng:', monthToFetch || 'TẤT CẢ THÁNG', 'user ID:', user.id);
      const response = await donHangAPI.layTongTienTheoThang(monthToFetch);
      if (!isMountedRef.current) return;
      console.log('📥 [fetchMonthlyTotal] API Response đầy đủ:', JSON.stringify(response, null, 2));
      console.log('📥 [fetchMonthlyTotal] response.success:', response.success);
      console.log('📥 [fetchMonthlyTotal] response.data:', response.data);
      console.log('📥 [fetchMonthlyTotal] response.data?.total:', response.data?.total);
      
      if (response.success) {
        // Backend trả về: { success: true, data: { user_id, month, total } }
        let total = 0;
        
        // Thử nhiều cách để lấy total
        if (typeof response.data === 'object' && response.data !== null) {
          if ('total' in response.data) {
            total = Number(response.data.total) || 0;
          } else if (typeof response.data === 'number') {
            total = Number(response.data) || 0;
          }
        } else if (typeof response.data === 'number') {
          total = Number(response.data) || 0;
        }
        
        console.log('💰 [fetchMonthlyTotal] Tổng số tiền đã parse:', total);
        
        if (isMountedRef.current) {
          setMonthlyTotal(total);
          console.log('✅ [fetchMonthlyTotal] Lấy tổng số tiền theo tháng thành công:', total, `(tháng: ${monthToFetch || 'TẤT CẢ THÁNG'})`);
        }
      } else {
        console.error('❌ [fetchMonthlyTotal] Lỗi khi lấy tổng số tiền theo tháng:', response.error);
        if (isMountedRef.current) {
          setMonthlyTotal(0);
        }
      }
    } catch (error) {
      console.error('❌ [fetchMonthlyTotal] Exception khi lấy tổng số tiền theo tháng:', error);
      console.error('❌ [fetchMonthlyTotal] Error response:', error.response?.data);
      console.error('❌ [fetchMonthlyTotal] Error message:', error.message);
      if (isMountedRef.current) {
        setMonthlyTotal(0);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMonthlyTotal(false);
      }
    }
  };

  const handleShowWithdrawalDetail = () => {
    setShowWithdrawalModal(true);
    fetchWithdrawalHistory();
  };

  // Fetch danh sách kèo đã hoàn thành (DONE) và đang xử lý, lắng nghe sự kiện/global focus
  useEffect(() => {
    isMountedRef.current = true;
    fetchDoneTasks(true); // Lần đầu load
    fetchPendingTasks();
    fetchInProgressTasks();
    if (user?.id) {
      fetchCurrentUserBalance();
      fetchMonthlyTotal(monthFilter || null); // Nếu monthFilter rỗng/null, sẽ tự động tính tháng hiện tại
    }

    const handleRefresh = (event) => {
      // Kiểm tra component còn mounted không
      if (!isMountedRef.current) {
        console.log('⚠️ Component đã unmount, bỏ qua handleRefresh');
        return;
      }
      
      console.log('🔄 ProfilePage - Nhận được event:', event?.type || 'focus');
      
      // Fetch lại danh sách
      fetchDoneTasks(false);
      
      fetchPendingTasks();
      fetchInProgressTasks();
      if (user?.id) {
        fetchCurrentUserBalance();
        fetchMonthlyTotal(monthFilter || null); // Nếu monthFilter rỗng/null, sẽ tự động tính tháng hiện tại
      }
    };

    // Sử dụng capture phase để đảm bảo nhận được event
    window.addEventListener('bet-receipt-status-changed', handleRefresh, true);
    window.addEventListener('focus', handleRefresh);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('bet-receipt-status-changed', handleRefresh, true);
      window.removeEventListener('focus', handleRefresh);
      // Cleanup timeout khi component unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Reset refs để tránh lỗi DOM
      errorMessageRef.current = null;
      changePasswordSectionRef.current = null;
      modalBodyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Fetch monthly total khi monthFilter thay đổi
  useEffect(() => {
    if (user?.id) {
      fetchMonthlyTotal(monthFilter || null); // Nếu monthFilter rỗng/null, sẽ tự động tính tháng hiện tại
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter, user?.id]);

  // Cleanup timeout khi modal đóng
  useEffect(() => {
    if (!showEditProfileModal && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [showEditProfileModal]);

  // Auto scroll đến error message khi có lỗi
  useEffect(() => {
    if (errorMessage && errorMessageRef.current && showEditProfileModal) {
      const timer = setTimeout(() => {
        if (isMountedRef.current && errorMessageRef.current && errorMessageRef.current.parentNode) {
          try {
            errorMessageRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          } catch (error) {
            // Ignore scroll errors if element is not in DOM
            console.warn('Scroll error:', error);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, showEditProfileModal]);

  // Auto scroll đến phần đổi mật khẩu khi section được mở
  useEffect(() => {
    if (showChangePasswordSection && showEditProfileModal) {
      // Đợi DOM render xong
      const timer = setTimeout(() => {
        if (isMountedRef.current && changePasswordSectionRef.current && changePasswordSectionRef.current.parentNode) {
          try {
            // Scroll để đưa phần đổi mật khẩu vào view
            changePasswordSectionRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
          } catch (error) {
            // Ignore scroll errors if element is not in DOM
            console.warn('Scroll error:', error);
          }
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [showChangePasswordSection, showEditProfileModal]);

  // Handle mouse events cho crop
  useEffect(() => {
    if (showCropModal) {
      const handleMouseMove = (e) => handleCropMouseMove(e);
      const handleMouseUp = () => handleCropMouseUp();

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [showCropModal, handleCropMouseMove, handleCropMouseUp]);

  // Lấy chữ cái đầu tiên của tên để hiển thị trong avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  // Lấy URL avatar hoặc hiển thị initials
  const getAvatarDisplay = () => {
    if (user?.avatar_url) {
      return `http://localhost:8080${user.avatar_url}`;
    }
    return null;
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
                      <span>Tiền kèo (¥)</span>
                      <span>¥ thực nhận</span>
                      <span>Chi tiết</span>
                    </div>
                    <div className="task-list-body">
                      {filteredDoneTasks.map((task) => {
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
                  <span>Số ¥ đã nhận{monthFilter ? ` tháng ${monthFilter}` : ' (tất cả tháng)'}: <strong style={{ color: '#b7791f' }}>
                    {isLoadingMonthlyTotal ? (
                      'Đang tải...'
                    ) : (
                      formatNumber(monthlyTotal)
                    )}
                  </strong></span>
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

      {/* Modal chỉnh sửa profile */}
      {showEditProfileModal && (
        <div
          className="reason-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditProfileModal(false);
            }
          }}
        >
          <div
            className="reason-modal-content edit-profile-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="reason-modal-header">
              <h3>Chỉnh sửa hồ sơ cá nhân</h3>
              <button
                className="reason-modal-close"
                onClick={() => setShowEditProfileModal(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="reason-modal-body" ref={modalBodyRef}>
              {errorMessage && (
                <div
                  ref={errorMessageRef}
                  style={{
                    padding: '12px',
                    backgroundColor: '#fee',
                    color: '#c33',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '14px'
                  }}
                >
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#efe',
                  color: '#3c3',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}>
                  {successMessage}
                </div>
              )}

              {/* Upload Avatar Section */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>Ảnh đại diện</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      backgroundColor: '#667eea',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '32px',
                      fontWeight: 'bold',
                      backgroundImage: avatarPreview ? `url(${avatarPreview})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {!avatarPreview && getInitials(user?.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif"
                      onChange={handleAvatarSelect}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#667eea',
                        backgroundColor: '#f0f4ff',
                        border: '2px solid #667eea',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginBottom: '8px',
                      }}
                    >
                      Chọn ảnh
                    </button>
                    {selectedAvatar && (
                      <button
                        type="button"
                        onClick={handleUploadAvatar}
                        disabled={isUploadingAvatar}
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'white',
                          backgroundColor: isUploadingAvatar ? '#ccc' : '#667eea',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: isUploadingAvatar ? 'not-allowed' : 'pointer',
                          display: 'block',
                        }}
                      >
                        {isUploadingAvatar ? 'Đang upload...' : 'Lưu ảnh'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Update Profile Section */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>Thông tin cá nhân</h4>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Tên
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Nhập tên của bạn"
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      boxSizing: 'border-box',
                      backgroundColor: '#f3f4f6',
                      cursor: 'not-allowed',
                    }}
                    placeholder="Email không thể thay đổi"
                  />
                  <p style={{ color: '#666', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>
                    Email không thể thay đổi
                  </p>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={editPhoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // Chỉ cho phép số
                      setEditPhoneNumber(value);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Nhập số điện thoại (chỉ số)"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleUpdateProfile}
                  disabled={isUpdatingProfile}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'white',
                    backgroundColor: isUpdatingProfile ? '#ccc' : '#667eea',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isUpdatingProfile ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isUpdatingProfile ? 'Đang cập nhật...' : 'Cập nhật thông tin'}
                </button>
              </div>

              {/* Change Password Section */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowChangePasswordSection(!showChangePasswordSection)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#667eea',
                    backgroundColor: '#f0f4ff',
                    border: '2px solid #667eea',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: showChangePasswordSection ? '16px' : '0',
                  }}
                >
                  <span>{showChangePasswordSection ? '▼' : '▶'}</span>
                  <span>Đổi mật khẩu</span>
                </button>
                
                {showChangePasswordSection && (
                  <div 
                    ref={changePasswordSectionRef}
                    style={{
                      marginTop: '16px',
                      padding: '16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                        Mật khẩu cũ
                      </label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          boxSizing: 'border-box',
                        }}
                        placeholder="Nhập mật khẩu cũ"
                      />
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                        Mật khẩu mới
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          boxSizing: 'border-box',
                        }}
                        placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                      />
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                        Xác nhận mật khẩu mới
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          boxSizing: 'border-box',
                        }}
                        placeholder="Nhập lại mật khẩu mới"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={isChangingPassword}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'white',
                        backgroundColor: isChangingPassword ? '#ccc' : '#667eea',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isChangingPassword ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isChangingPassword ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="reason-modal-footer">
              <button
                className="reason-modal-button"
                type="button"
                onClick={() => setShowEditProfileModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crop avatar */}
      {showCropModal && cropImage && (
        <div
          className="reason-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCropModal(false);
              setCropImage(null);
            }
          }}
        >
          <div
            className="reason-modal-content edit-profile-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px' }}
          >
            <div className="reason-modal-header">
              <h3>Căn chỉnh ảnh đại diện</h3>
              <button
                className="reason-modal-close"
                onClick={() => {
                  setShowCropModal(false);
                  setCropImage(null);
                }}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="reason-modal-body">
              <div style={{ marginBottom: '16px' }}>
                <div
                  ref={cropContainerRef}
                  style={{
                    width: '100%',
                    height: '300px',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '8px',
                    backgroundColor: '#f3f4f6',
                    border: '2px solid #e5e7eb',
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                  onMouseDown={handleCropMouseDown}
                >
                  <img
                    ref={cropImageRef}
                    src={cropImage}
                    alt="Crop preview"
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) translate(${cropPosition.x}px, ${cropPosition.y}px) scale(${cropScale})`,
                      maxWidth: 'none',
                      height: 'auto',
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}
                    draggable={false}
                  />
                  {/* Crop frame overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '250px',
                      height: '250px',
                      borderRadius: '50%',
                      border: '3px solid white',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Zoom controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => handleCropZoom(-0.1)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#667eea',
                    backgroundColor: '#f0f4ff',
                    border: '2px solid #667eea',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  −
                </button>
                <span style={{ fontSize: '14px', color: '#666', minWidth: '60px', textAlign: 'center' }}>
                  {Math.round(cropScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => handleCropZoom(0.1)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#667eea',
                    backgroundColor: '#f0f4ff',
                    border: '2px solid #667eea',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  +
                </button>
              </div>

              <div style={{ fontSize: '13px', color: '#666', textAlign: 'center', marginBottom: '16px' }}>
                Kéo ảnh để căn chỉnh vị trí, dùng + và − để phóng to/thu nhỏ
              </div>
            </div>
            <div className="reason-modal-footer">
              <button
                className="reason-modal-button"
                type="button"
                onClick={() => {
                  setShowCropModal(false);
                  setCropImage(null);
                }}
                style={{ marginRight: '8px', backgroundColor: '#6b7280' }}
              >
                Hủy
              </button>
              <button
                className="reason-modal-button"
                type="button"
                onClick={handleCropImage}
              >
                Áp dụng
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


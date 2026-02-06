import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import BottomNavigation from '../../components/BottomNavigation';
import TopBar from '../../components/TopBar';
import { donHangAPI } from '../../api/endpoints/don_hang.api';
import { walletAPI } from '../../api/endpoints/wallet.api';
import { withdrawalAPI } from '../../api/endpoints/withdrawal.api';
import './ProfilePage.css';
import './HomePage.css';

const ProfilePage = () => {
  console.log('🎬 ProfilePage component render');

  const [doneTasks, setDoneTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const [pendingTasks, setPendingTasks] = useState([]);
  const [isLoadingPendingTasks, setIsLoadingPendingTasks] = useState(false);

  const [inProgressTasks, setInProgressTasks] = useState([]);
  const [isLoadingInProgressTasks, setIsLoadingInProgressTasks] = useState(false);

  const [showCancelReasonModal, setShowCancelReasonModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const [currentBalance, setCurrentBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [isLoadingWithdrawal, setIsLoadingWithdrawal] = useState(false);

  const [monthFilter, setMonthFilter] = useState('');
  const [showMonthFilter, setShowMonthFilter] = useState(false);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [isLoadingMonthlyTotal, setIsLoadingMonthlyTotal] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const previousDoneTasksRef = useRef([]);
  const formatNumber = (num) => {
    if (num === null || num === undefined || num === '') return '-';
    const n = Number(num);
    if (Number.isNaN(n)) return '-';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Đóng dropdown filter tháng khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
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
      // Don't reset refs to null as they might be accessed during unmount
      // React will handle cleanup automatically
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

  // Lấy danh sách tháng từ doneTasks
  const availableMonths = Array.from(
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
    .reverse();

  return (
    <div className="page-with-bottom-nav">
      <TopBar />
      <div className="profile-content personal-dashboard">
        <>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <h3 style={{ margin: 0 }}>Nhiệm vụ đã hoàn thành : {
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
                {/* Filter theo tháng */}
                <div style={{ position: 'relative' }} data-month-filter>
                  <button
                    onClick={() => setShowMonthFilter(!showMonthFilter)}
                    className="profile-month-filter-btn"
                    title="Lọc theo tháng"
                  >
                    📅 {monthFilter ? `Tháng: ${monthFilter}` : 'Lọc theo tháng'}
                  </button>
                  {showMonthFilter && (
                    <div className="profile-month-filter-dropdown">
                      <div
                        onClick={() => {
                          setMonthFilter('');
                          setShowMonthFilter(false);
                        }}
                        className={`profile-month-filter-item ${monthFilter === '' ? 'active' : ''}`}
                      >
                        Tất cả
                      </div>
                      {availableMonths.map((month) => (
                        <div
                          key={month}
                          onClick={() => {
                            setMonthFilter(month);
                            setShowMonthFilter(false);
                          }}
                          className={`profile-month-filter-item ${monthFilter === month ? 'active' : ''}`}
                        >
                          {month}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
                                <span>{formatNumber((task.actual_amount_cny ?? task.actualAmount ?? 0) - (task.user_cut_cny ?? task.userCut ?? 0))}</span>
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
        </>
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
                      <td>{formatNumber((selectedTask.actual_amount_cny ?? selectedTask.actualAmount ?? 0) - (selectedTask.user_cut_cny ?? selectedTask.userCut ?? 0))}</td>
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
                          <th>Còn lại</th>
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
                            <td>{task.time_remaining_formatted || task.timeRemainingFormatted || '-'}</td>
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
      {/* Modal bảng lịch sử rút tiền */}
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
      
      <BottomNavigation/>
    </div>
  );
};

export default ProfilePage;


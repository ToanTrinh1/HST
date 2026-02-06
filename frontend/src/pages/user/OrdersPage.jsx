import { useState, useRef, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useAuth } from '../../context/AuthContext';
import BottomNavigation from '../../components/BottomNavigation';
import TopBar from '../../components/TopBar';
import CreateBetReceiptModal from '../../components/CreateBetReceiptModal';
import { donHangAPI } from '../../api/endpoints/don_hang.api';
import './OrdersPage.css';

const OrdersPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [waitingTasks, setWaitingTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [showCreateBetModal, setShowCreateBetModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [confirmingLogin, setConfirmingLogin] = useState({});
  const isMountedRef = useRef(true);

  const normalizeTask = useCallback((task) => ({
    id: task.id,
    taskCode: task.task_code || task.task || '-',
    betType: task.bet_type || task.betType || '-',
    webBet: task.web_bet_amount_cny ?? task.webBet ?? 0,
    status: task.status || '-',
    orderCode: task.order_code || task.orderCode || '-',
    receivedAt: task.received_at || task.receivedAt || null,
    account: task.account || task.tai_khoan || '',
    password: task.password || task.mat_khau || '',
    region: task.region || task.khu_vuc || '',
    orderLink: task.order_link || task.orderLink || '',
  }), []);

  const allTasks = useMemo(() => {
    return waitingTasks.map((item) => normalizeTask(item)).sort((a, b) => {
      const aTime = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
      const bTime = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [waitingTasks, normalizeTask]);

  const filteredTasks = useMemo(() => {
    return allTasks;
  }, [allTasks]);

  const formatNumber = (num) => {
    if (num === null || num === undefined || num === '') return '-';
    const n = Number(num);
    if (Number.isNaN(n)) return '-';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const fetchWaitingTasks = async () => {
    if (!isMountedRef.current) return;
    setIsLoadingTasks(true);
    try {
      const res = await donHangAPI.layDanhSachDonHang(50, 0);
      if (!isMountedRef.current) return;
      if (res.success && Array.isArray(res.data)) {
            // Chỉ lấy các đơn hàng có status Chờ chấp nhận
            const waiting = res.data.filter((item) => item.status === 'Chờ chấp nhận');
        if (isMountedRef.current) {
          setWaitingTasks(waiting);
        }
      } else {
        if (isMountedRef.current) {
          setWaitingTasks([]);
        }
      }
    } catch (error) {
      console.error('❌ Lỗi khi lấy danh sách kèo chờ duyệt:', error);
      if (isMountedRef.current) {
        setWaitingTasks([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingTasks(false);
      }
    }
  };

  const handleConfirmLogin = async (taskId) => {
    if (!taskId) return;
    setConfirmingLogin((prev) => ({ ...prev, [taskId]: true }));
    try {
      const response = await donHangAPI.capNhatStatusDonHang(taskId, {
        status: 'ĐANG THỰC HIỆN',
      });
      if (response.success) {
        fetchWaitingTasks(); // Refresh lại danh sách
      } else {
        alert(response.error || 'Không thể xác nhận login');
      }
    } catch (error) {
      console.error('❌ Lỗi khi xác nhận login:', error);
      alert('Có lỗi xảy ra khi xác nhận login');
    } finally {
      setConfirmingLogin((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  // Fetch tasks
  useEffect(() => {
    isMountedRef.current = true;
    fetchWaitingTasks();

    const handleRefresh = () => {
      if (!isMountedRef.current) return;
      fetchWaitingTasks();
    };

    window.addEventListener('bet-receipt-status-changed', handleRefresh, true);
    window.addEventListener('focus', handleRefresh);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('bet-receipt-status-changed', handleRefresh, true);
      window.removeEventListener('focus', handleRefresh);
    };
  }, []);


  return (
    <div className="page-with-bottom-nav">
      <TopBar />
      <div className="orders-page-content">
        {isAuthenticated && (
          <div className="orders-page-header">
            <button
              type="button"
              onClick={() => setShowCreateBetModal(true)}
              className="orders-create-bet-btn"
            >
              ➕ Tạo kèo mới
            </button>
          </div>
        )}

        <div className="orders-table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Nhiệm vụ</th>
                <th>Loại kèo</th>
                <th>Tiền kèo</th>
                <th>Trạng thái</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingTasks ? (
                <tr>
                  <td colSpan={5} className="orders-loading">Đang tải...</td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="orders-empty">Chưa có dữ liệu</td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td className="orders-task-code">{task.taskCode}</td>
                    <td>{task.betType}</td>
                    <td className="orders-amount">{formatNumber(task.webBet)} ¥</td>
                    <td
                      className={
                        `orders-status orders-status-${task.status
                          ?.normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/\s+/g, '-')
                          .toLowerCase()}`.trim()
                      }
                    >
                      {task.status}
                    </td>
                    <td className="orders-link-cell">
                      {task.orderLink ? (
                        <a href={task.orderLink} target="_blank" rel="noopener noreferrer">
                          Mở kèo
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="orders-account-info">
          <div className="orders-account-header">
            <h4>Hướng dẫn nhận kèo trên web:</h4>
            <a
              href="https://m.dailiantong.com/#/pages/login/login"
              target="_blank"
              rel="noopener noreferrer"
              className="orders-account-link"
            >
              https://m.dailiantong.com/#/pages/login/login
            </a>
          </div>
          <div className="orders-account-accounts">
            <div className="orders-account-item">
              <div className="orders-account-label">Tài khoản:</div>
              <div className="orders-account-value">18501753689</div>
              <div className="orders-account-label">Mật khẩu:</div>
              <div className="orders-account-value">anhteo123</div>
            </div>
            <div className="orders-account-separator">—</div>
            <div className="orders-account-item">
              <div className="orders-account-label">Tài khoản:</div>
              <div className="orders-account-value">19378713623</div>
              <div className="orders-account-label">Mật khẩu:</div>
              <div className="orders-account-value">anhteo123</div>
            </div>
          </div>
        </div>
      </div>

      {showCreateBetModal && (
        <CreateBetReceiptModal
          isOpen={showCreateBetModal}
          onClose={() => setShowCreateBetModal(false)}
          onSuccess={() => {
            setShowCreateBetModal(false);
            fetchWaitingTasks();
          }}
        />
      )}


      <BottomNavigation />
    </div>
  );
};

export default OrdersPage;

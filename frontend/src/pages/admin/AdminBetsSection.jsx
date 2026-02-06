/**
 * Tab "Danh sách kèo": Trang thông tin, Lịch sử chỉnh sửa, Đơn hàng đã xử lí.
 * Tự quản lý state, fetch, handlers và modals.
 */
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { donHangAPI } from '../../api/endpoints/don_hang.api';
import { userAPI } from '../../api/endpoints/user.api';
import betReceiptHistoryAPI from '../../api/endpoints/bet_receipt_history.api';
import { buildDailiantongLink } from '../../utils/buildDailiantongLink';
import { parseDailiantongLink } from '../../utils/parseDailiantongLink';
import websocketService from '../../services/websocket.service';

const dispatchWalletRefresh = () => {
  window.dispatchEvent(new CustomEvent('admin-wallet-refresh'));
};

const AdminBetsSection = () => {
  const { user: currentUser } = useAuth();
  const currentAdminId = currentUser?.id ?? null;

  const [activeTopTab, setActiveTopTab] = useState('trang-thong-tin');
  const [activeDonHangTab, setActiveDonHangTab] = useState('tong-hop');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelModalData, setCancelModalData] = useState({
    betId: '',
    oldStatus: '',
    actualReceivedCNY: '',
    userCutCNY: '',
    cancelReason: '',
  });
  const [showCompensationModal, setShowCompensationModal] = useState(false);
  const [compensationModalData, setCompensationModalData] = useState({
    betId: '',
    oldStatus: '',
    compensationCNY: '',
    userCutCNY: '',
    cancelReason: '',
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExchangeRateModal, setShowExchangeRateModal] = useState(false);
  const [exchangeRateInput, setExchangeRateInput] = useState('');
  const [currentExchangeRate, setCurrentExchangeRate] = useState(null);
  const [currentConfigRest, setCurrentConfigRest] = useState({ admin_receive_rate: 3850, fee_web_pct: 8, admin_keep_pct: 60 });
  const [isLoadingCurrentRate, setIsLoadingCurrentRate] = useState(false);
  const [isUpdatingExchangeRate, setIsUpdatingExchangeRate] = useState(false);
  const [editingBetId, setEditingBetId] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    user_name: '',
    task_code: '',
    bet_type: 'web',
    web_bet_amount_cny: '',
    order_code: '',
    notes: '',
    completed_hours: '',
    account: '',
    password: '',
    region: '',
    order_serial_no: '',
    order_publish: '',
  });
  const [createModalLinkInput, setCreateModalLinkInput] = useState('');
  const [isFetchingLinkInfo, setIsFetchingLinkInfo] = useState(false);
  const [createFromLinkError, setCreateFromLinkError] = useState('');
  const [betList, setBetList] = useState([]);
  const [isLoadingDonHang, setIsLoadingDonHang] = useState(false);
  const [processedBetListFromApi, setProcessedBetListFromApi] = useState([]);
  const [isLoadingProcessed, setIsLoadingProcessed] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistoryDetailModal, setShowHistoryDetailModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [userList, setUserList] = useState([]);
  const [filteredUserList, setFilteredUserList] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showBetTypeDropdown, setShowBetTypeDropdown] = useState(false);
  const userInputRef = useRef(null);
  const betTypeInputRef = useRef(null);
  const [filters, setFilters] = useState(() => {
    const n = new Date();
    const currentMonth = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
    return {
      name: '',
      betType: '',
      webBet: '',
      orderCode: '',
      status: '',
      month: currentMonth,
    };
  });
  const [showFilterInputs, setShowFilterInputs] = useState({
    name: false,
    betType: false,
    webBet: false,
    orderCode: false,
    status: false,
    month: false,
  });

  const getStatusClass = (status) => {
    switch (status) {
      case 'DONE': return 'status-done';
      case 'Đơn hàng mới': return 'status-new';
      case 'Chờ chấp nhận': return 'status-pending';
      case 'ĐANG THỰC HIỆN': return 'status-in-progress';
      case 'ĐỀN': return 'status-compensation';
      case 'HỦY BỎ': return 'status-cancelled';
      case 'ĐANG QUÉT MÃ': return 'status-scanning';
      case 'CHỜ TRỌNG TÀI': return 'status-waiting-ref';
      default: return '';
    }
  };

  const statusTabs = [
    { key: 'tong-hop', label: 'Tổng hợp' },
    { key: 'don-hang-moi', label: 'Đơn hàng mới' },
    { key: 'cho-chap-nhan', label: 'Chờ chấp nhận' },
  ];
  const donHangMoiCount = activeDonHangTab === 'don-hang-moi' ? betList.length : 0;
  const choChapNhanCount = activeDonHangTab === 'cho-chap-nhan' ? betList.length : 0;
  const processedStatuses = ['DONE', 'HỦY BỎ', 'ĐỀN'];
  const processedBetListSource = activeTopTab === 'don-hang-da-xu-li'
    ? processedBetListFromApi
    : betList.filter((bet) => processedStatuses.includes(bet.status));
  const processedBetList = [...processedBetListSource].sort((a, b) => {
    const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return dateB - dateA;
  });
  // Backend đã filter theo tab nên betList chỉ chứa đơn đúng tab; chỉ áp filter tìm kiếm
  const filteredBetList = betList.filter((bet) => {
    if (filters.name && !bet.name?.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.betType && bet.betType !== filters.betType) return false;
    if (filters.webBet) {
      const fv = parseFloat(filters.webBet);
      const bv = typeof bet.webBet === 'number' ? bet.webBet : parseFloat(bet.webBet) || 0;
      if (isNaN(fv) || bv !== fv) return false;
    }
    if (filters.orderCode && !bet.orderCode?.toLowerCase().includes(filters.orderCode.toLowerCase())) return false;
    if (filters.status && bet.status !== filters.status) return false;
    return true;
  });
  const filteredProcessedBetList = processedBetList.filter((bet) => {
    if (filters.name && !bet.name?.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.betType && bet.betType !== filters.betType) return false;
    if (filters.webBet) {
      const fv = parseFloat(filters.webBet);
      const bv = typeof bet.webBet === 'number' ? bet.webBet : parseFloat(bet.webBet) || 0;
      if (isNaN(fv) || bv !== fv) return false;
    }
    if (filters.orderCode && !bet.orderCode?.toLowerCase().includes(filters.orderCode.toLowerCase())) return false;
    if (filters.status && bet.status !== filters.status) return false;
    if (filters.month) {
      if (!bet.completedAt) return false;
      const d = new Date(bet.completedAt);
      if (isNaN(d.getTime())) return false;
      const betMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (betMonth !== filters.month) return false;
    }
    return true;
  });

  const processedMonthOptions = [{ value: '', label: 'Tất cả thời gian' }];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    processedMonthOptions.push({ value: m, label: m });
  }
  const betNameOptions = Array.from(new Set(betList.map((b) => (b.name || '').trim()).filter(Boolean)));
  const betOrderCodeOptions = Array.from(new Set(betList.map((b) => (b.orderCode || '').trim()).filter(Boolean)));
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
  const betTypeOptions = ['web', 'Kèo ngoài'];

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  const handleCopyLink = async (link) => {
    if (!link) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        return;
      }
    } catch (e) {}
    const ta = document.createElement('textarea');
    ta.value = link;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (e) {}
    document.body.removeChild(ta);
  };

  const fetchDonHangList = async () => {
    setIsLoadingDonHang(true);
    try {
      const tabMap = { 'tong-hop': 'tong_hop', 'don-hang-moi': 'don_hang_moi', 'cho-chap-nhan': 'cho_chap_nhan' };
      const tab = tabMap[activeDonHangTab] || 'tong_hop';
      const response = await donHangAPI.layDanhSachDonHang(100, 0, tab);
      if (response.success && response.data) {
        setBetList(response.data.map(mapItemToBet));
      } else {
        setBetList([]);
      }
    } catch (error) {
      console.error('Lỗi fetch danh sách đơn hàng:', error);
      setBetList([]);
    } finally {
      setIsLoadingDonHang(false);
    }
  };

  const mapItemToBet = (item) => {
    const orderLink = item.order_link || buildDailiantongLink(item.order_serial_no, item.order_publish);
    return {
      id: item.id,
      stt: item.stt,
      name: item.user_name || 'không có trong db',
      task: item.task_code || '',
      betType: item.bet_type || '',
      webBet: item.web_bet_amount_cny || 0,
      orderCode: item.order_code || '',
      orderLink,
      note: item.notes || '',
      status: item.status || '',
      actualReceived: item.actual_received_cny || 0,
      compensation: item.compensation_cny || '',
      actualAmount: item.actual_amount_cny || 0,
      receivedAt: item.received_at || '',
      completedHours: item.completed_hours || '',
      completedAt: item.completed_at || '',
      timeRemainingHours: item.time_remaining_hours || '',
      timeRemainingFormatted: item.time_remaining_formatted || '',
      account: item.account || '',
      password: item.password || '',
      region: item.region || '',
      assigned_admin_id: item.assigned_admin_id ?? null,
      assigned_admin_name: item.assigned_admin_name || '',
    };
  };

  const fetchProcessedDonHangList = async () => {
    setIsLoadingProcessed(true);
    try {
      const response = await donHangAPI.layDanhSachDonHang(100, 0, 'da_xu_ly');
      if (response.success && response.data) {
        const mappedData = response.data.map(mapItemToBet);
        setProcessedBetListFromApi(mappedData);
      } else {
        setProcessedBetListFromApi([]);
      }
    } catch (error) {
      console.error('Lỗi fetch đơn hàng đã xử lí:', error);
      setProcessedBetListFromApi([]);
    } finally {
      setIsLoadingProcessed(false);
    }
  };

  const fetchHistoryList = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await betReceiptHistoryAPI.layTatCaLichSu(200, 0);
      if (response.success && response.data) {
        setHistoryList(response.data);
      } else {
        setHistoryList([]);
      }
    } catch (error) {
      console.error('Lỗi fetch lịch sử:', error);
      setHistoryList([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchUserList = async () => {
    try {
      const response = await userAPI.getAllUsers(1000, 0);
      if (response.success && response.data) {
        setUserList(response.data);
        setFilteredUserList(response.data);
      }
    } catch (error) {
      console.error('Lỗi lấy danh sách users:', error);
    }
  };

  useEffect(() => {
    fetchDonHangList();
  }, [activeDonHangTab]);

  useEffect(() => {
    const onBetReceiptUpdated = () => {
      fetchDonHangList();
    };
    const onAdminOrdersRefresh = () => {
      fetchDonHangList();
      if (activeTopTab === 'don-hang-da-xu-li') fetchProcessedDonHangList();
    };
    websocketService.on('bet_receipt_updated', onBetReceiptUpdated);
    window.addEventListener('admin-orders-refresh', onAdminOrdersRefresh);
    return () => {
      websocketService.off('bet_receipt_updated', onBetReceiptUpdated);
      window.removeEventListener('admin-orders-refresh', onAdminOrdersRefresh);
    };
  }, [activeTopTab]);

  useEffect(() => {
    if (activeTopTab === 'lich-su-chinh-sua') fetchHistoryList();
    if (activeTopTab === 'don-hang-da-xu-li') fetchProcessedDonHangList();
  }, [activeTopTab]);

  useEffect(() => {
    const onBetReceiptUpdated = () => {
      if (activeTopTab === 'don-hang-da-xu-li') fetchProcessedDonHangList();
    };
    websocketService.on('bet_receipt_updated', onBetReceiptUpdated);
    return () => websocketService.off('bet_receipt_updated', onBetReceiptUpdated);
  }, [activeTopTab]);

  useEffect(() => {
    if (showCreateModal || showEditModal) fetchUserList();
  }, [showCreateModal, showEditModal]);

  useEffect(() => {
    const close = (e) => {
      if (userInputRef.current && !userInputRef.current.contains(e.target)) setShowUserDropdown(false);
      if (betTypeInputRef.current && !betTypeInputRef.current.contains(e.target)) setShowBetTypeDropdown(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showUserDropdown, showBetTypeDropdown]);

  const handleUserNameChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, user_name: value }));
    setShowUserDropdown(true);
    setFilteredUserList(value.trim() === '' ? userList : userList.filter((u) => u.name.toLowerCase().includes(value.toLowerCase())));
  };
  const handleUserSelect = (name) => {
    setFormData((prev) => ({ ...prev, user_name: name }));
    setShowUserDropdown(false);
  };
  const handleBetTypeSelect = (betType) => {
    setFormData((prev) => ({ ...prev, bet_type: betType }));
    setShowBetTypeDropdown(false);
  };
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getEmptyFormData = () => ({
    user_name: '',
    task_code: '',
    bet_type: 'web',
    web_bet_amount_cny: '',
    order_code: '',
    notes: '',
    completed_hours: '',
    account: '',
    password: '',
    region: '',
    order_serial_no: '',
    order_publish: '',
  });

  const handleFetchOrderFromLink = async () => {
    const link = createModalLinkInput.trim();
    if (!link) {
      setCreateFromLinkError('Vui lòng nhập link đơn hàng');
      return;
    }
    setCreateFromLinkError('');
    setIsFetchingLinkInfo(true);
    try {
      const { serialno, publish } = parseDailiantongLink(link);
      const result = await donHangAPI.getOrderDetail(serialno, publish);
      if (!result.success || !result.data) {
        setCreateFromLinkError(result.error || 'Không thể lấy thông tin đơn hàng');
        return;
      }
      const d = result.data;
      setFormData((prev) => ({
        ...prev,
        task_code: d.task_code || prev.task_code,
        bet_type: d.bet_type || 'web',
        web_bet_amount_cny: d.web_bet_amount_cny != null ? String(d.web_bet_amount_cny) : prev.web_bet_amount_cny,
        order_code: d.order_code || prev.order_code,
        notes: d.notes != null ? d.notes : prev.notes,
        completed_hours: d.completed_hours != null ? String(d.completed_hours) : prev.completed_hours,
        region: d.region || prev.region,
        order_serial_no: serialno,
        order_publish: String(publish),
      }));
    } catch (err) {
      console.error('Lỗi lấy thông tin từ link:', err);
      setCreateFromLinkError(err.message || 'Không thể parse link. Kiểm tra định dạng link.');
    } finally {
      setIsFetchingLinkInfo(false);
    }
  };

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
        account: formData.account || undefined,
        password: formData.password || undefined,
        region: formData.region || undefined,
      };
      if (formData.order_serial_no && formData.order_serial_no.trim()) {
        dataToSend.order_serial_no = formData.order_serial_no.trim();
        dataToSend.order_publish = formData.order_publish ? parseInt(formData.order_publish, 10) : 2;
      }
      const response = await donHangAPI.taoDonHang(dataToSend);
      if (response.success) {
        alert('Tạo đơn hàng thành công!');
        setShowCreateModal(false);
        setFormData(getEmptyFormData());
        setCreateModalLinkInput('');
        setCreateFromLinkError('');
        fetchDonHangList();
      } else {
        alert('Lỗi: ' + (response.error || 'Không thể tạo đơn hàng'));
      }
    } catch (error) {
      console.error('Lỗi tạo đơn hàng:', error);
      alert('Có lỗi xảy ra khi tạo đơn hàng');
    } finally {
      setIsCreating(false);
    }
  };

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
      account: bet.account || '',
      password: bet.password || '',
      region: bet.region || '',
    });
    setShowEditModal(true);
  };

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
      if (formData.account !== undefined) dataToSend.account = formData.account || null;
      if (formData.password !== undefined) dataToSend.password = formData.password || null;
      if (formData.region !== undefined) dataToSend.region = formData.region || null;
      const response = await donHangAPI.capNhatDonHang(editingBetId, dataToSend);
      if (response.success) {
        alert('Cập nhật đơn hàng thành công!');
        setShowEditModal(false);
        setEditingBetId(null);
        setFormData({ user_name: '', task_code: '', bet_type: 'web', web_bet_amount_cny: '', order_code: '', notes: '', completed_hours: '', account: '', password: '', region: '' });
        fetchDonHangList();
      } else {
        alert('Lỗi: ' + (response.error || 'Không thể cập nhật đơn hàng'));
      }
    } catch (error) {
      console.error('Lỗi cập nhật đơn hàng:', error);
      alert('Có lỗi xảy ra khi cập nhật đơn hàng');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelStatus = async (e) => {
    e.preventDefault();
    const numericAmount = cancelModalData.actualReceivedCNY.replace(/[^\d.]/g, '');
    const amountValue = parseFloat(numericAmount);
    if (numericAmount === '' || isNaN(amountValue) || amountValue < 0) {
      alert('Vui lòng nhập số tiền hợp lệ (≥ 0)');
      return;
    }
    const numericCut = (cancelModalData.userCutCNY || '').replace(/[^\d.]/g, '');
    const cutValue = numericCut === '' ? 0 : parseFloat(numericCut);
    if (isNaN(cutValue) || cutValue < 0) {
      alert('Tiền cắt phải là số hợp lệ (≥ 0)');
      return;
    }
    if (!cancelModalData.cancelReason?.trim()) {
      alert('Vui lòng nhập lý do hủy bỏ');
      return;
    }
    const betId = cancelModalData.betId;
    try {
      const response = await donHangAPI.capNhatStatusDonHang(betId, {
        status: 'HỦY BỎ',
        actual_received_cny: amountValue,
        user_cut_cny: cutValue,
        cancel_reason: cancelModalData.cancelReason.trim(),
      });
      if (response.success && response.data) {
        setBetList((prev) =>
          prev.map((item) =>
            item.id === betId
              ? { ...item, status: 'HỦY BỎ', actualReceived: response.data.actual_received_cny ?? amountValue, actualAmount: response.data.actual_amount_cny ?? 0 }
              : item
          )
        );
        setTimeout(dispatchWalletRefresh, 300);
        const evDetailCancel = { id: betId, status: 'HỦY BỎ' };
        setTimeout(() => window.dispatchEvent(new CustomEvent('bet-receipt-status-changed', { detail: evDetailCancel })), 400);
        setShowCancelModal(false);
        setCancelModalData({ betId: '', oldStatus: '', actualReceivedCNY: '', userCutCNY: '', cancelReason: '' });
      } else {
        alert('Lỗi: ' + (response.error || 'Không thể cập nhật status'));
        setBetList((prev) => prev.map((item) => (item.id === betId ? { ...item, status: cancelModalData.oldStatus } : item)));
      }
    } catch (error) {
      console.error('Lỗi cập nhật status:', error);
      alert('Có lỗi xảy ra khi cập nhật status');
      setBetList((prev) => prev.map((item) => (item.id === betId ? { ...item, status: cancelModalData.oldStatus } : item)));
    }
  };

  const handleCompensationStatus = async (e) => {
    e.preventDefault();
    const numericAmount = compensationModalData.compensationCNY.replace(/[^\d.]/g, '');
    const amountValue = parseFloat(numericAmount);
    if (numericAmount === '' || isNaN(amountValue) || amountValue <= 0) {
      alert('Tiền đền phải lớn hơn 0');
      return;
    }
    const numericCut = (compensationModalData.userCutCNY || '').replace(/[^\d.]/g, '');
    const cutValue = numericCut === '' ? 0 : parseFloat(numericCut);
    if (isNaN(cutValue) || cutValue < 0) {
      alert('Tiền cắt phải là số hợp lệ (≥ 0)');
      return;
    }
    if (!compensationModalData.cancelReason?.trim()) {
      alert('Vui lòng nhập lý do đền');
      return;
    }
    const betId = compensationModalData.betId;
    try {
      const response = await donHangAPI.capNhatStatusDonHang(betId, {
        status: 'ĐỀN',
        compensation_cny: amountValue,
        user_cut_cny: cutValue,
        cancel_reason: compensationModalData.cancelReason.trim(),
      });
      if (response.success && response.data) {
        setBetList((prev) =>
          prev.map((item) =>
            item.id === betId
              ? { ...item, status: 'ĐỀN', compensation: response.data.compensation_cny ?? amountValue, actualAmount: response.data.actual_amount_cny ?? 0 }
              : item
          )
        );
        setTimeout(dispatchWalletRefresh, 300);
        const evDetailComp = { id: betId, status: 'ĐỀN' };
        setTimeout(() => window.dispatchEvent(new CustomEvent('bet-receipt-status-changed', { detail: evDetailComp })), 400);
        setShowCompensationModal(false);
        setCompensationModalData({ betId: '', oldStatus: '', compensationCNY: '', userCutCNY: '', cancelReason: '' });
      } else {
        alert('Lỗi: ' + (response.error || 'Không thể cập nhật status'));
        setBetList((prev) => prev.map((item) => (item.id === betId ? { ...item, status: compensationModalData.oldStatus } : item)));
      }
    } catch (error) {
      console.error('Lỗi cập nhật status:', error);
      alert('Có lỗi xảy ra khi cập nhật status');
      setBetList((prev) => prev.map((item) => (item.id === betId ? { ...item, status: compensationModalData.oldStatus } : item)));
    }
  };

  const handleDeleteBet = async (betId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) return;
    try {
      const response = await donHangAPI.xoaDonHang(betId);
      if (response.success) {
        alert('Xóa đơn hàng thành công!');
        fetchDonHangList();
        dispatchWalletRefresh();
      } else {
        alert('Lỗi: ' + (response.error || 'Không thể xóa đơn hàng'));
      }
    } catch (error) {
      console.error('Lỗi xóa đơn hàng:', error);
      alert('Có lỗi xảy ra khi xóa đơn hàng');
    }
  };

  const handleRecalculateAmount = async (betId) => {
    if (!window.confirm('Bạn có chắc chắn muốn tính lại tệ cho đơn hàng này?')) return;
    try {
      const response = await donHangAPI.tinhLaiTe(betId);
      if (response.success && response.data) {
        alert('Tính lại tệ thành công!');
        setBetList((prev) =>
          prev.map((item) =>
            item.id === betId
              ? { ...item, actualAmount: response.data.actual_amount_cny ?? 0, actualReceived: response.data.actual_received_cny ?? item.actualReceived }
              : item
          )
        );
        setTimeout(dispatchWalletRefresh, 300);
      } else {
        alert('Lỗi: ' + (response.error || 'Không thể tính lại tệ'));
      }
    } catch (error) {
      console.error('Lỗi tính lại tệ:', error);
      alert('Có lỗi xảy ra khi tính lại tệ');
    }
  };

  const handleUpdateExchangeRate = async (e) => {
    e.preventDefault();
    const rateValue = parseFloat(exchangeRateInput);
    if (isNaN(rateValue) || rateValue <= 0) {
      alert('Vui lòng nhập tỷ giá hợp lệ (số lớn hơn 0)');
      return;
    }
    if (!window.confirm(`Cập nhật tỷ giá trả user thành ${rateValue}? Chỉ áp dụng cho đơn hàng mới.`)) return;
    setIsUpdatingExchangeRate(true);
    try {
      const { admin_receive_rate, admin_keep_pct } = currentConfigRest;
      const response = await donHangAPI.capNhatConfig({
        exchange_rate: rateValue,
        admin_receive_rate: admin_receive_rate,
        admin_keep_pct: admin_keep_pct ?? 60,
      });
      if (response.success) {
        alert('Cập nhật tỷ giá thành công! Chỉ áp dụng cho đơn hàng mới.');
        setShowExchangeRateModal(false);
        setExchangeRateInput('');
        setCurrentExchangeRate(rateValue);
        fetchDonHangList();
      } else {
        alert('Lỗi: ' + (response.error || 'Không thể cập nhật tỷ giá'));
      }
    } catch (error) {
      console.error('Lỗi cập nhật tỷ giá:', error);
      alert('Có lỗi xảy ra khi cập nhật tỷ giá');
    } finally {
      setIsUpdatingExchangeRate(false);
    }
  };

  const handleViewHistoryDetail = (history) => {
    setSelectedHistory(history);
    setShowHistoryDetailModal(true);
  };

  const handleNhanXuLy = async (bet) => {
    const betId = bet.id;
    try {
      const response = await donHangAPI.capNhatStatusDonHang(betId, { status: 'ĐANG THỰC HIỆN' });
      if (response.success && response.data) {
        fetchDonHangList();
      } else {
        alert('Lỗi: ' + (response.error || 'Không thể nhận đơn'));
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi nhận đơn');
    }
  };

  const handleBetStatusChange = async (bet, e) => {
    const newStatus = e.target.value;
    const betId = bet.id;
    if (newStatus === 'HỦY BỎ') {
      setCancelModalData({ betId, oldStatus: bet.status, actualReceivedCNY: '', userCutCNY: '', cancelReason: '' });
      setShowCancelModal(true);
      return;
    }
    if (newStatus === 'ĐỀN') {
      setCompensationModalData({ betId, oldStatus: bet.status, compensationCNY: '', userCutCNY: '', cancelReason: '' });
      setShowCompensationModal(true);
      return;
    }
    setBetList((prev) => prev.map((item) => (item.id === betId ? { ...item, status: newStatus } : item)));
    try {
      const response = await donHangAPI.capNhatStatusDonHang(betId, { status: newStatus });
      if (response.success && response.data) {
        const actualAmount = (response.data.status === 'DONE' || response.data.status === 'HỦY BỎ' || response.data.status === 'ĐỀN') ? (response.data.actual_amount_cny || 0) : 0;
        setBetList((prev) => prev.map((item) => (item.id === betId ? { ...item, status: response.data.status, actualAmount, actualReceived: response.data.actual_received_cny !== undefined ? response.data.actual_received_cny : item.actualReceived, compensation: response.data.status === 'ĐỀN' ? (response.data.compensation_cny ?? item.compensation) : 0 } : item)));
        fetchDonHangList();
        if (['DONE', 'HỦY BỎ', 'ĐỀN'].includes(response.data.status)) {
          const evDetail = { id: betId, status: response.data.status };
          setTimeout(dispatchWalletRefresh, 300);
          setTimeout(() => window.dispatchEvent(new CustomEvent('bet-receipt-status-changed', { detail: evDetail })), 400);
        }
      } else {
        alert('Lỗi: ' + (response.error || 'Không thể cập nhật status'));
        setBetList((prev) => prev.map((item) => (item.id === betId ? { ...item, status: bet.status } : item)));
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi cập nhật status');
      setBetList((prev) => prev.map((item) => (item.id === betId ? { ...item, status: bet.status } : item)));
    }
  };

  const renderBetTable = (betListToRender, showSubTabs = true, allowStatusChange = true, showRecalculateButton = true, isLoadingOverride = null) => (
    <div className="admin-tab-content">
      {showSubTabs && (
        <div className="rut-tien-sub-tabs">
          <div className="rut-tien-sub-tabs-left">
            {statusTabs.map((tab) => (
              <button key={tab.key} className={`rut-tien-sub-tab ${activeDonHangTab === tab.key ? 'active' : ''}`} onClick={() => setActiveDonHangTab(tab.key)}>
                {tab.label}
                {tab.key === 'don-hang-moi' && donHangMoiCount > 0 && (
                  <span className="cho-duyet-badge" title={`${donHangMoiCount} đơn hàng mới`}>{donHangMoiCount}</span>
                )}
                {tab.key === 'cho-chap-nhan' && choChapNhanCount > 0 && (
                  <span className="cho-duyet-badge" title={`${choChapNhanCount} đơn chờ chấp nhận`}>{choChapNhanCount}</span>
                )}
              </button>
            ))}
          </div>
          <div className="wallet-action-buttons">
            <button className="btn-create-don-hang" onClick={() => setShowCreateModal(true)} style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>➕ Tạo đơn hàng</button>
            {/* {activeDonHangTab === 'tong-hop' && (
              <button className="btn-update-exchange-rate" onClick={async () => { setShowExchangeRateModal(true); setExchangeRateInput(''); setIsLoadingCurrentRate(true); try { const r = await donHangAPI.layTyGiaHienTai(); if (r.success) { setCurrentExchangeRate(r.exchange_rate ?? null); setCurrentConfigRest({ admin_receive_rate: r.admin_receive_rate ?? 3850, admin_keep_pct: r.admin_keep_pct ?? 60 }); } else { setCurrentExchangeRate(null); } } catch (e) { setCurrentExchangeRate(null); } finally { setIsLoadingCurrentRate(false); } }} style={{ padding: '10px 20px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginLeft: '10px' }}>💱 Cập nhật tỷ giá</button>
            )} */}
          </div>
        </div>
      )}
      <div className="bet-list-table-wrapper">
        <table className="bet-list-table">
          <thead>
            <tr>
              <th>STT</th><th>Tên</th><th>Admin</th><th>Thời gian nhận kèo</th><th>Deadline (Giờ)</th><th>Nhiệm vụ</th><th>Loại kèo</th><th>Tiền kèo web</th><th>Mã đơn hàng</th><th>Link nhận kèo</th><th>Ghi chú</th><th>Thời gian còn lại</th><th>Tiến độ hoàn thành</th><th>Tiền kèo thực nhận</th><th>Tiền đền</th><th>Công thực nhận</th><th>Thao tác</th><th>Tài khoản</th><th>Mật khẩu</th><th>Khu vực</th><th>Ngày hoàn thành</th><th>Thời gian hoàn thành thực tế</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingDonHang ? (
              <tr><td colSpan="23" style={{ textAlign: 'center', padding: '20px' }}>Đang tải...</td></tr>
            ) : betListToRender.length === 0 ? (
              <tr><td colSpan="23" style={{ textAlign: 'center', padding: '20px' }}>Chưa có dữ liệu</td></tr>
            ) : (
              betListToRender.map((bet) => (
                <tr key={bet.id}>
                  <td>{bet.stt || bet.id}</td>
                  <td>{bet.name}</td>
                  <td>{bet.assigned_admin_name || '-'}</td>
                  <td>{bet.receivedAt ? new Date(bet.receivedAt).toLocaleString('vi-VN') : ''}</td>
                  <td>{bet.timeRemainingHours || ''}</td>
                  <td>{bet.task}</td>
                  <td>{bet.betType}</td>
                  <td>{bet.webBet}</td>
                  <td>{bet.orderCode || ''}</td>
                  <td>
                    {bet.orderLink ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <a href={bet.orderLink} target="_blank" rel="noreferrer" style={{ color: '#1976d2', textDecoration: 'underline' }}>Mở kèo</a>
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyLink(bet.orderLink); }} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontSize: '12px' }} title="Copy link">Copy</button>
                      </div>
                    ) : ''}
                  </td>
                  <td>{bet.note}</td>
                  <td>{bet.status !== 'DONE' ? (bet.timeRemainingFormatted || bet.timeRemainingHours || '') : ''}</td>
                  <td>
                    {allowStatusChange ? (
                      <select className={`status-select ${getStatusClass(bet.status)}`} value={bet.status} onChange={(e) => handleBetStatusChange(bet, e)}>
                        <option value="Đơn hàng mới">Đơn hàng mới</option>
                        <option value="Chờ chấp nhận">Chờ chấp nhận</option>
                        <option value="ĐANG THỰC HIỆN">ĐANG THỰC HIỆN</option>
                        <option value="DONE">DONE</option>
                        <option value="HỦY BỎ">HỦY BỎ</option>
                        <option value="ĐỀN">ĐỀN</option>
                        <option value="ĐANG QUÉT MÃ">ĐANG QUÉT MÃ</option>
                        <option value="CHỜ TRỌNG TÀI">CHỜ TRỌNG TÀI</option>
                      </select>
                    ) : (
                      <span className={`status-select ${getStatusClass(bet.status)}`} style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', cursor: 'default', pointerEvents: 'none' }}>{bet.status}</span>
                    )}
                  </td>
                  <td>{bet.actualReceived || ''}</td>
                  <td>{bet.status === 'ĐỀN' ? (bet.compensation || '') : ''}</td>
                  <td>{((bet.status === 'DONE' || bet.status === 'HỦY BỎ' || bet.status === 'ĐỀN') && bet.actualAmount) ? bet.actualAmount.toString() : ''}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {bet.status === 'Chờ chấp nhận' && (
                        <button onClick={() => handleNhanXuLy(bet)} style={{ padding: '6px 12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }} title="Chấp nhận đơn và chuyển sang đang thực hiện">✓ Chấp nhận</button>
                      )}
                      <button onClick={() => handleEditBet(bet)} style={{ padding: '6px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>✏️ Chỉnh sửa</button>
                      {showRecalculateButton && (bet.status === 'DONE' || bet.status === 'HỦY BỎ' || bet.status === 'ĐỀN') && <button onClick={() => handleRecalculateAmount(bet.id)} style={{ padding: '6px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }} title="Tính lại tệ">💰 Tính tệ</button>}
                      <button onClick={() => handleDeleteBet(bet.id)} style={{ padding: '6px 12px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>🗑️ Xóa</button>
                    </div>
                  </td>
                  <td>{bet.account || '-'}</td><td>{bet.password || '-'}</td><td>{bet.region || '-'}</td>
                  <td>{bet.completedAt ? new Date(bet.completedAt).toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td>{bet.completedHours || ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBetsContent = () => {
    if (activeTopTab === 'don-hang-da-xu-li') {
      return renderBetTable(filteredProcessedBetList, false, false, false, isLoadingProcessed);
    }
    if (activeTopTab === 'lich-su-chinh-sua') {
      return (
        <div className="admin-tab-content">
          <div className="rut-tien-sub-tabs" style={{ justifyContent: 'center', marginBottom: '10px' }}>
            <h2 style={{ margin: 0, padding: '8px 16px', fontSize: '16px', fontWeight: '600', color: '#333', textAlign: 'center' }}>Thông tin chỉnh sửa</h2>
          </div>
          <div className="bet-list-table-wrapper">
            {isLoadingHistory ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Đang tải lịch sử...</div>
            ) : historyList.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Chưa có lịch sử chỉnh sửa</div>
            ) : (
              <table className="bet-list-table history-edit-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Thời gian</th>
                    <th>Mã đơn hàng</th>
                    <th className="history-col-action">Hành động</th>
                    <th>Người thực hiện</th>
                    <th>Mô tả</th>
                    <th className="history-col-thao-tac">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((history, index) => {
                    let orderCode = '';
                    try {
                      if (history.new_data) {
                        const newData = typeof history.new_data === 'string' ? JSON.parse(history.new_data) : history.new_data;
                        orderCode = newData.order_code || '';
                      }
                      if (!orderCode && history.old_data) {
                        const oldData = typeof history.old_data === 'string' ? JSON.parse(history.old_data) : history.old_data;
                        orderCode = oldData.order_code || '';
                      }
                    } catch (e) {}
                    const displayValue = orderCode || '(Trống)';
                    const isUpdate = history.action === 'UPDATE';
                    return (
                      <tr key={history.id}>
                        <td>{index + 1}</td>
                        <td>{formatDateTime(history.created_at)}</td>
                        <td style={{ fontSize: '10px' }}>{displayValue}</td>
                        <td className="history-col-action">
                          <span className={`history-action-badge ${isUpdate ? 'history-action-update' : 'history-action-delete'}`} title={history.action}>
                            {isUpdate ? 'Cập nhật' : 'Xóa'}
                          </span>
                        </td>
                        <td>{history.performed_by_name || 'N/A'}</td>
                        <td>{history.description || '-'}</td>
                        <td className="history-col-thao-tac">
                          <button type="button" className="history-detail-btn" onClick={() => handleViewHistoryDetail(history)}>Chi tiết</button>
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
    if (activeTopTab === 'trang-thong-tin') {
      return renderBetTable(filteredBetList, true);
    }
    return null;
  };

  return (
    <>
      <div className="admin-top-tabs">
        <div className="admin-top-tabs-inner">
          <button className={`rut-tien-sub-tab ${activeTopTab === 'trang-thong-tin' ? 'active' : ''}`} onClick={() => setActiveTopTab('trang-thong-tin')}>Trang thông tin</button>
          <button className={`rut-tien-sub-tab ${activeTopTab === 'lich-su-chinh-sua' ? 'active' : ''}`} onClick={() => setActiveTopTab('lich-su-chinh-sua')}>Lịch sử chỉnh sửa</button>
          <button className={`rut-tien-sub-tab ${activeTopTab === 'don-hang-da-xu-li' ? 'active' : ''}`} onClick={() => setActiveTopTab('don-hang-da-xu-li')}>Đơn hàng đã xử lí</button>
        </div>
      </div>

      {activeTopTab === 'don-hang-da-xu-li' && (
        <div className="admin-profit-stats-filter" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <label className="admin-profit-stats-filter-label" style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>Lọc theo tháng:</label>
          <select
            className="admin-profit-stats-filter-select"
            value={filters.month}
            onChange={(e) => setFilters((prev) => ({ ...prev, month: e.target.value }))}
            title="Lọc theo tháng (Ngày hoàn thành)"
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', minWidth: '160px' }}
          >
            {processedMonthOptions.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="admin-content admin-tab-content">
        {renderBetsContent()}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setCreateModalLinkInput(''); setCreateFromLinkError(''); setFormData(getEmptyFormData()); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tạo đơn hàng mới</h2>
              <button className="modal-close" onClick={() => { setShowCreateModal(false); setCreateModalLinkInput(''); setCreateFromLinkError(''); setFormData(getEmptyFormData()); }}>✕</button>
            </div>
            <form onSubmit={handleCreateDonHang} className="create-don-hang-form">
              <div className="form-group" style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #eee' }}>
                <label>Tạo từ link</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="https://m.dailiantong.com/...#/pages/orderdetail/..."
                    value={createModalLinkInput}
                    onChange={(e) => { setCreateModalLinkInput(e.target.value); setCreateFromLinkError(''); }}
                    disabled={isFetchingLinkInfo}
                    style={{ flex: '1', minWidth: '200px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <button
                    type="button"
                    onClick={handleFetchOrderFromLink}
                    disabled={isFetchingLinkInfo || !createModalLinkInput.trim()}
                    style={{
                      padding: '10px 18px',
                      background: isFetchingLinkInfo || !createModalLinkInput.trim() ? '#ccc' : '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: isFetchingLinkInfo || !createModalLinkInput.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isFetchingLinkInfo ? 'Đang lấy...' : 'Lấy thông tin'}
                  </button>
                </div>
                {createFromLinkError && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', background: '#ffebee', color: '#c62828', borderRadius: '6px', fontSize: '13px' }}>{createFromLinkError}</div>
                )}
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#666' }}>Dán link đơn hàng, bấm &quot;Lấy thông tin&quot; để điền sẵn các trường bên dưới, sau đó chọn tên user và bấm &quot;Xác nhận tạo đơn&quot;.</p>
              </div>
              <div className="form-group">
                <label htmlFor="user_name">Tên <span className="required">*</span></label>
                <div className="autocomplete-wrapper" ref={userInputRef}>
                  <input type="text" id="user_name" name="user_name" value={formData.user_name} onChange={handleUserNameChange} onFocus={() => setShowUserDropdown(true)} required placeholder="Gõ để tìm kiếm tên người dùng" autoComplete="off" />
                  {showUserDropdown && filteredUserList.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {filteredUserList.map((u) => (
                        <div key={u.id} className="autocomplete-item" onClick={() => handleUserSelect(u.name)}>{u.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="task_code">Nhiệm vụ <span className="required">*</span></label>
                <input type="text" id="task_code" name="task_code" value={formData.task_code} onChange={handleFormChange} required placeholder="VD: kc4-96-ct" autoComplete="off" />
              </div>
              <div className="form-group">
                <label htmlFor="bet_type">Loại kèo <span className="required">*</span></label>
                <div className="autocomplete-wrapper" ref={betTypeInputRef}>
                  <input type="text" id="bet_type" name="bet_type" value={formData.bet_type} onFocus={() => setShowBetTypeDropdown(true)} onClick={() => setShowBetTypeDropdown(true)} readOnly required placeholder="Chọn loại kèo" style={{ cursor: 'pointer' }} />
                  {showBetTypeDropdown && (
                    <div className="autocomplete-dropdown">
                      {betTypeOptions.map((opt) => (
                        <div key={opt} className="autocomplete-item" onClick={() => handleBetTypeSelect(opt)}>{opt}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="web_bet_amount_cny">Tiền kèo web ¥ <span className="required">*</span></label>
                <input type="text" id="web_bet_amount_cny" name="web_bet_amount_cny" value={formData.web_bet_amount_cny} onChange={handleFormChange} required placeholder="0.00" inputMode="decimal" />
              </div>
              <div className="form-group">
                <label htmlFor="order_code">Mã đơn hàng</label>
                <input type="text" id="order_code" name="order_code" value={formData.order_code} onChange={handleFormChange} placeholder="Tùy chọn" autoComplete="off" />
              </div>
              <div className="form-group">
                <label htmlFor="notes">Ghi chú</label>
                <input type="text" id="notes" name="notes" value={formData.notes} onChange={handleFormChange} placeholder="Tùy chọn" autoComplete="off" />
              </div>
              <div className="form-group">
                <label htmlFor="completed_hours">Thời gian hoàn thành (giờ)</label>
                <input type="text" id="completed_hours" name="completed_hours" value={formData.completed_hours} onChange={handleFormChange} placeholder="VD: 40" inputMode="numeric" />
              </div>
              <div className="form-group">
                <label htmlFor="account">Tài khoản</label>
                <input type="text" id="account" name="account" value={formData.account} onChange={handleFormChange} placeholder="Tài khoản" autoComplete="off" />
              </div>
              <div className="form-group">
                <label htmlFor="password">Mật khẩu</label>
                <input type="text" id="password" name="password" value={formData.password} onChange={handleFormChange} placeholder="Mật khẩu" autoComplete="off" />
              </div>
              <div className="form-group">
                <label htmlFor="region">Khu vực</label>
                <input type="text" id="region" name="region" value={formData.region} onChange={handleFormChange} placeholder="Khu vực" autoComplete="off" />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => { setShowCreateModal(false); setCreateModalLinkInput(''); setCreateFromLinkError(''); setFormData(getEmptyFormData()); }} disabled={isCreating}>Hủy</button>
                <button type="submit" className="btn-submit" disabled={isCreating}>{isCreating ? 'Đang tạo...' : 'Xác nhận tạo đơn'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={() => { setShowEditModal(false); setEditingBetId(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Chỉnh sửa đơn hàng</h2>
              <button className="modal-close" onClick={() => { setShowEditModal(false); setEditingBetId(null); }}>✕</button>
            </div>
            <form onSubmit={handleUpdateDonHang} className="create-don-hang-form">
              <div className="form-group">
                <label>Tên <span className="required">*</span></label>
                <div className="autocomplete-wrapper" ref={userInputRef}>
                  <input type="text" name="user_name" value={formData.user_name} onChange={handleUserNameChange} onFocus={() => setShowUserDropdown(true)} required placeholder="Gõ để tìm tên" autoComplete="off" />
                  {showUserDropdown && filteredUserList.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {filteredUserList.map((u) => (
                        <div key={u.id} className="autocomplete-item" onClick={() => handleUserSelect(u.name)}>{u.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Nhiệm vụ <span className="required">*</span></label>
                <input type="text" name="task_code" value={formData.task_code} onChange={handleFormChange} required />
              </div>
              <div className="form-group">
                <label>Loại kèo <span className="required">*</span></label>
                <div className="autocomplete-wrapper" ref={betTypeInputRef}>
                  <input type="text" name="bet_type" value={formData.bet_type} onFocus={() => setShowBetTypeDropdown(true)} readOnly required style={{ cursor: 'pointer' }} />
                  {showBetTypeDropdown && (
                    <div className="autocomplete-dropdown">
                      {betTypeOptions.map((opt) => (
                        <div key={opt} className="autocomplete-item" onClick={() => handleBetTypeSelect(opt)}>{opt}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Tiền kèo web ¥ <span className="required">*</span></label>
                <input type="text" name="web_bet_amount_cny" value={formData.web_bet_amount_cny} onChange={handleFormChange} required />
              </div>
              <div className="form-group">
                <label>Mã đơn hàng</label>
                <input type="text" name="order_code" value={formData.order_code} onChange={handleFormChange} />
              </div>
              <div className="form-group">
                <label>Ghi chú</label>
                <input type="text" name="notes" value={formData.notes} onChange={handleFormChange} />
              </div>
              <div className="form-group">
                <label>Thời gian hoàn thành (giờ)</label>
                <input type="text" name="completed_hours" value={formData.completed_hours} onChange={handleFormChange} />
              </div>
              <div className="form-group">
                <label>Tài khoản</label>
                <input type="text" name="account" value={formData.account} onChange={handleFormChange} />
              </div>
              <div className="form-group">
                <label>Mật khẩu</label>
                <input type="text" name="password" value={formData.password} onChange={handleFormChange} />
              </div>
              <div className="form-group">
                <label>Khu vực</label>
                <input type="text" name="region" value={formData.region} onChange={handleFormChange} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => { setShowEditModal(false); setEditingBetId(null); }} disabled={isUpdating}>Hủy</button>
                <button type="submit" className="btn-submit" disabled={isUpdating}>{isUpdating ? 'Đang cập nhật...' : 'Xác nhận cập nhật'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="modal-overlay" onClick={() => { setShowCancelModal(false); setCancelModalData({ betId: '', oldStatus: '', actualReceivedCNY: '', userCutCNY: '', cancelReason: '' }); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Hủy bỏ đơn hàng</h2>
              <button className="modal-close" onClick={() => { setShowCancelModal(false); setCancelModalData({ betId: '', oldStatus: '', actualReceivedCNY: '', userCutCNY: '', cancelReason: '' }); }}>✕</button>
            </div>
            <form onSubmit={handleCancelStatus} className="create-don-hang-form">
              <div className="form-group">
                <label>Tiền kèo thực nhận ¥ <span className="required">*</span></label>
                <input type="text" value={cancelModalData.actualReceivedCNY} onChange={(e) => setCancelModalData({ ...cancelModalData, actualReceivedCNY: e.target.value.replace(/[^\d.]/g, '') })} required placeholder="VD: 100.5 hoặc 0" inputMode="decimal" />
              </div>
              <div className="form-group">
                <label>Tiền cắt (¥)</label>
                <input
                  type="text"
                  value={cancelModalData.userCutCNY}
                  onChange={(e) => setCancelModalData({ ...cancelModalData, userCutCNY: e.target.value.replace(/[^\d.]/g, '') })}
                  placeholder="VD: 10 (mặc định 0)"
                  inputMode="decimal"
                />
              </div>
              <div className="form-group">
                <label>Lý do hủy bỏ <span className="required">*</span></label>
                <textarea value={cancelModalData.cancelReason} onChange={(e) => setCancelModalData({ ...cancelModalData, cancelReason: e.target.value })} placeholder="Nhập lý do hủy bỏ" rows={3} required style={{ width: '100%', resize: 'vertical' }} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => { setShowCancelModal(false); setCancelModalData({ betId: '', oldStatus: '', actualReceivedCNY: '', userCutCNY: '', cancelReason: '' }); }}>Hủy</button>
                <button type="submit" className="btn-submit">Xác nhận hủy bỏ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCompensationModal && (
        <div className="modal-overlay" onClick={() => { setShowCompensationModal(false); setCompensationModalData({ betId: '', oldStatus: '', compensationCNY: '', userCutCNY: '', cancelReason: '' }); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Đền đơn hàng</h2>
              <button className="modal-close" onClick={() => { setShowCompensationModal(false); setCompensationModalData({ betId: '', oldStatus: '', compensationCNY: '', userCutCNY: '', cancelReason: '' }); }}>✕</button>
            </div>
            <form onSubmit={handleCompensationStatus} className="create-don-hang-form">
              <div className="form-group">
                <label>Tiền đền (CNY) <span className="required">*</span></label>
                <input type="text" value={compensationModalData.compensationCNY} onChange={(e) => setCompensationModalData({ ...compensationModalData, compensationCNY: e.target.value.replace(/[^\d.]/g, '') })} required placeholder="VD: 100.5" inputMode="decimal" />
              </div>
              <div className="form-group">
                <label>Tiền cắt (¥)</label>
                <input
                  type="text"
                  value={compensationModalData.userCutCNY}
                  onChange={(e) => setCompensationModalData({ ...compensationModalData, userCutCNY: e.target.value.replace(/[^\d.]/g, '') })}
                  placeholder="VD: 10 (mặc định 0)"
                  inputMode="decimal"
                />
              </div>
              <div className="form-group">
                <label>Lý do đền <span className="required">*</span></label>
                <textarea value={compensationModalData.cancelReason} onChange={(e) => setCompensationModalData({ ...compensationModalData, cancelReason: e.target.value })} placeholder="Nhập lý do đền" rows={3} required style={{ width: '100%', resize: 'vertical' }} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => { setShowCompensationModal(false); setCompensationModalData({ betId: '', oldStatus: '', compensationCNY: '', userCutCNY: '', cancelReason: '' }); }}>Hủy</button>
                <button type="submit" className="btn-submit">Xác nhận đền</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExchangeRateModal && (
        <div className="reason-modal-overlay" onClick={() => setShowExchangeRateModal(false)}>
          <div className="reason-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="reason-modal-header">
              <h3>Cập nhật tỷ giá</h3>
              <button className="reason-modal-close" onClick={() => setShowExchangeRateModal(false)} type="button">×</button>
            </div>
            <div className="reason-modal-body">
              <p style={{ marginBottom: '16px', color: '#666' }}>Nhập tỷ giá trả user mới (VND/¥). Chỉ áp dụng cho đơn hàng mới; đơn đã xử lí giữ nguyên tỷ giá đã lưu.</p>
              <form onSubmit={handleUpdateExchangeRate}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label htmlFor="exchange_rate">Tỷ giá mới (VND/CNY) <span className="required">*</span></label>
                  <input type="number" id="exchange_rate" value={exchangeRateInput} onChange={(e) => setExchangeRateInput(e.target.value)} placeholder="VD: 3800" min="0" step="0.01" required style={{ width: '100%', padding: '10px', fontSize: '16px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' }} />
                  {isLoadingCurrentRate ? <p style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>Đang tải tỷ giá...</p> : currentExchangeRate !== null ? <p style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>Tỷ giá hiện tại: <strong style={{ color: '#f59e0b' }}>{currentExchangeRate.toLocaleString('vi-VN')}</strong></p> : null}
                </div>
                <div className="reason-modal-footer">
                  <button type="button" className="reason-modal-button" onClick={() => setShowExchangeRateModal(false)} style={{ marginRight: '10px', background: '#6b7280' }}>Hủy</button>
                  <button type="submit" className="reason-modal-button" disabled={isUpdatingExchangeRate} style={{ background: '#f59e0b' }}>{isUpdatingExchangeRate ? 'Đang cập nhật...' : 'Xác nhận'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showHistoryDetailModal && selectedHistory && (
        <div className="modal-overlay" onClick={() => setShowHistoryDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>Chi tiết lịch sử chỉnh sửa</h2>
              <button className="modal-close" onClick={() => setShowHistoryDetailModal(false)}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <strong>Hành động:</strong>{' '}
                <span className={`history-action-badge ${selectedHistory.action === 'UPDATE' ? 'history-action-update' : 'history-action-delete'}`}>{selectedHistory.action === 'UPDATE' ? 'Cập nhật' : 'Xóa'}</span>
              </div>
              <div style={{ marginBottom: '10px' }}><strong>Mã đơn hàng:</strong> {selectedHistory.old_data || selectedHistory.new_data ? (() => {
                try {
                  const data = selectedHistory.new_data || selectedHistory.old_data;
                  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                  return parsed?.order_code || '(Trống)';
                } catch (e) { return '(Trống)'; }
              })() : '(Trống)'}</div>
              <div style={{ marginBottom: '10px' }}><strong>Thời gian:</strong> {formatDateTime(selectedHistory.created_at)}</div>
              <div style={{ marginBottom: '10px' }}><strong>Người thực hiện:</strong> {selectedHistory.performed_by_name || 'N/A'}</div>
              {selectedHistory.description && <div style={{ marginBottom: '20px' }}><strong>Mô tả:</strong> {selectedHistory.description}</div>}

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
                        const parseIfString = (v) => { if (v == null || v === '') return {}; return typeof v === 'string' ? JSON.parse(v) : v; };
                        const oldData = selectedHistory.old_data ? parseIfString(selectedHistory.old_data) : {};
                        const newData = selectedHistory.new_data ? parseIfString(selectedHistory.new_data) : {};
                        const changedFields = selectedHistory.changed_fields ? parseIfString(selectedHistory.changed_fields) : {};
                        const changedFieldKeys = Object.keys(changedFields);

                        const mapToBetFormat = (data) => ({
                          stt: data.stt || '',
                          name: data.user_name || '',
                          receivedAt: data.received_at || '',
                          completedHours: data.completed_hours || '',
                          task: data.task_code || '',
                          betType: data.bet_type || '',
                          webBet: data.web_bet_amount_cny ?? 0,
                          orderCode: data.order_code || '',
                          note: data.notes || '',
                          timeRemainingFormatted: data.time_remaining_formatted || '',
                          timeRemainingHours: data.time_remaining_hours || '',
                          status: data.status || '',
                          actualReceived: data.actual_received_cny ?? 0,
                          compensation: data.compensation_cny ?? 0,
                          actualAmount: data.actual_amount_cny ?? 0,
                        });

                        const oldBet = mapToBetFormat(oldData);
                        const newBet = mapToBetFormat(newData);

                        const fieldMapping = {
                          stt: 'stt', name: 'user_name', receivedAt: 'received_at', completedHours: 'completed_hours',
                          task: 'task_code', betType: 'bet_type', webBet: 'web_bet_amount_cny', orderCode: 'order_code',
                          note: 'notes', timeRemainingFormatted: 'time_remaining_formatted', timeRemainingHours: 'time_remaining_hours',
                          status: 'status', actualReceived: 'actual_received_cny', compensation: 'compensation_cny', actualAmount: 'actual_amount_cny',
                        };
                        const isChanged = (fieldKey) => changedFieldKeys.includes(fieldMapping[fieldKey] || fieldKey);

                        const formatCellValue = (value, isDate = false) => {
                          if (value === null || value === undefined || value === '') return '';
                          if (isDate && value) return new Date(value).toLocaleString('vi-VN');
                          return String(value);
                        };

                        const cellStyleOld = (key) => ({ color: isChanged(key) ? '#f44336' : 'inherit', fontWeight: isChanged(key) ? '600' : 'normal' });
                        const cellStyleNew = (key) => ({ color: isChanged(key) ? '#2e7d32' : 'inherit', fontWeight: isChanged(key) ? '600' : 'normal' });

                        return (
                          <div>
                            <div style={{ marginBottom: '20px' }}>
                              <h4 style={{ marginBottom: '10px', color: '#f44336', fontSize: '14px', fontWeight: '600' }}>Trước khi sửa:</h4>
                              <table className="bet-list-table" style={{ width: '100%', fontSize: '11px' }}>
                                <thead>
                                  <tr>
                                    <th>STT</th><th>Tên</th><th>Thời gian nhận kèo</th><th>Deadline</th><th>Nhiệm vụ</th><th>Loại kèo</th><th>Tiền kèo web</th><th>Mã đơn hàng</th><th>Ghi chú</th><th>Thời gian còn lại</th><th>Tiến độ hoàn thành</th><th>Tiền kèo thực nhận</th><th>Tiền đền</th><th>Công thực nhận</th><th>Thời gian hoàn thành thực tế</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td style={cellStyleOld('stt')}>{oldBet.stt}</td>
                                    <td style={cellStyleOld('name')}>{oldBet.name}</td>
                                    <td style={cellStyleOld('receivedAt')}>{formatCellValue(oldBet.receivedAt, true)}</td>
                                    <td style={cellStyleOld('timeRemainingHours')}>{oldBet.timeRemainingHours || ''}</td>
                                    <td style={cellStyleOld('task')}>{oldBet.task}</td>
                                    <td style={cellStyleOld('betType')}>{oldBet.betType}</td>
                                    <td style={cellStyleOld('webBet')}>{oldBet.webBet}</td>
                                    <td style={cellStyleOld('orderCode')}>{oldBet.orderCode || ''}</td>
                                    <td style={cellStyleOld('note')}>{oldBet.note}</td>
                                    <td style={cellStyleOld('timeRemainingFormatted')}>{oldBet.status !== 'DONE' ? (oldBet.timeRemainingFormatted || oldBet.timeRemainingHours || '') : ''}</td>
                                    <td><span className={`status-badge ${getStatusClass(oldBet.status)}`} style={cellStyleOld('status')}>{oldBet.status}</span></td>
                                    <td style={cellStyleOld('actualReceived')}>{oldBet.actualReceived || ''}</td>
                                    <td style={cellStyleOld('compensation')}>{oldBet.status === 'ĐỀN' ? (oldBet.compensation || '') : ''}</td>
                                    <td style={cellStyleOld('actualAmount')}>{((oldBet.status === 'DONE' || oldBet.status === 'HỦY BỎ' || oldBet.status === 'ĐỀN') && oldBet.actualAmount) ? String(oldBet.actualAmount) : ''}</td>
                                    <td style={cellStyleOld('completedHours')}>{oldBet.completedHours || ''}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            <div>
                              <h4 style={{ marginBottom: '10px', color: '#4caf50', fontSize: '14px', fontWeight: '600' }}>Sau khi sửa:</h4>
                              <table className="bet-list-table" style={{ width: '100%', fontSize: '11px' }}>
                                <thead>
                                  <tr>
                                    <th>STT</th><th>Tên</th><th>Thời gian nhận kèo</th><th>Deadline</th><th>Nhiệm vụ</th><th>Loại kèo</th><th>Tiền kèo web</th><th>Mã đơn hàng</th><th>Ghi chú</th><th>Thời gian còn lại</th><th>Tiến độ hoàn thành</th><th>Tiền kèo thực nhận</th><th>Tiền đền</th><th>Công thực nhận</th><th>Thời gian hoàn thành thực tế</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td style={cellStyleNew('stt')}>{newBet.stt}</td>
                                    <td style={cellStyleNew('name')}>{newBet.name}</td>
                                    <td style={cellStyleNew('receivedAt')}>{formatCellValue(newBet.receivedAt, true)}</td>
                                    <td style={cellStyleNew('timeRemainingHours')}>{newBet.timeRemainingHours || ''}</td>
                                    <td style={cellStyleNew('task')}>{newBet.task}</td>
                                    <td style={cellStyleNew('betType')}>{newBet.betType}</td>
                                    <td style={cellStyleNew('webBet')}>{newBet.webBet}</td>
                                    <td style={cellStyleNew('orderCode')}>{newBet.orderCode || ''}</td>
                                    <td style={cellStyleNew('note')}>{newBet.note}</td>
                                    <td style={cellStyleNew('timeRemainingFormatted')}>{newBet.status !== 'DONE' ? (newBet.timeRemainingFormatted || newBet.timeRemainingHours || '') : ''}</td>
                                    <td><span className={`status-badge ${getStatusClass(newBet.status)}`} style={cellStyleNew('status')}>{newBet.status}</span></td>
                                    <td style={cellStyleNew('actualReceived')}>{newBet.actualReceived || ''}</td>
                                    <td style={cellStyleNew('compensation')}>{newBet.status === 'ĐỀN' ? (newBet.compensation || '') : ''}</td>
                                    <td style={cellStyleNew('actualAmount')}>{((newBet.status === 'DONE' || newBet.status === 'HỦY BỎ' || newBet.status === 'ĐỀN') && newBet.actualAmount) ? String(newBet.actualAmount) : ''}</td>
                                    <td style={cellStyleNew('completedHours')}>{newBet.completedHours || ''}</td>
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
                        const oldData = typeof selectedHistory.old_data === 'string' ? JSON.parse(selectedHistory.old_data) : selectedHistory.old_data;
                        const deletedBet = {
                          stt: oldData.stt || '',
                          name: oldData.user_name || '',
                          receivedAt: oldData.received_at || '',
                          completedHours: oldData.completed_hours || '',
                          task: oldData.task_code || '',
                          betType: oldData.bet_type || '',
                          webBet: oldData.web_bet_amount_cny ?? 0,
                          orderCode: oldData.order_code || '',
                          note: oldData.notes || '',
                          timeRemainingFormatted: oldData.time_remaining_formatted || '',
                          timeRemainingHours: oldData.time_remaining_hours || '',
                          status: oldData.status || '',
                          actualReceived: oldData.actual_received_cny ?? 0,
                          compensation: oldData.compensation_cny ?? 0,
                          actualAmount: oldData.actual_amount_cny ?? 0,
                        };
                        return (
                          <table className="bet-list-table" style={{ width: '100%', fontSize: '11px' }}>
                            <thead>
                              <tr>
                                <th>STT</th><th>Tên</th><th>Thời gian nhận kèo</th><th>Deadline</th><th>Thời gian hoàn thành thực tế</th><th>Nhiệm vụ</th><th>Loại kèo</th><th>Tiền kèo web</th><th>Mã đơn hàng</th><th>Ghi chú</th><th>Thời gian còn lại</th><th>Tiến độ hoàn thành</th><th>Tiền kèo thực nhận</th><th>Tiền đền</th><th>Công thực nhận</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>{deletedBet.stt}</td>
                                <td>{deletedBet.name}</td>
                                <td>{deletedBet.receivedAt ? new Date(deletedBet.receivedAt).toLocaleString('vi-VN') : ''}</td>
                                <td>{deletedBet.timeRemainingHours || ''}</td>
                                <td>{deletedBet.completedHours || ''}</td>
                                <td>{deletedBet.task}</td>
                                <td>{deletedBet.betType}</td>
                                <td>{deletedBet.webBet}</td>
                                <td>{deletedBet.orderCode || ''}</td>
                                <td>{deletedBet.note}</td>
                                <td>{deletedBet.status !== 'DONE' ? (deletedBet.timeRemainingFormatted || deletedBet.timeRemainingHours || '') : ''}</td>
                                <td><span className={`status-badge ${getStatusClass(deletedBet.status)}`}>{deletedBet.status}</span></td>
                                <td>{deletedBet.actualReceived || ''}</td>
                                <td>{deletedBet.status === 'ĐỀN' ? (deletedBet.compensation || '') : ''}</td>
                                <td>{((deletedBet.status === 'DONE' || deletedBet.status === 'HỦY BỎ' || deletedBet.status === 'ĐỀN') && deletedBet.actualAmount) ? String(deletedBet.actualAmount) : ''}</td>
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
              <button onClick={() => setShowHistoryDetailModal(false)} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminBetsSection;

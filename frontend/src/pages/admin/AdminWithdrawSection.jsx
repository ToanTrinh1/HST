import { useState, useRef, useEffect, useCallback } from 'react';
import { walletAPI } from '../../api/endpoints/wallet.api';
import { depositAPI } from '../../api/endpoints/deposit.api';
import { withdrawalAPI } from '../../api/endpoints/withdrawal.api';
import { userAPI } from '../../api/endpoints/user.api';

const AdminWithdrawSection = () => {
  const [activeRutTienTab, setActiveRutTienTab] = useState('danh-sach');
  const [walletList, setWalletList] = useState([]);
  const [totalCurrentBalanceVND, setTotalCurrentBalanceVND] = useState(0);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [depositHistory, setDepositHistory] = useState([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [isLoadingHistoryNapRut, setIsLoadingHistoryNapRut] = useState(false);

  const [depositFilters, setDepositFilters] = useState({ name: '', month: '', minAmount: '' });
  const [withdrawalFilters, setWithdrawalFilters] = useState({ name: '', month: '', minAmount: '' });
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

  const [showNapTienModal, setShowNapTienModal] = useState(false);
  const [isNapTien, setIsNapTien] = useState(false);
  const [napTienFormData, setNapTienFormData] = useState({ user_name: '', amount_vnd: '', notes: '' });

  const [showRutTienModal, setShowRutTienModal] = useState(false);
  const [isRutTien, setIsRutTien] = useState(false);
  const [rutTienFormData, setRutTienFormData] = useState({ user_name: '', amount_vnd: '', notes: '' });

  const [userList, setUserList] = useState([]);
  const [napTienFilteredUserList, setNapTienFilteredUserList] = useState([]);
  const [showNapTienUserDropdown, setShowNapTienUserDropdown] = useState(false);
  const [rutTienFilteredUserList, setRutTienFilteredUserList] = useState([]);
  const [showRutTienUserDropdown, setShowRutTienUserDropdown] = useState(false);
  const napTienUserInputRef = useRef(null);
  const rutTienUserInputRef = useRef(null);

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

  const formatBalanceDetail = (num) => {
    if (num === 0 || num === null || num === undefined) return '0';
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '0';
    const rounded = Math.round(numValue);
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const formatBalanceToMillion = (num) => {
    if (num === 0 || num === null || num === undefined) return '0';
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '0';
    if (numValue >= 1000000000) {
      const ty = numValue / 1000000000;
      const tyRounded = Math.round(ty * 10) / 10;
      if (tyRounded % 1 === 0) return `${tyRounded.toFixed(0)} tỷ`;
      return `${tyRounded.toFixed(1).replace('.', ',')} tỷ`;
    }
    if (numValue >= 1000000) {
      const trieu = numValue / 1000000;
      const trieuRounded = Math.round(trieu * 10) / 10;
      if (trieuRounded % 1 === 0) return `${trieuRounded.toFixed(0)} triệu`;
      return `${trieuRounded.toFixed(1).replace('.', ',')} triệu`;
    }
    const parts = numValue.toString().split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
  };

  const formatTotalBalance = (num) => {
    if (num === 0 || num === null || num === undefined) return '0 ~ 0 VND';
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '0 ~ 0 VND';
    return `${formatBalanceDetail(numValue)} ~ ${formatBalanceToMillion(numValue)} VND`;
  };

  const formatNumberInput = (value) => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parseFormattedNumber = (formattedValue) => {
    if (!formattedValue) return '';
    return formattedValue.replace(/\./g, '');
  };

  const formatNumberAbbr = (value) => {
    const numericValue = parseFloat(parseFormattedNumber(value));
    if (!numericValue || isNaN(numericValue)) return '';
    if (numericValue >= 1000000) {
      const millions = numericValue / 1000000;
      return (millions % 1 === 0 ? millions.toString() : millions.toFixed(1)) + 'M';
    }
    if (numericValue >= 1000) return Math.round(numericValue / 1000) + 'k';
    return numericValue.toString();
  };

  const fetchWalletList = useCallback(async () => {
    setIsLoadingWallet(true);
    try {
      const response = await walletAPI.layDanhSachWallets();
      if (response.success && response.data) {
        setWalletList(response.data);
        if (response.total_current_balance_vnd !== undefined) {
          setTotalCurrentBalanceVND(response.total_current_balance_vnd);
        }
      } else {
        setWalletList([]);
        setTotalCurrentBalanceVND(0);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách wallets:', error);
      setWalletList([]);
      setTotalCurrentBalanceVND(0);
    } finally {
      setIsLoadingWallet(false);
    }
  }, []);

  const fetchHistoryRut = useCallback(async () => {
    setIsLoadingHistoryNapRut(true);
    try {
      const withdrawalResponse = await withdrawalAPI.layTatCaLichSu();
      if (withdrawalResponse.success && withdrawalResponse.data) {
        setWithdrawalHistory(withdrawalResponse.data);
      } else {
        setWithdrawalHistory([]);
      }
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử rút tiền:', error);
      setWithdrawalHistory([]);
    } finally {
      setIsLoadingHistoryNapRut(false);
    }
  }, []);

  const fetchHistoryNap = useCallback(async () => {
    setIsLoadingHistoryNapRut(true);
    try {
      const depositResponse = await depositAPI.layTatCaLichSu();
      if (depositResponse.success && depositResponse.data) {
        setDepositHistory(depositResponse.data);
      } else {
        setDepositHistory([]);
      }
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử nạp tiền:', error);
      setDepositHistory([]);
    } finally {
      setIsLoadingHistoryNapRut(false);
    }
  }, []);

  const fetchUserList = useCallback(async () => {
    try {
      const response = await userAPI.getAllUsers(1000, 0);
      if (response.success && response.data) {
        setUserList(response.data);
        setNapTienFilteredUserList(response.data);
        setRutTienFilteredUserList(response.data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách users:', error);
    }
  }, []);

  useEffect(() => {
    if (activeRutTienTab === 'danh-sach') fetchWalletList();
  }, [activeRutTienTab, fetchWalletList]);

  // Lắng nghe sự kiện refresh wallet từ AdminBetsSection (sau khi đổi status DONE/HỦY BỎ/ĐỀN)
  useEffect(() => {
    const handler = () => fetchWalletList();
    window.addEventListener('admin-wallet-refresh', handler);
    return () => window.removeEventListener('admin-wallet-refresh', handler);
  }, [fetchWalletList]);

  useEffect(() => {
    if (activeRutTienTab === 'lich-su-rut') fetchHistoryRut();
  }, [activeRutTienTab, fetchHistoryRut]);

  useEffect(() => {
    if (activeRutTienTab === 'lich-su-nap') fetchHistoryNap();
  }, [activeRutTienTab, fetchHistoryNap]);

  useEffect(() => {
    if (showNapTienModal || showRutTienModal) fetchUserList();
  }, [showNapTienModal, showRutTienModal, fetchUserList]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (napTienUserInputRef.current && !napTienUserInputRef.current.contains(event.target)) {
        setShowNapTienUserDropdown(false);
      }
      if (rutTienUserInputRef.current && !rutTienUserInputRef.current.contains(event.target)) {
        setShowRutTienUserDropdown(false);
      }
    };
    if (showNapTienUserDropdown || showRutTienUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNapTienUserDropdown, showRutTienUserDropdown]);

  const handleNapTienUserNameChange = (e) => {
    const value = e.target.value;
    setNapTienFormData({ ...napTienFormData, user_name: value });
    setShowNapTienUserDropdown(true);
    if (value.trim() === '') {
      setNapTienFilteredUserList(userList);
    } else {
      setNapTienFilteredUserList(userList.filter((u) => u.name.toLowerCase().includes(value.toLowerCase())));
    }
  };

  const handleNapTienUserSelect = (userName) => {
    setNapTienFormData({ ...napTienFormData, user_name: userName });
    setShowNapTienUserDropdown(false);
  };

  const handleRutTienUserNameChange = (e) => {
    const value = e.target.value;
    setRutTienFormData({ ...rutTienFormData, user_name: value });
    setShowRutTienUserDropdown(true);
    if (value.trim() === '') {
      setRutTienFilteredUserList(userList);
    } else {
      setRutTienFilteredUserList(userList.filter((u) => u.name.toLowerCase().includes(value.toLowerCase())));
    }
  };

  const handleRutTienUserSelect = (userName) => {
    setRutTienFormData({ ...rutTienFormData, user_name: userName });
    setShowRutTienUserDropdown(false);
  };

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
      const response = await depositAPI.napTien({
        user_name: napTienFormData.user_name,
        amount_vnd: amountValue,
        notes: napTienFormData.notes || '',
      });
      if (response.success) {
        alert('Nạp tiền thành công!');
        setShowNapTienModal(false);
        setNapTienFormData({ user_name: '', amount_vnd: '', notes: '' });
        fetchWalletList();
        if (activeRutTienTab === 'lich-su-nap') fetchHistoryNap();
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
      const response = await withdrawalAPI.rutTien({
        user_name: rutTienFormData.user_name,
        amount_vnd: amountValue,
        notes: rutTienFormData.notes || '',
      });
      if (response.success) {
        alert('Rút tiền thành công!');
        setShowRutTienModal(false);
        setRutTienFormData({ user_name: '', amount_vnd: '', notes: '' });
        fetchWalletList();
        if (activeRutTienTab === 'lich-su-rut') fetchHistoryRut();
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

  const formatNumber = (num) => {
    if (num === 0 || num === null || num === undefined) return '0';
    const parts = num.toString().split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
  };

  return (
    <>
      <div className="admin-tab-content">
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
            <span className="total-balance-value">{formatTotalBalance(totalCurrentBalanceVND)}</span>
          </div>
          <div className="wallet-action-buttons">
            <button
              className="btn-nap-tien"
              onClick={() => {
                setShowNapTienModal(true);
                setNapTienFormData({ user_name: '', amount_vnd: '', notes: '' });
              }}
            >
              Nạp tiền
            </button>
            <button
              className="btn-rut-tien"
              onClick={() => {
                setShowRutTienModal(true);
                setRutTienFormData({ user_name: '', amount_vnd: '', notes: '' });
              }}
            >
              Rút tiền
            </button>
          </div>
        </div>

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
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Đang tải lịch sử...</div>
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
                            onChange={(e) => setWithdrawalFilters({ ...withdrawalFilters, month: e.target.value })}
                            onBlur={() =>
                              setTimeout(
                                () => setShowWithdrawalFilterInputs((prev) => ({ ...prev, month: false })),
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
                            onChange={(e) => setWithdrawalFilters({ ...withdrawalFilters, name: e.target.value })}
                            onBlur={() =>
                              setTimeout(
                                () => setShowWithdrawalFilterInputs((prev) => ({ ...prev, name: false })),
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
                              setShowWithdrawalFilterInputs((prev) => ({ ...prev, minAmount: !prev.minAmount }));
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
                                () => setShowWithdrawalFilterInputs((prev) => ({ ...prev, minAmount: false })),
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
                      if (
                        withdrawalFilters.name &&
                        !(withdrawal.user_name || '').toLowerCase().includes(withdrawalFilters.name.toLowerCase())
                      )
                        return false;
                      if (withdrawalFilters.month) {
                        const d = new Date(withdrawal.created_at);
                        if (!isNaN(d.getTime())) {
                          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                          if (monthKey !== withdrawalFilters.month) return false;
                        }
                      }
                      if (withdrawalFilters.minAmount) {
                        const minVal = parseFloat(withdrawalFilters.minAmount);
                        if (!isNaN(minVal) && withdrawal.amount_vnd < minVal) return false;
                      }
                      return true;
                    })
                    .map((withdrawal) => (
                      <tr key={withdrawal.id}>
                        <td>{formatDateTime(withdrawal.created_at)}</td>
                        <td>{withdrawal.user_name || 'N/A'}</td>
                        <td>{formatNumber(withdrawal.amount_vnd)}</td>
                        <td>{withdrawal.notes || '-'}</td>
                      </tr>
                    ))}
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
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Đang tải lịch sử...</div>
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
                            onChange={(e) => setDepositFilters({ ...depositFilters, month: e.target.value })}
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
                            onChange={(e) => setDepositFilters({ ...depositFilters, name: e.target.value })}
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
                                () => setShowDepositFilterInputs((prev) => ({ ...prev, minAmount: false })),
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
                      if (
                        depositFilters.name &&
                        !(deposit.user_name || '').toLowerCase().includes(depositFilters.name.toLowerCase())
                      )
                        return false;
                      if (depositFilters.month) {
                        const d = new Date(deposit.created_at);
                        if (!isNaN(d.getTime())) {
                          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                          if (monthKey !== depositFilters.month) return false;
                        }
                      }
                      if (depositFilters.minAmount) {
                        const minVal = parseFloat(depositFilters.minAmount);
                        if (!isNaN(minVal) && deposit.amount_vnd < minVal) return false;
                      }
                      return true;
                    })
                    .map((deposit) => (
                      <tr key={deposit.id}>
                        <td>{formatDateTime(deposit.created_at)}</td>
                        <td>{deposit.user_name || 'N/A'}</td>
                        <td>{formatNumber(deposit.amount_vnd)}</td>
                        <td>{deposit.notes || '-'}</td>
                      </tr>
                    ))}
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

      {/* Modal Nạp tiền */}
      {showNapTienModal && (
        <div className="modal-overlay" onClick={() => setShowNapTienModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nạp tiền</h2>
              <button className="modal-close" onClick={() => setShowNapTienModal(false)}>×</button>
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
                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                    ≈ {formatNumberAbbr(napTienFormData.amount_vnd)}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="nap-tien-notes">Ghi chú</label>
                <textarea
                  id="nap-tien-notes"
                  value={napTienFormData.notes}
                  onChange={(e) => setNapTienFormData({ ...napTienFormData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowNapTienModal(false)} disabled={isNapTien}>
                  Hủy
                </button>
                <button type="submit" className="btn-submit" disabled={isNapTien}>
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
              <button className="modal-close" onClick={() => setShowRutTienModal(false)}>×</button>
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
                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                    ≈ {formatNumberAbbr(rutTienFormData.amount_vnd)}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="rut-tien-notes">Ghi chú</label>
                <textarea
                  id="rut-tien-notes"
                  value={rutTienFormData.notes}
                  onChange={(e) => setRutTienFormData({ ...rutTienFormData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowRutTienModal(false)} disabled={isRutTien}>
                  Hủy
                </button>
                <button type="submit" className="btn-submit" disabled={isRutTien}>
                  {isRutTien ? 'Đang rút...' : 'Xác nhận rút tiền'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminWithdrawSection;

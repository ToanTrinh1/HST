import { useState, useEffect, useCallback } from 'react';
import { donHangAPI } from '../../api/endpoints/don_hang.api';
import './AdminProfitSection.css';

const formatNumber = (num) => {
  if (num === null || num === undefined || num === '') return '0';
  const n = Number(num);
  if (Number.isNaN(n)) return '0';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const AdminProfitSection = () => {
  const [adminStats, setAdminStats] = useState([]);
  const [adminProfitSplit, setAdminProfitSplit] = useState([]);
  const [monthFilter, setMonthFilter] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [adminReceiveRate, setAdminReceiveRate] = useState(null);
  const [adminKeepPct, setAdminKeepPct] = useState(null);
  const [feeRutTienPctWeb, setFeeRutTienPctWeb] = useState(null);
  const [feeRutTienPctNgoai, setFeeRutTienPctNgoai] = useState(null);
  const [feeTrungGianPct, setFeeTrungGianPct] = useState(null);
  const [feeWebTiers, setFeeWebTiers] = useState([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editExchangeRate, setEditExchangeRate] = useState('');
  const [editAdminReceiveRate, setEditAdminReceiveRate] = useState('');
  const [editAdminKeepPct, setEditAdminKeepPct] = useState('');
  const [editFeeRutTienPctWeb, setEditFeeRutTienPctWeb] = useState('');
  const [editFeeRutTienPctNgoai, setEditFeeRutTienPctNgoai] = useState('');
  const [editFeeTrungGianPct, setEditFeeTrungGianPct] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configError, setConfigError] = useState('');

  const fetchConfig = useCallback(async () => {
    setIsLoadingConfig(true);
    try {
      const res = await donHangAPI.layTyGiaHienTai();
      if (res.success) {
        const rate = res.exchange_rate ?? res.data?.exchange_rate ?? res.data;
        const adminRate = res.admin_receive_rate ?? res.data?.admin_receive_rate;
        const keepPct = res.admin_keep_pct ?? res.data?.admin_keep_pct;
        const frWeb = res.fee_rut_tien_pct_web ?? res.data?.fee_rut_tien_pct_web;
        const frNgoai = res.fee_rut_tien_pct_ngoai ?? res.data?.fee_rut_tien_pct_ngoai;
        const ftg = res.fee_trung_gian_pct ?? res.data?.fee_trung_gian_pct;
        const tiers = res.fee_web_tiers ?? res.data?.fee_web_tiers;
        setExchangeRate(rate != null ? Number(rate) : 3550);
        setAdminReceiveRate(adminRate != null ? Number(adminRate) : 3850);
        setAdminKeepPct(keepPct != null ? Number(keepPct) : 60);
        setFeeRutTienPctWeb(frWeb != null ? Number(frWeb) : 2);
        setFeeRutTienPctNgoai(frNgoai != null ? Number(frNgoai) : 1);
        setFeeTrungGianPct(ftg != null ? Number(ftg) : 6);
        setFeeWebTiers(Array.isArray(tiers) ? tiers : []);
      } else {
        setExchangeRate(3550);
        setAdminReceiveRate(3850);
        setAdminKeepPct(60);
        setFeeRutTienPctWeb(2);
        setFeeRutTienPctNgoai(1);
        setFeeTrungGianPct(6);
        setFeeWebTiers([]);
      }
    } catch (e) {
      setExchangeRate(3550);
      setAdminReceiveRate(3850);
      setAdminKeepPct(60);
      setFeeRutTienPctWeb(2);
      setFeeRutTienPctNgoai(1);
      setFeeTrungGianPct(6);
      setFeeWebTiers([]);
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  const fetchAdminStats = useCallback(async (month) => {
    setIsLoadingStats(true);
    setStatsError('');
    try {
      const res = await donHangAPI.layThongKeLoiNhuanAdmin(month || '');
      if (res.success && Array.isArray(res.data)) {
        setAdminStats(res.data);
        setAdminProfitSplit(Array.isArray(res.admin_profit_split) ? res.admin_profit_split : []);
      } else {
        setAdminStats([]);
        setAdminProfitSplit([]);
        if (res.error) setStatsError(res.error);
      }
    } catch (e) {
      setAdminStats([]);
      setAdminProfitSplit([]);
      setStatsError(e.message || 'Lỗi khi tải thống kê');
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminStats(monthFilter);
  }, [monthFilter, fetchAdminStats]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const openConfigModal = () => {
    setEditExchangeRate(exchangeRate != null ? String(exchangeRate) : '3550');
    setEditAdminReceiveRate(adminReceiveRate != null ? String(adminReceiveRate) : '3850');
    setEditAdminKeepPct(adminKeepPct != null ? String(adminKeepPct) : '60');
    setEditFeeRutTienPctWeb(feeRutTienPctWeb != null ? String(feeRutTienPctWeb) : '2');
    setEditFeeRutTienPctNgoai(feeRutTienPctNgoai != null ? String(feeRutTienPctNgoai) : '1');
    setEditFeeTrungGianPct(feeTrungGianPct != null ? String(feeTrungGianPct) : '6');
    setConfigError('');
    setShowConfigModal(true);
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    const rate = parseFloat(editExchangeRate);
    const adminRate = parseFloat(editAdminReceiveRate);
    const keepPct = parseFloat(editAdminKeepPct);
    const frWeb = parseFloat(editFeeRutTienPctWeb);
    const frNgoai = parseFloat(editFeeRutTienPctNgoai);
    const ftg = parseFloat(editFeeTrungGianPct);
    if (Number.isNaN(rate) || rate <= 0 || Number.isNaN(adminRate) || adminRate <= 0) {
      setConfigError('Tỷ giá trả và tỷ giá nhận phải là số dương');
      return;
    }
    if (Number.isNaN(frWeb) || frWeb < 0 || frWeb > 100 || Number.isNaN(frNgoai) || frNgoai < 0 || frNgoai > 100 || Number.isNaN(ftg) || ftg < 0 || ftg > 100) {
      setConfigError('Phí rút tiền và phí trung gian phải từ 0 đến 100');
      return;
    }
    if (Number.isNaN(keepPct) || keepPct < 0 || keepPct > 100) {
      setConfigError('Phần trăm admin giữ phải từ 0 đến 100');
      return;
    }
    setIsSavingConfig(true);
    setConfigError('');
    try {
      const res = await donHangAPI.capNhatConfig({
        exchange_rate: rate,
        admin_receive_rate: adminRate,
        admin_keep_pct: keepPct,
        fee_rut_tien_pct_web: frWeb,
        fee_rut_tien_pct_ngoai: frNgoai,
        fee_trung_gian_pct: ftg,
      });
      if (res.success) {
        setExchangeRate(rate);
        setAdminReceiveRate(adminRate);
        setAdminKeepPct(keepPct);
        setFeeRutTienPctWeb(frWeb);
        setFeeRutTienPctNgoai(frNgoai);
        setFeeTrungGianPct(ftg);
        setShowConfigModal(false);
        fetchAdminStats(monthFilter);
      } else {
        setConfigError(res.error || 'Cập nhật thất bại');
      }
    } catch (err) {
      setConfigError(err.message || 'Cập nhật thất bại');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const monthOptions = [{ value: '', label: 'Tất cả thời gian' }];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthOptions.push({ value: m, label: m });
  }
  return (
    <div className="admin-profit-only-two-tables">
      {/* Cột trái: bộ lọc + bảng */}
      <div className="admin-profit-left">
        {/* Bộ lọc tháng */}
        <div className="admin-profit-stats-filter">
          <label className="admin-profit-stats-filter-label">Lọc theo tháng:</label>
          <select
            className="admin-profit-stats-filter-select"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            {monthOptions.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Bảng 1: Thống kê (theo admin) */}
        <div className="admin-profit-stats-section">
          <h3 className="admin-profit-stats-section-title">Bảng thống kê</h3>
          {statsError && <p className="admin-profit-by-month-error">{statsError}</p>}
          {isLoadingStats ? (
            <p style={{ textAlign: 'center', padding: '16px', color: '#666' }}>Đang tải...</p>
          ) : (
            <div className="admin-profit-stats-table-wrapper">
              <table className="admin-profit-stats-table admin-profit-stats-table-narrow">
                <thead>
                  <tr>
                    <th>Admin</th>
                    <th>Số kèo web</th>
                    <th>Tổng tiền kèo web (¥)</th>
                    <th>Số kèo ngoài</th>
                    <th>Tổng tiền kèo ngoài (¥)</th>
                    <th>Số kèo hủy</th>
                    <th>Số kèo đền</th>
                    <th>Tổng tiền kèo đền (¥)</th>
                    <th>Tổng tiền cắt bớt (¥)</th>
                  </tr>
                </thead>
                <tbody>
                  {adminStats.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '16px', color: '#666' }}>
                        Chưa có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    adminStats.map((row) => (
                      <tr key={row.admin_id || row.admin_name}>
                        <td className="admin-profit-cell-admin">{row.admin_name}</td>
                        <td>{formatNumber(row.so_don_web)}</td>
                        <td>{formatNumber(row.tong_tien_keo_web)}</td>
                        <td>{formatNumber(row.so_don_ngoai)}</td>
                        <td>{formatNumber(row.tong_tien_keo_ngoai)}</td>
                        <td>{formatNumber(row.so_don_huy)}</td>
                        <td>{formatNumber(row.so_keo_den)}</td>
                        <td>{formatNumber(row.tong_tien_den_te)}</td>
                        <td>{formatNumber(row.tien_loi_nhuan_tien_cat_te)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bảng 2: Tính toán lợi nhuận (theo admin) */}
        <div className="admin-profit-stats-section">
          <h3 className="admin-profit-stats-section-title">Bảng tính toán lợi nhuận</h3>
          <p className="admin-profit-stats-formula">
            Tổng lợi nhuận = Lợi nhuận tiền kèo + Lợi nhuận tiền cắt + Lợi nhuận chênh lệch − Thâm hụt đền
          </p>
          {isLoadingStats ? null : (
            <div className="admin-profit-stats-table-wrapper">
              <table className="admin-profit-stats-table admin-profit-calc-table admin-profit-stats-table-narrow">
                <thead>
                  <tr>
                    <th>Admin</th>
                    <th>Lợi nhuận tiền kèo (VND)</th>
                    <th>Lợi nhuận tiền cắt (VND)</th>
                    <th>Lợi nhuận chênh lệch (VND)</th>
                    <th>Thâm hụt đền (VND)</th>
                    <th>Tổng lợi nhuận (VND)</th>
                  </tr>
                </thead>
                <tbody>
                  {adminStats.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: '#666' }}>
                        Chưa có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    adminStats.map((row) => (
                      <tr key={row.admin_id || row.admin_name}>
                        <td className="admin-profit-cell-admin">{row.admin_name}</td>
                        <td>{formatNumber(row.tong_loi_nhuan_tien_keo)}</td>
                        <td>{formatNumber(row.tong_loi_nhuan_tien_cat)}</td>
                        <td>{formatNumber(row.tong_loi_nhuan_chenh_lech)}</td>
                        <td>{formatNumber(row.tien_tham_hut_den)}</td>
                        <td className="admin-profit-cell-total">{formatNumber(row.tong_loi_nhuan)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bảng 3: Phân chia lợi nhuận (tiền điều chuyển / tiền thực nhận) */}
        <div className="admin-profit-stats-section">
          <h3 className="admin-profit-stats-section-title">Phân chia lợi nhuận (theo % admin giữ)</h3>
          <p className="admin-profit-stats-formula">
            Tiền điều chuyển: âm = admin thường nộp; dương = admin tổng thu về. Tiền thực nhận = sau khi phân chia.
          </p>
          {isLoadingStats ? null : (
            <div className="admin-profit-stats-table-wrapper">
              <table className="admin-profit-stats-table admin-profit-calc-table admin-profit-stats-table-narrow">
                <thead>
                  <tr>
                    <th>Admin</th>
                    <th>Vai trò</th>
                    <th>Tổng lợi nhuận (VND)</th>
                    <th>Tiền điều chuyển (VND)</th>
                    <th>Tiền thực nhận (VND)</th>
                  </tr>
                </thead>
                <tbody>
                  {adminProfitSplit.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: '#666' }}>
                        Chưa có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    adminProfitSplit.map((row) => (
                      <tr key={row.admin_id || row.admin_name}>
                        <td className="admin-profit-cell-admin">{row.admin_name}</td>
                        <td>{row.vai_tro === 'admin_tong' ? 'Admin tổng' : 'Admin thường'}</td>
                        <td>{formatNumber(row.tong_loi_nhuan)}</td>
                        <td className={row.tien_dieu_chuyen < 0 ? 'admin-profit-cell-negative' : 'admin-profit-cell-positive'}>
                          {row.tien_dieu_chuyen < 0 ? '−' : ''}{formatNumber(Math.abs(row.tien_dieu_chuyen))}
                        </td>
                        <td className="admin-profit-cell-total">{formatNumber(row.tien_thuc_nhan)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Cột phải: Cấu hình công thức */}
      <div className="admin-profit-config-panel">
        <h3 className="admin-profit-config-title">Cấu hình công thức tính lợi nhuận</h3>
        {isLoadingConfig ? (
          <p className="admin-profit-config-loading">Đang tải...</p>
        ) : (
          <>
            <ul className="admin-profit-config-list">
              <li>
                <span className="admin-profit-config-label">Tỷ giá trả user (VND/¥):</span>
                <span className="admin-profit-config-value">{exchangeRate != null ? formatNumber(exchangeRate) : '-'}</span>
              </li>
              <li>
                <span className="admin-profit-config-label">Tỷ giá admin nhận (VND/¥):</span>
                <span className="admin-profit-config-value">{adminReceiveRate != null ? formatNumber(adminReceiveRate) : '-'}</span>
              </li>
              <li>
                <span className="admin-profit-config-label">Phí kèo web:</span>
                <span className="admin-profit-config-value">{feeTrungGianPct != null ? formatNumber(feeTrungGianPct) : '-'}%</span>
              </li>
              <li>
                <span className="admin-profit-config-label">Phí kèo ngoài:</span>
                <span className="admin-profit-config-value">{feeTrungGianPct != null && feeRutTienPctNgoai != null ? formatNumber(feeTrungGianPct + feeRutTienPctNgoai) : '-'}%</span>
              </li>
              <li>
                <span className="admin-profit-config-label">Admin thường giữ (%):</span>
                <span className="admin-profit-config-value">{adminKeepPct != null ? formatNumber(adminKeepPct) : '60'}%</span>
              </li>
            </ul>
            <div className="admin-profit-config-note">
              <p>
                <strong>Lợi nhuận tiền kèo</strong>:<br />
                Từ kèo <b>Web</b> và <b>Ngoài</b> của các đơn <b>DONE</b>, <b>HỦY BỎ</b>.<br />
                Công thức: <code>Phí × Tiền kèo (¥) × Tỷ giá admin nhận</code>
              </p>

              <p>
                <strong>Lợi nhuận tiền cắt</strong>:<br />
                Áp dụng cho các đơn <b>HỦY BỎ</b>, <b>ĐỀN</b>.<br />
                Công thức: <code>Số tiền cắt admin nhập × Tỷ giá admin nhận</code>
              </p>

              <p>
                <strong>Lợi nhuận chênh lệch</strong>:<br />
                Áp dụng cho các đơn <b>DONE</b>, <b>HỦY BỎ</b>.<br />
                Công thức: <code>(Tỷ giá admin nhận − Tỷ giá trả user) × Tệ user nhận</code>
              </p>

              <p>
                <strong>Thâm hụt đền</strong>:<br />
                Chỉ áp dụng cho đơn <b>ĐỀN</b>.<br />
                Công thức: <code>(Tỷ giá admin nhận − Tỷ giá trả user) × Số tiền đền</code>
              </p>

              <p>
                <strong>Tổng lợi nhuận</strong>:<br />
                <code>
                  Lợi nhuận tiền kèo + Lợi nhuận tiền cắt + Lợi nhuận chênh lệch − Thâm hụt đền
                </code>
              </p>
            </div>

            <button type="button" className="admin-profit-config-btn" onClick={openConfigModal}>
              Cập nhật config
            </button>
          </>
        )}
      </div>

      {/* Modal cập nhật config */}
      {showConfigModal && (
        <div className="admin-profit-modal-overlay" onClick={() => !isSavingConfig && setShowConfigModal(false)}>
          <div className="admin-profit-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-profit-modal-header">
              <h3>Cập nhật cấu hình công thức</h3>
              <button type="button" className="admin-profit-modal-close" onClick={() => !isSavingConfig && setShowConfigModal(false)} aria-label="Đóng">×</button>
            </div>
            <form onSubmit={handleSaveConfig} className="admin-profit-modal-body">
              {configError && <p className="admin-profit-config-error">{configError}</p>}
              <div className="admin-profit-form-grid">
                <div className="admin-profit-form-group">
                  <label>Tỷ giá trả user (VND/¥)</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={editExchangeRate}
                    onChange={(e) => setEditExchangeRate(e.target.value)}
                    placeholder="3550"
                    disabled={isSavingConfig}
                  />
                </div>
                <div className="admin-profit-form-group">
                  <label>Tỷ giá admin nhận (VND/¥)</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={editAdminReceiveRate}
                    onChange={(e) => setEditAdminReceiveRate(e.target.value)}
                    placeholder="3850"
                    disabled={isSavingConfig}
                  />
                </div>
                <div className="admin-profit-form-group">
                  <label>Admin thường giữ (%)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    value={editAdminKeepPct}
                    onChange={(e) => setEditAdminKeepPct(e.target.value)}
                    placeholder="60"
                    disabled={isSavingConfig}
                  />
                  <span className="admin-profit-modal-hint-inline">Phần còn lại nộp cho admin tổng (vd: 60% giữ → 40% nộp)</span>
                </div>
                <div className="admin-profit-form-group">
                  <label>Phí rút tiền web (%)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    value={editFeeRutTienPctWeb}
                    onChange={(e) => setEditFeeRutTienPctWeb(e.target.value)}
                    placeholder="2"
                    disabled={isSavingConfig}
                  />
                  <span className="admin-profit-modal-hint-inline">Trừ từ giá kèo khi tính tiền user nhận (kèo web)</span>
                </div>
                <div className="admin-profit-form-group">
                  <label>Phí rút tiền ngoài (%)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    value={editFeeRutTienPctNgoai}
                    onChange={(e) => setEditFeeRutTienPctNgoai(e.target.value)}
                    placeholder="1"
                    disabled={isSavingConfig}
                  />
                  <span className="admin-profit-modal-hint-inline">Trừ từ giá kèo khi tính tiền user nhận (kèo ngoài)</span>
                </div>
                <div className="admin-profit-form-group">
                  <label>Phí trung gian (%)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    value={editFeeTrungGianPct}
                    onChange={(e) => setEditFeeTrungGianPct(e.target.value)}
                    placeholder="6"
                    disabled={isSavingConfig}
                  />
                  <span className="admin-profit-modal-hint-inline">Trừ từ giá kèo (chung web + ngoài).</span>
                </div>
              </div>
              <p className="admin-profit-modal-hint">
                Tỷ giá trả user sẽ dùng cho đơn mới và tính ví user.<br />
                Tỷ giá nhận và phí % dùng cho công thức lợi nhuận admin.<br />
                Phí kèo web = phí trung gian; phí kèo ngoài = phí rút tiền ngoài + phí trung gian.
              </p>              
              <div className="admin-profit-modal-footer">
                <button type="button" className="admin-profit-modal-btn secondary" onClick={() => !isSavingConfig && setShowConfigModal(false)} disabled={isSavingConfig}>
                  Hủy
                </button>
                <button type="submit" className="admin-profit-modal-btn primary" disabled={isSavingConfig}>
                  {isSavingConfig ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfitSection;

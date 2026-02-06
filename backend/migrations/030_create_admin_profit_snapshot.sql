-- Bảng lợi nhuận đã tính sẵn theo từng đơn (materialized).
-- Khi đơn chuyển sang DONE / HỦY BỎ / ĐỀN: tính một lần và ghi vào đây.
-- Tab "Lợi nhuận" chỉ cần SUM theo tháng/admin → query rất nhanh.
-- Nếu đơn bị đổi lại trạng thái (ví dụ hoàn tác): xóa bản ghi tương ứng trong bảng này.

CREATE TABLE IF NOT EXISTS admin_profit_snapshot (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bet_receipt_id      VARCHAR(36) NOT NULL UNIQUE REFERENCES thong_tin_nhan_keo(id) ON DELETE CASCADE,
    admin_id            VARCHAR(36),
    completed_at        TIMESTAMPTZ NOT NULL,
    month               CHAR(7) NOT NULL,  -- 'YYYY-MM'
    status              VARCHAR(32) NOT NULL,  -- DONE, HỦY BỎ, ĐỀN
    loai_keo            VARCHAR(32) NOT NULL,  -- web, Kèo ngoài

    -- Số liệu gốc (tệ) - để kiểm tra / báo cáo
    tien_keo_te         DECIMAL(14, 2) NOT NULL DEFAULT 0,
    tien_thuc_nhan_te   DECIMAL(14, 2) NOT NULL DEFAULT 0,
    cong_thuc_nhan_te   DECIMAL(14, 2) NOT NULL DEFAULT 0,
    tien_cat_te         DECIMAL(14, 2) NOT NULL DEFAULT 0,

    -- Lợi nhuận đã tính (tính một lần khi ghi)
    profit_keo_cny          DECIMAL(14, 2) NOT NULL DEFAULT 0,   -- Lợi nhuận tiền kèo (¥): fee * amount
    profit_keo_vnd          DECIMAL(14, 2) NOT NULL DEFAULT 0,   -- Lợi nhuận tiền kèo (VND): fee * amount * admin_rate
    profit_tien_cat_vnd     DECIMAL(14, 2) NOT NULL DEFAULT 0,   -- Lợi nhuận tiền cắt (tien_cat_te * admin_rate)
    profit_chenh_lech_vnd   DECIMAL(14, 2) NOT NULL DEFAULT 0,   -- Chênh lệch tỷ giá (admin_rate - exchange_rate) * cong_thuc_nhan_te
    profit_den_tham_hut_vnd DECIMAL(14, 2) NOT NULL DEFAULT 0,   -- Thăm hụt đền (số dương = khoản trừ đi)

    total_profit_vnd    DECIMAL(14, 2) NOT NULL DEFAULT 0,   -- profit_keo_vnd + profit_tien_cat_vnd + profit_chenh_lech_vnd - profit_den_tham_hut_vnd

    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_profit_snapshot_month ON admin_profit_snapshot(month);
CREATE INDEX IF NOT EXISTS idx_admin_profit_snapshot_admin_id ON admin_profit_snapshot(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_profit_snapshot_bet_receipt_id ON admin_profit_snapshot(bet_receipt_id);

COMMENT ON TABLE admin_profit_snapshot IS 'Lợi nhuận đã tính sẵn theo từng đơn; ghi khi đơn chuyển DONE/HỦY BỎ/ĐỀN. Tab Lợi nhuận đọc từ đây thay vì aggregate từ thong_tin_nhan_keo.';

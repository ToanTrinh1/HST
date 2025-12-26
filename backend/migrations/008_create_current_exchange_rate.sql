-- Migration: Tạo bảng lưu tỷ giá hiện tại
-- Created: 2024

-- Tạo bảng lưu tỷ giá hiện tại (chỉ có 1 record)
CREATE TABLE IF NOT EXISTS current_exchange_rate (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    exchange_rate DECIMAL(10, 2) NOT NULL DEFAULT 3550.0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

-- Insert giá trị mặc định nếu chưa có
INSERT INTO current_exchange_rate (id, exchange_rate, updated_at)
VALUES (1, 3550.0, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Comment cho bảng
COMMENT ON TABLE current_exchange_rate IS 'Bảng lưu tỷ giá hiện tại (VND/CNY) - chỉ có 1 record';
COMMENT ON COLUMN current_exchange_rate.exchange_rate IS 'Tỷ giá VND/CNY hiện tại';
COMMENT ON COLUMN current_exchange_rate.updated_at IS 'Thời gian cập nhật tỷ giá';
COMMENT ON COLUMN current_exchange_rate.updated_by IS 'Người cập nhật tỷ giá';


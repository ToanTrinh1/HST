-- Migration: Thêm cột exchange_rate vào bảng thong_tin_nhan_keo
-- Created: 2024

-- Thêm cột exchange_rate để lưu tỷ giá tại thời điểm đơn hàng được xử lí
ALTER TABLE thong_tin_nhan_keo 
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 2) DEFAULT 3550.0;

-- Cập nhật giá trị mặc định cho các đơn hàng đã có (DONE, HỦY BỎ, ĐỀN)
UPDATE thong_tin_nhan_keo 
SET exchange_rate = 3550.0 
WHERE exchange_rate IS NULL 
  AND tien_do_hoan_thanh IN ('DONE', 'HỦY BỎ', 'ĐỀN');

-- Comment cho cột
COMMENT ON COLUMN thong_tin_nhan_keo.exchange_rate IS 'Tỷ giá VND/CNY tại thời điểm đơn hàng được xử lí (DONE/HỦY BỎ/ĐỀN)';


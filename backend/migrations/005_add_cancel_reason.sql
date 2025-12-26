-- Migration: Thêm cột lý do hủy bỏ vào bảng thong_tin_nhan_keo
-- Created: 2024
-- Mô tả: Thêm cột ly_do_huy để lưu lý do khi hủy bỏ đơn hàng

-- Thêm cột ly_do_huy (lý do hủy) vào bảng thong_tin_nhan_keo
ALTER TABLE thong_tin_nhan_keo 
ADD COLUMN IF NOT EXISTS ly_do_huy TEXT;

-- Comment cho cột mới
COMMENT ON COLUMN thong_tin_nhan_keo.ly_do_huy IS 'Lý do hủy bỏ đơn hàng (chỉ có giá trị khi status = HỦY BỎ)';




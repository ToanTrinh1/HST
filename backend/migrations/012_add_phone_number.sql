-- Migration: Thêm trường so_dien_thoai vào bảng nguoi_dung
-- Created: 2024
-- Mô tả: Thêm trường để lưu số điện thoại của người dùng

ALTER TABLE nguoi_dung 
ADD COLUMN IF NOT EXISTS so_dien_thoai VARCHAR(20) DEFAULT NULL;

-- Index cho số điện thoại để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_nguoi_dung_so_dien_thoai ON nguoi_dung(so_dien_thoai);

-- Comment cho cột mới
COMMENT ON COLUMN nguoi_dung.so_dien_thoai IS 'Số điện thoại của người dùng';


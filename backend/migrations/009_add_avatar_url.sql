-- Migration: Thêm trường avatar_url vào bảng nguoi_dung
-- Created: 2024
-- Mô tả: Thêm trường để lưu URL ảnh đại diện của người dùng

ALTER TABLE nguoi_dung 
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) DEFAULT NULL;

-- Comment cho cột mới
COMMENT ON COLUMN nguoi_dung.avatar_url IS 'URL ảnh đại diện của người dùng';


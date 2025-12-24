-- Migration: Thêm cột tài khoản, mật khẩu, khu vực vào bảng thong_tin_nhan_keo
-- Created: 2024
-- Mô tả: Thêm các cột tai_khoan, mat_khau, khu_vuc để lưu thông tin tài khoản và khu vực của kèo

-- Thêm cột tai_khoan (tài khoản) vào bảng thong_tin_nhan_keo
ALTER TABLE thong_tin_nhan_keo 
ADD COLUMN IF NOT EXISTS tai_khoan VARCHAR(100);

-- Thêm cột mat_khau (mật khẩu) vào bảng thong_tin_nhan_keo
ALTER TABLE thong_tin_nhan_keo 
ADD COLUMN IF NOT EXISTS mat_khau VARCHAR(100);

-- Thêm cột khu_vuc (khu vực) vào bảng thong_tin_nhan_keo
ALTER TABLE thong_tin_nhan_keo 
ADD COLUMN IF NOT EXISTS khu_vuc VARCHAR(50);

-- Comment cho các cột mới
COMMENT ON COLUMN thong_tin_nhan_keo.tai_khoan IS 'Tài khoản sử dụng cho kèo';
COMMENT ON COLUMN thong_tin_nhan_keo.mat_khau IS 'Mật khẩu tài khoản';
COMMENT ON COLUMN thong_tin_nhan_keo.khu_vuc IS 'Khu vực của kèo';


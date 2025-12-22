-- Migration: Tạo bảng nguoi_dung (phải chạy trước thong_tin_nhan_keo vì có foreign key)
-- Created: 2024
-- Mô tả: Bảng lưu thông tin người dùng của hệ thống

CREATE TABLE IF NOT EXISTS nguoi_dung (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,  -- ID người dùng (UUID)
    email VARCHAR(255) NOT NULL UNIQUE,                           -- Email đăng nhập (duy nhất)
    mat_khau VARCHAR(255) NOT NULL,                               -- Mật khẩu đã hash
    ten VARCHAR(255) NOT NULL,                                    -- Tên người dùng
    vai_tro VARCHAR(50) NOT NULL DEFAULT 'user',                  -- Vai trò: user, admin, ...
    thoi_gian_tao TIMESTAMP NOT NULL DEFAULT NOW(),              -- Thời gian tạo
    thoi_gian_cap_nhat TIMESTAMP NOT NULL DEFAULT NOW()           -- Thời gian cập nhật
);

-- Indexes cho bảng nguoi_dung
CREATE INDEX IF NOT EXISTS idx_nguoi_dung_email ON nguoi_dung(email);      -- Index cho email để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_nguoi_dung_vai_tro ON nguoi_dung(vai_tro);  -- Index cho vai_tro để filter
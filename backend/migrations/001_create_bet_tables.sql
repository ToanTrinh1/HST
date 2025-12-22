-- Migration: Tạo các bảng cho hệ thống quản lý kèo
-- Created: 2024

-- Bảng 1: thong_tin_nhan_keo - Thông tin nhận kèo (Bảng thông tin nhận kèo)
CREATE TABLE IF NOT EXISTS thong_tin_nhan_keo (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,  -- ID kèo (UUID)
    stt INTEGER NOT NULL,                                         -- Số thứ tự
    id_nguoi_dung VARCHAR(36) NOT NULL REFERENCES nguoi_dung(id) ON DELETE CASCADE, -- ID người dùng (FK)
    ma_nhiem_vu VARCHAR(50) NOT NULL,                            -- Mã nhiệm vụ (vd: "lb3-kc1", "kc4-96-ct")
    loai_keo VARCHAR(20) NOT NULL CHECK (loai_keo IN ('web', 'Kèo ngoài')), -- Loại kèo: "web" hoặc "Kèo ngoài"
    tien_keo_web_te DECIMAL(15, 2) NOT NULL DEFAULT 0,           -- Tiền kèo web (tệ)
    ma_don_hang VARCHAR(100),                                     -- Mã đơn hàng
    ghi_chu TEXT,                                                 -- Ghi chú
    tien_do_hoan_thanh VARCHAR(30) NOT NULL DEFAULT 'ĐANG THỰC HIỆN' -- Tiến độ: ĐANG THỰC HIỆN, DONE, CHỜ CHẤP NHẬN, HỦY BỎ, ĐỀN
        CHECK (tien_do_hoan_thanh IN ('ĐANG THỰC HIỆN', 'DONE', 'CHỜ CHẤP NHẬN', 'HỦY BỎ', 'ĐỀN')),
    tien_keo_web_thuc_nhan_te DECIMAL(15, 2) DEFAULT 0,          -- Tiền kèo Web thực nhận (tệ)
    tien_den_te DECIMAL(15, 2) DEFAULT 0,                        -- Tiền đền (tệ)
    
    -- TODO: Tính toán công thức cong_thuc_nhan_te
    -- Công thức: cong_thuc_nhan_te = f(tien_keo_web_thuc_nhan_te, tien_den_te, ...)
    -- Có thể tính trong code hoặc dùng database trigger
    cong_thuc_nhan_te DECIMAL(15, 2) DEFAULT 0,                  -- Công thực nhận (tệ) - TÍNH TOÁN SAU
    
    thoi_gian_nhan_keo TIMESTAMP NOT NULL DEFAULT NOW(),         -- Thời gian nhận kèo (cũng chính là thời gian tạo)
    thoi_gian_hoan_thanh TIMESTAMP,                               -- Thời gian hoàn thành (nullable) - có thể tính số giờ hoàn thành = thoi_gian_hoan_thanh - thoi_gian_nhan_keo
    thoi_gian_con_lai_gio INTEGER,                                -- Thời gian còn lại (giờ) - nullable
    thoi_gian_cap_nhat TIMESTAMP NOT NULL DEFAULT NOW()           -- Thời gian cập nhật
);

-- Indexes cho bảng thong_tin_nhan_keo
CREATE INDEX IF NOT EXISTS idx_thong_tin_nhan_keo_id_nguoi_dung ON thong_tin_nhan_keo(id_nguoi_dung);      -- Index cho id_nguoi_dung để query nhanh theo user
CREATE INDEX IF NOT EXISTS idx_thong_tin_nhan_keo_tien_do_hoan_thanh ON thong_tin_nhan_keo(tien_do_hoan_thanh);        -- Index cho tien_do_hoan_thanh để filter theo trạng thái
CREATE INDEX IF NOT EXISTS idx_thong_tin_nhan_keo_ma_don_hang ON thong_tin_nhan_keo(ma_don_hang); -- Index cho ma_don_hang để tìm kiếm đơn hàng
CREATE INDEX IF NOT EXISTS idx_thong_tin_nhan_keo_thoi_gian_nhan_keo ON thong_tin_nhan_keo(thoi_gian_nhan_keo); -- Index cho thời gian nhận kèo
CREATE INDEX IF NOT EXISTS idx_thong_tin_nhan_keo_thoi_gian_hoan_thanh ON thong_tin_nhan_keo(thoi_gian_hoan_thanh); -- Index cho thời gian hoàn thành

-- Bảng 2: tien_keo - Tổng hợp tài chính (Bảng tiền kèo - Bảng 2 trong Excel)
CREATE TABLE IF NOT EXISTS tien_keo (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,  -- ID wallet (UUID)
    id_nguoi_dung VARCHAR(36) NOT NULL UNIQUE REFERENCES nguoi_dung(id) ON DELETE CASCADE, -- ID người dùng (FK, unique - mỗi user 1 wallet)
    
    -- Số dư theo CNY (Tệ)
    tong_cong_thuc_nhan_te DECIMAL(15, 2) NOT NULL DEFAULT 0,  -- Tổng công thực nhận (tệ)
    tong_da_rut_te DECIMAL(15, 2) NOT NULL DEFAULT 0,          -- Tổng đã rút (tệ)
    
    -- Số dư theo VND
    tong_cong_thuc_nhan_vnd DECIMAL(15, 2) NOT NULL DEFAULT 0,  -- Tổng công thực nhận (VND)
    tong_coc_vnd DECIMAL(15, 2) NOT NULL DEFAULT 0,             -- Tổng cọc (VND)
    tong_da_rut_vnd DECIMAL(15, 2) NOT NULL DEFAULT 0,          -- Tổng đã rút (VND)
    
    -- TODO: Tính toán công thức so_du_hien_tai_vnd
    -- Công thức: so_du_hien_tai_vnd = tong_cong_thuc_nhan_vnd + tong_coc_vnd - tong_da_rut_vnd
    -- Có thể tính trong code hoặc dùng database trigger/computed column
    so_du_hien_tai_vnd DECIMAL(15, 2) NOT NULL DEFAULT 0,       -- Số dư hiện tại (VND) - TÍNH TOÁN SAU
    
    thoi_gian_cap_nhat TIMESTAMP NOT NULL DEFAULT NOW()          -- Thời gian cập nhật
);

-- Index cho bảng tien_keo
CREATE INDEX IF NOT EXISTS idx_tien_keo_id_nguoi_dung ON tien_keo(id_nguoi_dung); -- Index cho id_nguoi_dung (mặc dù đã là UNIQUE)

-- Ghi chú: Trigger để tự động tạo tien_keo khi tạo nguoi_dung mới (nếu cần)
-- TODO: Có thể implement trigger hoặc tạo tien_keo trong code khi tạo nguoi_dung

-- Bảng 3: lich_su_rut_tien - Lịch sử rút tiền
CREATE TABLE IF NOT EXISTS lich_su_rut_tien (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,  -- ID giao dịch rút tiền (UUID)
    id_nguoi_dung VARCHAR(36) NOT NULL REFERENCES nguoi_dung(id) ON DELETE CASCADE, -- ID người dùng (FK)
    so_tien_rut_te DECIMAL(15, 2),                              -- Số tiền rút (tệ) - nullable (có thể null)
    so_tien_rut_vnd DECIMAL(15, 2) NOT NULL,                     -- Số tiền rút (VND)
    thang_rut VARCHAR(7) NOT NULL,                               -- Tháng rút tiền (Format: YYYY-MM, vd: "2024-12")
    ghi_chu TEXT,                                                 -- Ghi chú
    thoi_gian_tao TIMESTAMP NOT NULL DEFAULT NOW()               -- Thời gian tạo
);

-- Indexes cho bảng lich_su_rut_tien
CREATE INDEX IF NOT EXISTS idx_lich_su_rut_tien_id_nguoi_dung ON lich_su_rut_tien(id_nguoi_dung);        -- Index cho id_nguoi_dung để query theo user
CREATE INDEX IF NOT EXISTS idx_lich_su_rut_tien_thang_rut ON lich_su_rut_tien(thang_rut); -- Index cho thang_rut để query theo tháng (T9, T10, T11, T12)
CREATE INDEX IF NOT EXISTS idx_lich_su_rut_tien_thoi_gian_tao ON lich_su_rut_tien(thoi_gian_tao);  -- Index cho thời gian tạo

-- Bảng 4: lich_su_nop_tien - Lịch sử nộp tiền/Cọc
CREATE TABLE IF NOT EXISTS lich_su_nop_tien (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,  -- ID giao dịch nộp cọc (UUID)
    id_nguoi_dung VARCHAR(36) NOT NULL REFERENCES nguoi_dung(id) ON DELETE CASCADE, -- ID người dùng (FK)
    so_tien_coc_vnd DECIMAL(15, 2) NOT NULL,                     -- Số tiền cọc (VND)
    thang_nop VARCHAR(7) NOT NULL,                               -- Tháng nộp cọc (Format: YYYY-MM, vd: "2024-12")
    ghi_chu TEXT,                                                 -- Ghi chú
    thoi_gian_tao TIMESTAMP NOT NULL DEFAULT NOW()               -- Thời gian tạo
);

-- Indexes cho bảng lich_su_nop_tien
CREATE INDEX IF NOT EXISTS idx_lich_su_nop_tien_id_nguoi_dung ON lich_su_nop_tien(id_nguoi_dung);      -- Index cho id_nguoi_dung để query theo user
CREATE INDEX IF NOT EXISTS idx_lich_su_nop_tien_thang_nop ON lich_su_nop_tien(thang_nop); -- Index cho thang_nop để query theo tháng (T9, T10, T11, T12)
CREATE INDEX IF NOT EXISTS idx_lich_su_nop_tien_thoi_gian_tao ON lich_su_nop_tien(thoi_gian_tao); -- Index cho thời gian tạo

-- TODO: Trigger để tự động update tien_keo khi có thay đổi
-- Có thể tạo trigger functions để:
-- 1. Khi thong_tin_nhan_keo tien_do_hoan_thanh chuyển sang DONE -> update tien_keo.tong_cong_thuc_nhan_te và tong_cong_thuc_nhan_vnd
-- 2. Khi tạo lich_su_rut_tien -> update tien_keo.tong_da_rut_te và tong_da_rut_vnd
-- 3. Khi tạo lich_su_nop_tien -> update tien_keo.tong_coc_vnd
-- 4. Sau mỗi update trên, tự động tính lại tien_keo.so_du_hien_tai_vnd
-- 
-- Hoặc implement logic này trong service layer thay vì dùng trigger (khuyến nghị)
-- Script để tạo wallet cho tất cả users chưa có wallet
-- Chạy lệnh này trong database:
-- docker exec -i <postgres_container> psql -U postgres -d hst_db < backend/scripts/create_wallets_for_all_users.sql
-- Hoặc chạy trực tiếp trong psql:
-- psql -U postgres -d hst_db -f backend/scripts/create_wallets_for_all_users.sql

-- Tạo wallet cho tất cả users chưa có wallet
-- Chỉ tạo cho users có vai_tro = 'user' (không tạo cho admin)
INSERT INTO tien_keo (
    id_nguoi_dung,
    tong_cong_thuc_nhan_te,
    tong_da_rut_te,
    tong_cong_thuc_nhan_vnd,
    tong_coc_vnd,
    tong_da_rut_vnd,
    so_du_hien_tai_vnd,
    thoi_gian_cap_nhat
)
SELECT 
    nd.id,
    0,  -- tong_cong_thuc_nhan_te = 0
    0,  -- tong_da_rut_te = 0
    0,  -- tong_cong_thuc_nhan_vnd = 0
    0,  -- tong_coc_vnd = 0
    0,  -- tong_da_rut_vnd = 0
    0,  -- so_du_hien_tai_vnd = 0
    NOW()  -- thoi_gian_cap_nhat = NOW()
FROM nguoi_dung nd
LEFT JOIN tien_keo tk ON tk.id_nguoi_dung = nd.id
WHERE nd.vai_tro = 'user'  -- Chỉ tạo cho users, không tạo cho admin
  AND tk.id IS NULL;  -- Chỉ tạo cho users chưa có wallet

-- Kiểm tra kết quả: Đếm số users chưa có wallet
SELECT 
    COUNT(*) as users_without_wallet
FROM nguoi_dung nd
LEFT JOIN tien_keo tk ON tk.id_nguoi_dung = nd.id
WHERE nd.vai_tro = 'user'
  AND tk.id IS NULL;

-- Hiển thị danh sách users và wallet của họ
SELECT 
    nd.id,
    nd.ten,
    nd.email,
    nd.vai_tro,
    CASE 
        WHEN tk.id IS NULL THEN 'Chưa có wallet'
        ELSE 'Đã có wallet'
    END as wallet_status,
    COALESCE(tk.so_du_hien_tai_vnd, 0) as so_du_hien_tai_vnd
FROM nguoi_dung nd
LEFT JOIN tien_keo tk ON tk.id_nguoi_dung = nd.id
WHERE nd.vai_tro = 'user'
ORDER BY nd.ten;


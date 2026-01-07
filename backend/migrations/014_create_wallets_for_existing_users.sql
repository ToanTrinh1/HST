-- Migration: Tạo wallet cho tất cả users chưa có wallet
-- Created: 2025-01-08
-- Mục đích: Đảm bảo tất cả users đều có wallet để có thể rút/nạp tiền

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

-- Log số lượng wallets đã tạo
DO $$
DECLARE
    wallets_created INTEGER;
BEGIN
    GET DIAGNOSTICS wallets_created = ROW_COUNT;
    RAISE NOTICE 'Đã tạo % wallets cho users chưa có wallet', wallets_created;
END $$;


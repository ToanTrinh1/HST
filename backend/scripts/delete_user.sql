-- Script để xóa user từ database
-- Sử dụng: Chạy script này trong DBeaver hoặc psql
-- 
-- LƯU Ý: 
-- - Script này sẽ XÓA VĨNH VIỄN user và TẤT CẢ dữ liệu liên quan
-- - Các bảng liên quan sẽ tự động bị xóa do ON DELETE CASCADE:
--   - thong_tin_nhan_keo (bet receipts)
--   - tien_keo (wallet)
--   - lich_su_rut_tien (withdrawal history)
--   - lich_su_nop_tien (deposit history)
--   - bet_receipt_history (history records - performed_by sẽ set NULL)
--
-- CÁCH SỬ DỤNG:
-- 1. Thay 'your-email@example.com' bằng email của user cần xóa
-- 2. Hoặc thay user_id bằng ID của user cần xóa
-- 3. Chạy script

-- Cách 1: Xóa theo email
-- BEGIN;
-- DELETE FROM nguoi_dung WHERE email = 'your-email@example.com';
-- COMMIT;

-- Cách 2: Xóa theo ID
-- BEGIN;
-- DELETE FROM nguoi_dung WHERE id = 'user-id-here';
-- COMMIT;

-- Xem danh sách user trước khi xóa
SELECT id, email, ten, vai_tro, thoi_gian_tao 
FROM nguoi_dung 
ORDER BY thoi_gian_tao DESC;

-- Xem thông tin chi tiết của user cụ thể (thay email)
-- SELECT 
--     u.id,
--     u.email,
--     u.ten,
--     u.vai_tro,
--     u.thoi_gian_tao,
--     (SELECT COUNT(*) FROM thong_tin_nhan_keo WHERE id_nguoi_dung = u.id) as so_keo,
--     (SELECT COUNT(*) FROM lich_su_rut_tien WHERE id_nguoi_dung = u.id) as so_lan_rut_tien,
--     (SELECT COUNT(*) FROM lich_su_nop_tien WHERE id_nguoi_dung = u.id) as so_lan_nop_tien
-- FROM nguoi_dung u
-- WHERE u.email = 'your-email@example.com';


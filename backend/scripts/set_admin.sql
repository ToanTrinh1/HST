-- Script để set user thành admin
-- Chạy lệnh này trong database:
-- docker exec -i <postgres_container> psql -U postgres -d hst_db < backend/scripts/set_admin.sql
-- Hoặc chạy trực tiếp trong psql:
-- psql -U postgres -d hst_db -c "UPDATE nguoi_dung SET vai_tro = 'admin' WHERE email = 'ukt40g412345@gmail.com';"

-- Update vai_tro thành admin cho email này
UPDATE nguoi_dung 
SET vai_tro = 'admin', thoi_gian_cap_nhat = NOW()
WHERE email = 'ukt40g412345@gmail.com';

-- Kiểm tra kết quả
SELECT id, email, ten, vai_tro, thoi_gian_cap_nhat 
FROM nguoi_dung 
WHERE email = 'ukt40g412345@gmail.com';


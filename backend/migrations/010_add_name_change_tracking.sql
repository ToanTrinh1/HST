-- Migration: Thêm field theo dõi thời gian đổi tên lần cuối
-- Created: 2024
-- Mô tả: Thêm field để kiểm tra thời gian đổi tên (giới hạn 1 tháng 1 lần)

ALTER TABLE nguoi_dung 
ADD COLUMN IF NOT EXISTS thoi_gian_doi_ten_cuoi TIMESTAMP;

-- Set giá trị mặc định cho các user hiện tại (nếu chưa có)
UPDATE nguoi_dung 
SET thoi_gian_doi_ten_cuoi = thoi_gian_tao 
WHERE thoi_gian_doi_ten_cuoi IS NULL;









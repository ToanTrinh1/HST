-- Migration: Sửa thoi_gian_doi_ten_cuoi cho các user hiện có
-- Created: 2024
-- Mô tả: Đặt thoi_gian_doi_ten_cuoi = NULL cho các user chưa từng đổi tên
--        (Migration 010 đã set thoi_gian_doi_ten_cuoi = thoi_gian_tao cho tất cả user,
--         điều này không đúng - chỉ nên set khi user thực sự đổi tên)

-- Đặt thoi_gian_doi_ten_cuoi = NULL cho các user chưa từng đổi tên
-- (Nếu thoi_gian_doi_ten_cuoi = thoi_gian_tao, có nghĩa là user chưa từng đổi tên)
UPDATE nguoi_dung 
SET thoi_gian_doi_ten_cuoi = NULL 
WHERE thoi_gian_doi_ten_cuoi = thoi_gian_tao;


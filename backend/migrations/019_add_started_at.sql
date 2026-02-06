-- Migration: Thêm thoi_gian_bat_dau để tính giờ cày
-- Created: 2026-01

ALTER TABLE thong_tin_nhan_keo
ADD COLUMN IF NOT EXISTS thoi_gian_bat_dau TIMESTAMP;

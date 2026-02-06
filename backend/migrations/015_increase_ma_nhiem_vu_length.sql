-- Migration: Tăng độ dài của ma_nhiem_vu để hỗ trợ text dịch dài hơn
-- Created: 2026-01-14

-- Tăng độ dài của ma_nhiem_vu từ VARCHAR(50) lên VARCHAR(500) để hỗ trợ text dịch từ API
ALTER TABLE thong_tin_nhan_keo 
ALTER COLUMN ma_nhiem_vu TYPE VARCHAR(500);

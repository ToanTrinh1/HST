-- Migration: Thêm order_serial_no và order_publish cho đơn hàng
-- Created: 2026-01

ALTER TABLE thong_tin_nhan_keo
ADD COLUMN IF NOT EXISTS order_serial_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS order_publish INTEGER;

-- Migration: Thêm status "CHỜ LOGIN" vào CHECK constraint của tien_do_hoan_thanh
-- Created: 2026-01

-- Bước 1: Drop constraint cũ
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'thong_tin_nhan_keo'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%tien_do_hoan_thanh%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE thong_tin_nhan_keo DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Bước 2: Tạo lại constraint với "CHỜ LOGIN"
ALTER TABLE thong_tin_nhan_keo
ADD CONSTRAINT thong_tin_nhan_keo_tien_do_hoan_thanh_check
CHECK (tien_do_hoan_thanh IN (
    'Đơn hàng mới',
    'ĐANG THỰC HIỆN',
    'DONE',
    'CHỜ DUYỆT',
    'CHỜ LOGIN',
    'HỦY BỎ',
    'ĐỀN',
    'ĐANG QUÉT MÃ',
    'CHỜ TRỌNG TÀI'
));

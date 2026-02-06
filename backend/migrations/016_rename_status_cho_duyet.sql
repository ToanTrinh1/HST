-- Migration: Đổi status "CHỜ CHẤP NHẬN" -> "CHỜ DUYỆT"
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

-- Bước 2: Cập nhật dữ liệu cũ
UPDATE thong_tin_nhan_keo
SET tien_do_hoan_thanh = 'CHỜ DUYỆT'
WHERE tien_do_hoan_thanh = 'CHỜ CHẤP NHẬN';

-- Bước 3: Tạo lại constraint với "CHỜ DUYỆT"
ALTER TABLE thong_tin_nhan_keo
ADD CONSTRAINT thong_tin_nhan_keo_tien_do_hoan_thanh_check
CHECK (tien_do_hoan_thanh IN (
    'Đơn hàng mới',
    'ĐANG THỰC HIỆN',
    'DONE',
    'CHỜ DUYỆT',
    'HỦY BỎ',
    'ĐỀN',
    'ĐANG QUÉT MÃ',
    'CHỜ TRỌNG TÀI'
));

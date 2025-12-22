-- Migration: Thêm 2 status mới vào bảng thong_tin_nhan_keo
-- Created: 2024
-- Description: Thêm "ĐANG QUÉT MÃ" và "CHỜ TRỌNG TÀI" vào CHECK constraint của tien_do_hoan_thanh

-- Bước 1: Tìm và drop constraint cũ
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Tìm tên constraint CHECK cho cột tien_do_hoan_thanh
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'thong_tin_nhan_keo'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%ĐANG THỰC HIỆN%'
      AND pg_get_constraintdef(oid) LIKE '%DONE%';
    
    -- Drop constraint nếu tìm thấy
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE thong_tin_nhan_keo DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Bước 2: Tạo lại constraint với các giá trị mới
ALTER TABLE thong_tin_nhan_keo 
ADD CONSTRAINT thong_tin_nhan_keo_tien_do_hoan_thanh_check 
CHECK (tien_do_hoan_thanh IN (
    'ĐANG THỰC HIỆN', 
    'DONE', 
    'CHỜ CHẤP NHẬN', 
    'HỦY BỎ', 
    'ĐỀN',
    'ĐANG QUÉT MÃ',
    'CHỜ TRỌNG TÀI'
));


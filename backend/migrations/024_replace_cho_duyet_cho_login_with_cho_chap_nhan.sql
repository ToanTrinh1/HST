-- Migration: Thay CHỜ DUYỆT → Chờ chấp nhận, xóa CHỜ LOGIN (luồng admin mới)
-- Thứ tự: DROP constraint trước (vì constraint cũ không cho phép giá trị 'Chờ chấp nhận'),
-- sau đó UPDATE dữ liệu, cuối cùng ADD constraint mới.

-- Bước 1: Drop constraint cũ (để có thể ghi giá trị mới 'Chờ chấp nhận')
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

-- Bước 2: Cập nhật dữ liệu
UPDATE thong_tin_nhan_keo
SET tien_do_hoan_thanh = 'Chờ chấp nhận'
WHERE tien_do_hoan_thanh = 'CHỜ DUYỆT';

UPDATE thong_tin_nhan_keo
SET tien_do_hoan_thanh = 'ĐANG THỰC HIỆN'
WHERE tien_do_hoan_thanh = 'CHỜ LOGIN';

-- Bước 3: Chuẩn hóa mọi giá trị không nằm trong danh sách mới (phòng encoding/typo)
UPDATE thong_tin_nhan_keo
SET tien_do_hoan_thanh = 'ĐANG THỰC HIỆN'
WHERE tien_do_hoan_thanh IS NOT NULL
  AND tien_do_hoan_thanh NOT IN (
    'Đơn hàng mới',
    'Chờ chấp nhận',
    'ĐANG THỰC HIỆN',
    'DONE',
    'HỦY BỎ',
    'ĐỀN',
    'ĐANG QUÉT MÃ',
    'CHỜ TRỌNG TÀI'
);

-- Bước 4: Tạo lại constraint
ALTER TABLE thong_tin_nhan_keo
ADD CONSTRAINT thong_tin_nhan_keo_tien_do_hoan_thanh_check
CHECK (tien_do_hoan_thanh IN (
    'Đơn hàng mới',
    'Chờ chấp nhận',
    'ĐANG THỰC HIỆN',
    'DONE',
    'HỦY BỎ',
    'ĐỀN',
    'ĐANG QUÉT MÃ',
    'CHỜ TRỌNG TÀI'
));

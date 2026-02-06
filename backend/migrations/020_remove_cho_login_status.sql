-- Migration: Bỏ trạng thái "CHỜ LOGIN" (luồng mới)
-- 1) Đổi dữ liệu cũ "CHỜ LOGIN" -> "CHỜ DUYỆT" để admin xử lý theo luồng mới
UPDATE thong_tin_nhan_keo
SET tien_do_hoan_thanh = 'CHỜ DUYỆT'
WHERE tien_do_hoan_thanh = 'CHỜ LOGIN';

-- 2) (Tùy chọn) Nếu muốn bỏ luôn khỏi CHECK constraint:
-- Repo đang có nhiều migrations thay đổi constraint, nên phần này để an toàn sẽ KHÔNG tự động drop/add ở đây.
-- Nếu bạn muốn enforce cứng ở DB, mình sẽ viết migration drop/recreate constraint theo đúng tên constraint hiện tại trong môi trường của bạn.

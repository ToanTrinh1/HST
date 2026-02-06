-- Migration: Thêm cột id_admin_duyet (admin duyệt đơn) cho thong_tin_nhan_keo
-- Khi admin duyệt đơn từ CHỜ DUYỆT sang ĐANG THỰC HIỆN, gán admin đó vào đơn; các tab khác chỉ hiện đơn theo admin này.
-- Lợi nhuận tính theo admin cũng dựa trên cột này.

ALTER TABLE thong_tin_nhan_keo
ADD COLUMN IF NOT EXISTS id_admin_duyet VARCHAR(36) NULL REFERENCES nguoi_dung(id) ON DELETE SET NULL;

COMMENT ON COLUMN thong_tin_nhan_keo.id_admin_duyet IS 'ID admin đã duyệt đơn (chuyển từ CHỜ DUYỆT sang ĐANG THỰC HIỆN). Đơn sau đó chỉ hiện với admin này; lợi nhuận tính theo admin.';

CREATE INDEX IF NOT EXISTS idx_thong_tin_nhan_keo_id_admin_duyet ON thong_tin_nhan_keo(id_admin_duyet);

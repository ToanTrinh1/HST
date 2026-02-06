-- Thêm cột tiền cắt (tệ) để admin cắt bớt của user khi HỦY BỎ/ĐỀN
ALTER TABLE thong_tin_nhan_keo
ADD COLUMN IF NOT EXISTS tien_cat_te DECIMAL(10, 2) NOT NULL DEFAULT 0.0;

COMMENT ON COLUMN thong_tin_nhan_keo.tien_cat_te IS 'Số tiền (CNY) admin cắt bớt của user để bù lỗ (áp dụng cho HỦY BỎ/ĐỀN). Wallet user sẽ tính theo (cong_thuc_nhan_te - tien_cat_te).';


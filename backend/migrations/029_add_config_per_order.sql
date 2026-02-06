-- Lưu config tại thời điểm hoàn thành đơn để lợi nhuận không đổi khi config thay đổi sau này.
-- Chỉ đơn hoàn thành sau thời điểm đổi config mới dùng config mới.
ALTER TABLE thong_tin_nhan_keo
ADD COLUMN IF NOT EXISTS admin_receive_rate DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS fee_web_pct DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS fee_external_pct DECIMAL(5, 2);

COMMENT ON COLUMN thong_tin_nhan_keo.admin_receive_rate IS 'Tỷ giá admin nhận (VND/¥) tại thời điểm đơn hoàn thành';
COMMENT ON COLUMN thong_tin_nhan_keo.fee_web_pct IS 'Phí kèo web (%) tại thời điểm đơn hoàn thành';
COMMENT ON COLUMN thong_tin_nhan_keo.fee_external_pct IS 'Phí kèo ngoài (%) tại thời điểm đơn hoàn thành';

-- Backfill: đơn đã hoàn thành lấy config hiện tại (một lần)
UPDATE thong_tin_nhan_keo ttnk
SET
  admin_receive_rate = COALESCE(ttnk.admin_receive_rate, cer.admin_receive_rate),
  fee_web_pct = COALESCE(ttnk.fee_web_pct, cer.fee_web_pct),
  fee_external_pct = COALESCE(ttnk.fee_external_pct, cer.fee_external_pct)
FROM current_exchange_rate cer
WHERE cer.id = 1
  AND ttnk.thoi_gian_hoan_thanh IS NOT NULL
  AND ttnk.tien_do_hoan_thanh IN ('DONE', 'HỦY BỎ', 'ĐỀN');

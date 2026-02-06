-- Phí kèo web (%) và phí kèo ngoài (%) dùng cho tính lợi nhuận admin
ALTER TABLE current_exchange_rate
ADD COLUMN IF NOT EXISTS fee_web_pct DECIMAL(5, 2) NOT NULL DEFAULT 8.0;

ALTER TABLE current_exchange_rate
ADD COLUMN IF NOT EXISTS fee_external_pct DECIMAL(5, 2) NOT NULL DEFAULT 7.0;

COMMENT ON COLUMN current_exchange_rate.fee_web_pct IS 'Phí kèo web (%) dùng tính lợi nhuận admin, mặc định 8';
COMMENT ON COLUMN current_exchange_rate.fee_external_pct IS 'Phí kèo ngoài (%) dùng tính lợi nhuận admin, mặc định 7';

UPDATE current_exchange_rate SET fee_web_pct = 8.0, fee_external_pct = 7.0 WHERE id = 1;

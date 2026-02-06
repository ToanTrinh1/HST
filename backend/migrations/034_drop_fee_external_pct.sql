-- Bỏ phí kèo web (%) và phí kèo ngoài (%) trong config.
-- Phí kèo web = phí rút web + phí trung gian; phí kèo ngoài = phí rút ngoài + phí trung gian.
ALTER TABLE current_exchange_rate
DROP COLUMN IF EXISTS fee_external_pct;

ALTER TABLE current_exchange_rate
DROP COLUMN IF EXISTS fee_web_pct;

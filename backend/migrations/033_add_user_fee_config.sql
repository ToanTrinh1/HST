-- Config tính tiền cho user: phí rút tiền %, phí trung gian %, phí web (bảng theo giá kèo)
-- Phí rút tiền: web 2%, ngoài 1%. Phí trung gian: 6% chung. Tổng % = phí rút tiền + phí trung gian.
ALTER TABLE current_exchange_rate
ADD COLUMN IF NOT EXISTS fee_rut_tien_pct_web DECIMAL(5, 2) NOT NULL DEFAULT 2.0;

ALTER TABLE current_exchange_rate
ADD COLUMN IF NOT EXISTS fee_rut_tien_pct_ngoai DECIMAL(5, 2) NOT NULL DEFAULT 1.0;

ALTER TABLE current_exchange_rate
ADD COLUMN IF NOT EXISTS fee_trung_gian_pct DECIMAL(5, 2) NOT NULL DEFAULT 6.0;

-- Bảng phí web (tệ) theo giá kèo: [{max: 20, fee: 2}, {max: 50, fee: 4}, ...]. Tra cứu: giá kèo <= max thì dùng fee.
ALTER TABLE current_exchange_rate
ADD COLUMN IF NOT EXISTS fee_web_tiers JSONB;

COMMENT ON COLUMN current_exchange_rate.fee_rut_tien_pct_web IS 'Phí rút tiền (%) cho kèo web, mặc định 2';
COMMENT ON COLUMN current_exchange_rate.fee_rut_tien_pct_ngoai IS 'Phí rút tiền (%) cho kèo ngoài, mặc định 1';
COMMENT ON COLUMN current_exchange_rate.fee_trung_gian_pct IS 'Phí trung gian (%) chung cho web và ngoài, mặc định 6';
COMMENT ON COLUMN current_exchange_rate.fee_web_tiers IS 'Bảng phí web (tệ) theo giá kèo: [{max, fee}, ...]';

UPDATE current_exchange_rate SET
  fee_rut_tien_pct_web = 2.0,
  fee_rut_tien_pct_ngoai = 1.0,
  fee_trung_gian_pct = 6.0,
  fee_web_tiers = '[
    {"max":20,"fee":2},{"max":50,"fee":4},{"max":100,"fee":5},{"max":150,"fee":6},
    {"max":200,"fee":7},{"max":250,"fee":8},{"max":300,"fee":9},{"max":350,"fee":10},
    {"max":799,"fee":11},{"max":99999,"fee":20}
  ]'::jsonb
WHERE id = 1;

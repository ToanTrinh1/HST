-- Tỷ lệ % lợi nhuận admin thường được giữ (phần còn lại nộp admin tổng). Mặc định 60%.
ALTER TABLE current_exchange_rate
ADD COLUMN IF NOT EXISTS admin_keep_pct DECIMAL(5, 2) NOT NULL DEFAULT 60.0;

COMMENT ON COLUMN current_exchange_rate.admin_keep_pct IS 'Phần trăm lợi nhuận admin thường được giữ (60 = giữ 60%, nộp 40% cho admin tổng)';

UPDATE current_exchange_rate SET admin_keep_pct = 60.0 WHERE id = 1;

-- Tỷ giá trả user (exchange_rate) = 3550; tỷ giá bên trung trả admin (admin_receive_rate) = 3850 → chênh lệch 300 VND/¥
ALTER TABLE current_exchange_rate
ADD COLUMN IF NOT EXISTS admin_receive_rate DECIMAL(10, 2) NOT NULL DEFAULT 3850.0;

COMMENT ON COLUMN current_exchange_rate.admin_receive_rate IS 'Tỷ giá VND/CNY khi bên trung gian trả admin (đổi tệ ra VND). Chênh lệch lợi nhuận = admin_receive_rate - exchange_rate';

-- Đảm bảo có giá trị mặc định cho bản ghi hiện có
UPDATE current_exchange_rate SET admin_receive_rate = 3850.0 WHERE id = 1;

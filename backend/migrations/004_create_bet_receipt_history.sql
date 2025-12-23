-- Migration: Tạo bảng lưu lịch sử thay đổi đơn hàng
-- Created: 2024
-- Mô tả: Lưu lại lịch sử xóa và sửa đổi đơn hàng (bet receipts)

CREATE TABLE IF NOT EXISTS bet_receipt_history (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Thông tin đơn hàng gốc
    bet_receipt_id VARCHAR(36) NOT NULL, -- ID đơn hàng (có thể đã bị xóa)
    
    -- Loại thao tác (chỉ lưu UPDATE và DELETE, không lưu CREATE)
    action VARCHAR(20) NOT NULL CHECK (action IN ('UPDATE', 'DELETE')),
    
    -- Người thực hiện (nếu có)
    performed_by VARCHAR(36) REFERENCES nguoi_dung(id) ON DELETE SET NULL,
    
    -- Dữ liệu cũ (trước khi thay đổi) - lưu dạng JSON
    old_data JSONB,
    
    -- Dữ liệu mới (sau khi thay đổi) - lưu dạng JSON
    new_data JSONB,
    
    -- Các thay đổi cụ thể (chỉ các field đã thay đổi)
    changed_fields JSONB,
    
    -- Mô tả thay đổi
    description TEXT,
    
    -- Thời gian thực hiện
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bet_receipt_history_bet_receipt_id ON bet_receipt_history(bet_receipt_id);
CREATE INDEX IF NOT EXISTS idx_bet_receipt_history_action ON bet_receipt_history(action);
CREATE INDEX IF NOT EXISTS idx_bet_receipt_history_created_at ON bet_receipt_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bet_receipt_history_performed_by ON bet_receipt_history(performed_by);

-- Comment
COMMENT ON TABLE bet_receipt_history IS 'Lưu lịch sử thay đổi và xóa đơn hàng';
COMMENT ON COLUMN bet_receipt_history.old_data IS 'Dữ liệu cũ (trước khi thay đổi) dạng JSON';
COMMENT ON COLUMN bet_receipt_history.new_data IS 'Dữ liệu mới (sau khi thay đổi) dạng JSON';
COMMENT ON COLUMN bet_receipt_history.changed_fields IS 'Danh sách các field đã thay đổi và giá trị cũ/mới';


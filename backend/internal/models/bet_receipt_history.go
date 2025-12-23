package models

import "time"

// BetReceiptHistory - Lịch sử thay đổi đơn hàng
type BetReceiptHistory struct {
	ID              string    `json:"id" db:"id"`
	BetReceiptID    string    `json:"bet_receipt_id" db:"bet_receipt_id"`
	Action          string    `json:"action" db:"action"`                           // CREATE, UPDATE, DELETE
	PerformedBy     *string   `json:"performed_by,omitempty" db:"performed_by"`     // ID người thực hiện
	PerformedByName string    `json:"performed_by_name,omitempty" db:"-"`           // Tên người thực hiện (join)
	OldData         string    `json:"old_data,omitempty" db:"old_data"`             // JSON string
	NewData         string    `json:"new_data,omitempty" db:"new_data"`             // JSON string
	ChangedFields   string    `json:"changed_fields,omitempty" db:"changed_fields"` // JSON string
	Description     string    `json:"description,omitempty" db:"description"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`

	// Parsed data (không lưu trong DB, chỉ để hiển thị)
	OldBetReceipt *BetReceipt `json:"old_bet_receipt,omitempty" db:"-"`
	NewBetReceipt *BetReceipt `json:"new_bet_receipt,omitempty" db:"-"`
}

// HistoryAction constants
const (
	HistoryActionUpdate = "UPDATE"
	HistoryActionDelete = "DELETE"
)

// CreateHistoryRequest - Request để tạo lịch sử
type CreateHistoryRequest struct {
	BetReceiptID  string                 `json:"bet_receipt_id" binding:"required"`
	Action        string                 `json:"action" binding:"required"`
	PerformedBy   *string                `json:"performed_by"`
	OldData       map[string]interface{} `json:"old_data,omitempty"`
	NewData       map[string]interface{} `json:"new_data,omitempty"`
	ChangedFields map[string]interface{} `json:"changed_fields,omitempty"`
	Description   string                 `json:"description,omitempty"`
}

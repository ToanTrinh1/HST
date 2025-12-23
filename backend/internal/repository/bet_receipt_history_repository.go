package repository

import (
	"database/sql"
	"encoding/json"
	"fullstack-backend/internal/models"
	"log"
)

type BetReceiptHistoryRepository struct {
	db *sql.DB
}

func NewBetReceiptHistoryRepository(db *sql.DB) *BetReceiptHistoryRepository {
	return &BetReceiptHistoryRepository{db: db}
}

// Create tạo bản ghi lịch sử
func (r *BetReceiptHistoryRepository) Create(history *models.BetReceiptHistory) error {
	// Convert old_data, new_data, changed_fields to JSON strings
	var oldDataJSON, newDataJSON, changedFieldsJSON sql.NullString

	if history.OldData != "" {
		oldDataJSON = sql.NullString{String: history.OldData, Valid: true}
	}
	if history.NewData != "" {
		newDataJSON = sql.NullString{String: history.NewData, Valid: true}
	}
	if history.ChangedFields != "" {
		changedFieldsJSON = sql.NullString{String: history.ChangedFields, Valid: true}
	}

	var performedByID sql.NullString
	if history.PerformedBy != nil {
		performedByID = sql.NullString{String: *history.PerformedBy, Valid: true}
	}

	query := `
		INSERT INTO bet_receipt_history (
			bet_receipt_id, action, performed_by, old_data, new_data, changed_fields, description
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`

	err := r.db.QueryRow(
		query,
		history.BetReceiptID,
		history.Action,
		performedByID,
		oldDataJSON,
		newDataJSON,
		changedFieldsJSON,
		history.Description,
	).Scan(&history.ID, &history.CreatedAt)

	if err != nil {
		log.Printf("Repository - ❌ Lỗi tạo lịch sử: %v", err)
		return err
	}

	log.Printf("Repository - ✅ Đã tạo lịch sử thành công cho bet_receipt_id: %s, action: %s", history.BetReceiptID, history.Action)
	return nil
}

// GetAll lấy tất cả lịch sử (có phân trang)
func (r *BetReceiptHistoryRepository) GetAll(limit, offset int) ([]*models.BetReceiptHistory, error) {
	query := `
		SELECT 
			h.id,
			h.bet_receipt_id,
			h.action,
			h.performed_by,
			u.ten as performed_by_name,
			COALESCE(h.old_data::text, ''),
			COALESCE(h.new_data::text, ''),
			COALESCE(h.changed_fields::text, ''),
			COALESCE(h.description, ''),
			h.created_at
		FROM bet_receipt_history h
		LEFT JOIN nguoi_dung u ON h.performed_by = u.id
		ORDER BY h.created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.Query(query, limit, offset)
	if err != nil {
		log.Printf("Repository - ❌ Lỗi lấy danh sách lịch sử: %v", err)
		return nil, err
	}
	defer rows.Close()

	var histories []*models.BetReceiptHistory
	for rows.Next() {
		var h models.BetReceiptHistory
		var performedBy sql.NullString
		var performedByName sql.NullString
		var oldData, newData, changedFields sql.NullString

		err := rows.Scan(
			&h.ID,
			&h.BetReceiptID,
			&h.Action,
			&performedBy,
			&performedByName,
			&oldData,
			&newData,
			&changedFields,
			&h.Description,
			&h.CreatedAt,
		)
		if err != nil {
			log.Printf("Repository - ❌ Lỗi scan lịch sử: %v", err)
			continue
		}

		if performedBy.Valid {
			h.PerformedBy = &performedBy.String
		}
		if performedByName.Valid {
			h.PerformedByName = performedByName.String
		}
		if oldData.Valid {
			h.OldData = oldData.String
		}
		if newData.Valid {
			h.NewData = newData.String
		}
		if changedFields.Valid {
			h.ChangedFields = changedFields.String
		}

		histories = append(histories, &h)
	}

	return histories, nil
}

// GetByBetReceiptID lấy lịch sử theo bet_receipt_id
func (r *BetReceiptHistoryRepository) GetByBetReceiptID(betReceiptID string) ([]*models.BetReceiptHistory, error) {
	query := `
		SELECT 
			h.id,
			h.bet_receipt_id,
			h.action,
			h.performed_by,
			u.ten as performed_by_name,
			COALESCE(h.old_data::text, ''),
			COALESCE(h.new_data::text, ''),
			COALESCE(h.changed_fields::text, ''),
			COALESCE(h.description, ''),
			h.created_at
		FROM bet_receipt_history h
		LEFT JOIN nguoi_dung u ON h.performed_by = u.id
		WHERE h.bet_receipt_id = $1
		ORDER BY h.created_at DESC
	`

	rows, err := r.db.Query(query, betReceiptID)
	if err != nil {
		log.Printf("Repository - ❌ Lỗi lấy lịch sử theo bet_receipt_id: %v", err)
		return nil, err
	}
	defer rows.Close()

	var histories []*models.BetReceiptHistory
	for rows.Next() {
		var h models.BetReceiptHistory
		var performedBy sql.NullString
		var performedByName sql.NullString
		var oldData, newData, changedFields sql.NullString

		err := rows.Scan(
			&h.ID,
			&h.BetReceiptID,
			&h.Action,
			&performedBy,
			&performedByName,
			&oldData,
			&newData,
			&changedFields,
			&h.Description,
			&h.CreatedAt,
		)
		if err != nil {
			log.Printf("Repository - ❌ Lỗi scan lịch sử: %v", err)
			continue
		}

		if performedBy.Valid {
			h.PerformedBy = &performedBy.String
		}
		if performedByName.Valid {
			h.PerformedByName = performedByName.String
		}
		if oldData.Valid {
			h.OldData = oldData.String
		}
		if newData.Valid {
			h.NewData = newData.String
		}
		if changedFields.Valid {
			h.ChangedFields = changedFields.String
		}

		histories = append(histories, &h)
	}

	return histories, nil
}

// GetByID lấy một history record theo ID
func (r *BetReceiptHistoryRepository) GetByID(id string) (*models.BetReceiptHistory, error) {
	query := `
		SELECT 
			h.id,
			h.bet_receipt_id,
			h.action,
			h.performed_by,
			u.ten as performed_by_name,
			COALESCE(h.old_data::text, ''),
			COALESCE(h.new_data::text, ''),
			COALESCE(h.changed_fields::text, ''),
			COALESCE(h.description, ''),
			h.created_at
		FROM bet_receipt_history h
		LEFT JOIN nguoi_dung u ON h.performed_by = u.id
		WHERE h.id = $1
	`

	var h models.BetReceiptHistory
	var performedBy sql.NullString
	var performedByName sql.NullString
	var oldData, newData, changedFields sql.NullString

	err := r.db.QueryRow(query, id).Scan(
		&h.ID,
		&h.BetReceiptID,
		&h.Action,
		&performedBy,
		&performedByName,
		&oldData,
		&newData,
		&changedFields,
		&h.Description,
		&h.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Không tìm thấy
		}
		log.Printf("Repository - ❌ Lỗi lấy history theo ID: %v", err)
		return nil, err
	}

	if performedBy.Valid {
		h.PerformedBy = &performedBy.String
	}
	if performedByName.Valid {
		h.PerformedByName = performedByName.String
	}
	if oldData.Valid {
		h.OldData = oldData.String
	}
	if newData.Valid {
		h.NewData = newData.String
	}
	if changedFields.Valid {
		h.ChangedFields = changedFields.String
	}

	return &h, nil
}

// Helper function để convert BetReceipt sang JSON
func BetReceiptToJSON(betReceipt *models.BetReceipt) (string, error) {
	data, err := json.Marshal(betReceipt)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// Helper function để tìm các field đã thay đổi
func FindChangedFields(oldData, newData map[string]interface{}) map[string]interface{} {
	changed := make(map[string]interface{})
	
	// Check fields changed in newData
	for key, newValue := range newData {
		if oldValue, exists := oldData[key]; !exists || oldValue != newValue {
			changed[key] = map[string]interface{}{
				"old": oldValue,
				"new": newValue,
			}
		}
	}
	
	// Check fields removed (only in oldData)
	for key, oldValue := range oldData {
		if _, exists := newData[key]; !exists {
			changed[key] = map[string]interface{}{
				"old": oldValue,
				"new": nil,
			}
		}
	}
	
	return changed
}


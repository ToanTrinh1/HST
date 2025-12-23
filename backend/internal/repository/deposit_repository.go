package repository

import (
	"database/sql"
	"fullstack-backend/internal/models"
	"log"
	"time"
)

type DepositRepository struct {
	db *sql.DB
}

func NewDepositRepository(db *sql.DB) *DepositRepository {
	return &DepositRepository{db: db}
}

// Create tạo record nạp tiền mới
func (r *DepositRepository) Create(deposit *models.Deposit) error {
	// Tạo thang_nop từ thoi_gian_tao (format: YYYY-MM)
	depositMonth := time.Now().Format("2006-01")

	query := `
		INSERT INTO lich_su_nop_tien (
			id_nguoi_dung, so_tien_coc_vnd, thang_nop, ghi_chu, thoi_gian_tao
		)
		VALUES ($1, $2, $3, $4, NOW())
		RETURNING id, thoi_gian_tao
	`

	err := r.db.QueryRow(
		query,
		deposit.UserID,
		deposit.AmountVND,
		depositMonth,
		deposit.Notes,
	).Scan(&deposit.ID, &deposit.CreatedAt)

	if err != nil {
		log.Printf("Repository - ❌ Lỗi tạo deposit: %v", err)
		return err
	}

	deposit.DepositMonth = depositMonth
	log.Printf("Repository - ✅ Đã tạo deposit với ID: %s, UserID: %s, AmountVND: %.2f", 
		deposit.ID, deposit.UserID, deposit.AmountVND)
	return nil
}


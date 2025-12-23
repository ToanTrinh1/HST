package repository

import (
	"database/sql"
	"fullstack-backend/internal/models"
	"log"
	"time"
)

type WithdrawalRepository struct {
	db *sql.DB
}

func NewWithdrawalRepository(db *sql.DB) *WithdrawalRepository {
	return &WithdrawalRepository{db: db}
}

// Create tạo record rút tiền mới
func (r *WithdrawalRepository) Create(withdrawal *models.Withdrawal) error {
	// Tạo thang_rut từ thoi_gian_tao (format: YYYY-MM)
	withdrawalMonth := time.Now().Format("2006-01")

	var amountCNY *float64
	if withdrawal.AmountCNY > 0 {
		amountCNY = &withdrawal.AmountCNY
	}

	query := `
		INSERT INTO lich_su_rut_tien (
			id_nguoi_dung, so_tien_rut_te, so_tien_rut_vnd, thang_rut, ghi_chu, thoi_gian_tao
		)
		VALUES ($1, $2, $3, $4, $5, NOW())
		RETURNING id, thoi_gian_tao
	`

	err := r.db.QueryRow(
		query,
		withdrawal.UserID,
		amountCNY,
		withdrawal.AmountVND,
		withdrawalMonth,
		withdrawal.Notes,
	).Scan(&withdrawal.ID, &withdrawal.CreatedAt)

	if err != nil {
		log.Printf("Repository - ❌ Lỗi tạo withdrawal: %v", err)
		return err
	}

	withdrawal.WithdrawalMonth = withdrawalMonth
	log.Printf("Repository - ✅ Đã tạo withdrawal với ID: %s, UserID: %s, AmountVND: %.2f",
		withdrawal.ID, withdrawal.UserID, withdrawal.AmountVND)
	return nil
}


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

// WithdrawalWithUser chứa thông tin withdrawal kèm tên người dùng
type WithdrawalWithUser struct {
	models.Withdrawal
	UserName string `json:"user_name" db:"user_name"`
}

// GetAll lấy tất cả lịch sử rút tiền kèm tên người dùng, sắp xếp theo thời gian mới nhất
func (r *WithdrawalRepository) GetAll() ([]WithdrawalWithUser, error) {
	query := `
		SELECT 
			w.id,
			w.id_nguoi_dung,
			COALESCE(w.so_tien_rut_te, 0) as so_tien_rut_te,
			w.so_tien_rut_vnd,
			w.thang_rut,
			w.ghi_chu,
			w.thoi_gian_tao,
			COALESCE(u.ten, 'N/A') as user_name
		FROM lich_su_rut_tien w
		LEFT JOIN nguoi_dung u ON w.id_nguoi_dung = u.id
		ORDER BY w.thoi_gian_tao DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		log.Printf("Repository - ❌ Lỗi lấy danh sách withdrawals: %v", err)
		return nil, err
	}
	defer rows.Close()

	var withdrawals []WithdrawalWithUser
	for rows.Next() {
		var w WithdrawalWithUser
		var amountCNY sql.NullFloat64
		err := rows.Scan(
			&w.ID,
			&w.UserID,
			&amountCNY,
			&w.AmountVND,
			&w.WithdrawalMonth,
			&w.Notes,
			&w.CreatedAt,
			&w.UserName,
		)
		if err != nil {
			log.Printf("Repository - ❌ Lỗi scan withdrawal: %v", err)
			continue
		}
		if amountCNY.Valid {
			w.AmountCNY = amountCNY.Float64
		}
		withdrawals = append(withdrawals, w)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Repository - ❌ Lỗi khi iterate withdrawals: %v", err)
		return nil, err
	}

	log.Printf("Repository - ✅ Đã lấy %d withdrawals", len(withdrawals))
	return withdrawals, nil
}


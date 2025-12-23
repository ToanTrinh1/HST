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

// DepositWithUser chứa thông tin deposit kèm tên người dùng
type DepositWithUser struct {
	models.Deposit
	UserName string `json:"user_name" db:"user_name"`
}

// GetAll lấy tất cả lịch sử nạp tiền kèm tên người dùng, sắp xếp theo thời gian mới nhất
func (r *DepositRepository) GetAll() ([]DepositWithUser, error) {
	query := `
		SELECT 
			d.id,
			d.id_nguoi_dung,
			d.so_tien_coc_vnd,
			d.thang_nop,
			d.ghi_chu,
			d.thoi_gian_tao,
			COALESCE(u.ten, 'N/A') as user_name
		FROM lich_su_nop_tien d
		LEFT JOIN nguoi_dung u ON d.id_nguoi_dung = u.id
		ORDER BY d.thoi_gian_tao DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		log.Printf("Repository - ❌ Lỗi lấy danh sách deposits: %v", err)
		return nil, err
	}
	defer rows.Close()

	var deposits []DepositWithUser
	for rows.Next() {
		var d DepositWithUser
		err := rows.Scan(
			&d.ID,
			&d.UserID,
			&d.AmountVND,
			&d.DepositMonth,
			&d.Notes,
			&d.CreatedAt,
			&d.UserName,
		)
		if err != nil {
			log.Printf("Repository - ❌ Lỗi scan deposit: %v", err)
			continue
		}
		deposits = append(deposits, d)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Repository - ❌ Lỗi khi iterate deposits: %v", err)
		return nil, err
	}

	log.Printf("Repository - ✅ Đã lấy %d deposits", len(deposits))
	return deposits, nil
}


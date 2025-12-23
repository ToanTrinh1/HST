package models

import "time"

// Deposit - Lịch sử nộp tiền/Cọc (bảng lich_su_nop_tien)
// Lưu lại các lần nộp cọc để có thể xem theo tháng
type Deposit struct {
	ID           string    `json:"id" db:"id"`
	UserID       string    `json:"user_id" db:"id_nguoi_dung"`      // FK -> nguoi_dung.id
	AmountVND    float64   `json:"amount_vnd" db:"so_tien_coc_vnd"` // Số tiền cọc (VND)
	DepositMonth string    `json:"deposit_month" db:"thang_nop"`    // Tháng nộp (format: YYYY-MM, vd: "2024-12")
	Notes        string    `json:"notes" db:"ghi_chu"`              // Ghi chú
	CreatedAt    time.Time `json:"created_at" db:"thoi_gian_tao"`
}

// Request DTOs
type CreateDepositRequest struct {
	UserName  string  `json:"user_name" binding:"required"`  // Tên người dùng (từ cột ten trong nguoi_dung)
	AmountVND float64 `json:"amount_vnd" binding:"required"` // Số tiền VND cần nạp
	Notes     string  `json:"notes"`                         // Ghi chú
	// TODO: Khi tạo deposit, cần update tien_keo:
	// tong_coc_vnd += so_tien_coc_vnd
	// so_du_hien_tai_vnd += so_tien_coc_vnd (hoặc tính lại)
}

// TODO: Query helper để lấy deposits theo tháng
// Có thể tạo method hoặc repository function để query theo thang_nop
// Ví dụ: GetDepositsByMonth(userID, month) -> []Deposit

package models

import "time"

// Withdrawal - Lịch sử rút tiền (bảng lich_su_rut_tien)
// Lưu lại các lần rút tiền để có thể xem theo tháng (T9, T10, T11, T12, ...)
type Withdrawal struct {
	ID              string    `json:"id" db:"id"`
	UserID          string    `json:"user_id" db:"id_nguoi_dung"`      // FK -> nguoi_dung.id
	AmountCNY       float64   `json:"amount_cny" db:"so_tien_rut_te"`  // Số tiền rút (tệ) - nullable
	AmountVND       float64   `json:"amount_vnd" db:"so_tien_rut_vnd"` // Số tiền rút (VND)
	WithdrawalMonth string    `json:"withdrawal_month" db:"thang_rut"` // Tháng rút (format: YYYY-MM, vd: "2024-12")
	Notes           string    `json:"notes" db:"ghi_chu"`              // Ghi chú
	CreatedAt       time.Time `json:"created_at" db:"thoi_gian_tao"`
}

// Request DTOs
type CreateWithdrawalRequest struct {
	UserName  string   `json:"user_name" binding:"required"`  // Tên người dùng (từ cột ten trong nguoi_dung)
	AmountCNY *float64 `json:"amount_cny"`                    // Optional
	AmountVND float64  `json:"amount_vnd" binding:"required"` // Số tiền VND cần rút
	Notes     string   `json:"notes"`                         // Ghi chú
	// TODO: Khi tạo withdrawal, cần update tien_keo:
	// tong_da_rut_vnd += so_tien_rut_vnd
	// so_du_hien_tai_vnd -= so_tien_rut_vnd (hoặc tính lại)
	// Lưu ý: Cho phép rút tiền ngay cả khi số dư không đủ (số dư có thể âm)
}

// TODO: Query helper để lấy withdrawals theo tháng
// Có thể tạo method hoặc repository function để query theo thang_rut
// Ví dụ: GetWithdrawalsByMonth(userID, month) -> []Withdrawal

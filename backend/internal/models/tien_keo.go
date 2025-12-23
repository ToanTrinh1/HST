package models

import "time"

// Wallet - Bảng tien_keo (Tổng hợp tài chính - Bảng 2)
// Lưu tổng hợp tài chính theo user, được cập nhật khi thong_tin_nhan_keo chuyển sang DONE
type Wallet struct {
	ID     string `json:"id" db:"id"`
	UserID string `json:"user_id" db:"id_nguoi_dung"` // FK -> nguoi_dung.id (unique)

	// Số dư theo CNY (Tệ)
	TotalReceivedCNY  float64 `json:"total_received_cny" db:"tong_cong_thuc_nhan_te"` // Tổng công thực nhận (tệ) - default 0
	TotalWithdrawnCNY float64 `json:"total_withdrawn_cny" db:"tong_da_rut_te"`        // Tổng đã rút (tệ) - default 0

	// Số dư theo VND
	TotalReceivedVND  float64 `json:"total_received_vnd" db:"tong_cong_thuc_nhan_vnd"` // Tổng công thực nhận (VND) - default 0
	TotalDepositVND   float64 `json:"total_deposit_vnd" db:"tong_coc_vnd"`             // Tổng cọc (VND) - default 0
	TotalWithdrawnVND float64 `json:"total_withdrawn_vnd" db:"tong_da_rut_vnd"`        // Tổng đã rút (VND) - default 0

	// TODO: Tính toán công thức so_du_hien_tai_vnd
	// Công thức: so_du_hien_tai_vnd = tong_cong_thuc_nhan_vnd + tong_coc_vnd - tong_da_rut_vnd
	// Có thể tính trong code hoặc dùng database trigger/computed column
	CurrentBalanceVND float64 `json:"current_balance_vnd" db:"so_du_hien_tai_vnd"` // Số dư hiện tại (VND) - TÍNH TOÁN SAU

	UpdatedAt time.Time `json:"updated_at" db:"thoi_gian_cap_nhat"`
}

// Request DTOs
type WalletUpdateRequest struct {
	// Khi cập nhật wallet, có thể update trực tiếp các trường hoặc tính toán lại
	// TODO: Implement logic tính toán khi:
	// 1. thong_tin_nhan_keo chuyển sang DONE -> cộng vào tong_cong_thuc_nhan_te và tong_cong_thuc_nhan_vnd
	// 2. User rút tiền -> cộng vào tong_da_rut_te/tong_da_rut_vnd
	// 3. User nộp cọc -> cộng vào tong_coc_vnd
	// 4. Luôn tính lại so_du_hien_tai_vnd sau mỗi thay đổi
}

// TODO: Exchange Rate
// Cần quyết định cách lưu tỷ giá:
// 1. Lưu trong config/env variable (nếu tỷ giá cố định)
// 2. Lưu trong bảng exchange_rates (nếu tỷ giá thay đổi theo thời gian)
// 3. Lưu trong từng transaction (nếu mỗi transaction có tỷ giá riêng)
//
// Ví dụ khi tính tong_cong_thuc_nhan_vnd từ tong_cong_thuc_nhan_te:
// tong_cong_thuc_nhan_vnd = tong_cong_thuc_nhan_te * exchange_rate
// Exchange rate hiện tại trong hình là 3550

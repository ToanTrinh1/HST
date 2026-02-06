package models

import "time"

// BetReceipt - Bảng thông tin nhận kèo (Bảng 1)
type BetReceipt struct {
	ID                string  `json:"id" db:"id"`
	STT               int     `json:"stt" db:"stt"`                                       // Số thứ tự
	UserID            string  `json:"user_id" db:"id_nguoi_dung"`                         // FK -> nguoi_dung.id
	UserName          string  `json:"user_name" db:"-"`                                   // Tên người dùng (join từ nguoi_dung.ten, không map từ DB)
	TaskCode          string  `json:"task_code" db:"ma_nhiem_vu"`                         // Mã nhiệm vụ (vd: "lb3-kc1", "kc4-96-ct")
	BetType           string  `json:"bet_type" db:"loai_keo"`                             // Loại kèo: "web" hoặc "Kèo ngoài"
	WebBetAmountCNY   float64 `json:"web_bet_amount_cny" db:"tien_keo_web_te"`            // Tiền kèo web (tệ)
	OrderCode         string  `json:"order_code" db:"ma_don_hang"`                        // Mã đơn hàng
	Notes             string  `json:"notes" db:"ghi_chu"`                                 // Ghi chú
	Status            string  `json:"status" db:"tien_do_hoan_thanh"`                     // Tiến độ: "Đơn hàng mới", "Chờ chấp nhận", "ĐANG THỰC HIỆN", "DONE", "HỦY BỎ", "ĐỀN", "ĐANG QUÉT MÃ", "CHỜ TRỌNG TÀI"
	CancelReason      string  `json:"cancel_reason" db:"ly_do_huy"`                       // Lý do hủy bỏ (chỉ có giá trị khi status = HỦY BỎ)
	ActualReceivedCNY float64 `json:"actual_received_cny" db:"tien_keo_web_thuc_nhan_te"` // Tiền kèo Web thực nhận (tệ)
	CompensationCNY   float64 `json:"compensation_cny" db:"tien_den_te"`                  // Tiền đền (tệ)
	UserCutCNY        float64 `json:"user_cut_cny" db:"tien_cat_te"`                      // Tiền cắt bớt của user (tệ) - admin nhập khi HỦY BỎ/ĐỀN

	// TODO: Tính toán công thức cong_thuc_nhan_te
	// Công thức tính: cong_thuc_nhan_te = f(tien_keo_web_thuc_nhan_te, tien_den_te, ...)
	// Ví dụ có thể là: tien_keo_web_thuc_nhan_te - tien_den_te hoặc công thức phức tạp hơn
	ActualAmountCNY float64 `json:"actual_amount_cny" db:"cong_thuc_nhan_te"` // Công thực nhận (tệ) - TÍNH TOÁN SAU
	ExchangeRate    float64 `json:"exchange_rate" db:"exchange_rate"`         // Tỷ giá VND/CNY (đọc từ DB; dùng cho wallet)

	Account  string `json:"account" db:"tai_khoan"` // Tài khoản
	Password string `json:"password" db:"mat_khau"` // Mật khẩu
	Region   string `json:"region" db:"khu_vuc"`    // Khu vực

	AssignedAdminID   *string `json:"assigned_admin_id,omitempty" db:"id_admin_duyet"` // Admin tạo đơn hoặc đã chấp nhận đơn
	AssignedAdminName string  `json:"assigned_admin_name,omitempty" db:"-"`            // Tên admin (join từ nguoi_dung.ten theo id_admin_duyet)

	OrderSerialNo string `json:"order_serial_no,omitempty" db:"order_serial_no"` // SerialNo từ link dailiantong (nếu có)
	OrderPublish  *int   `json:"order_publish,omitempty" db:"order_publish"`     // Publish từ link dailiantong (nếu có)
	OrderLink     string `json:"order_link,omitempty" db:"-"`                    // Link rút gọn để mở kèo (tạo từ serialno/publish)

	ReceivedAt             time.Time  `json:"received_at" db:"thoi_gian_nhan_keo"`                       // Thời gian nhận kèo (cũng chính là thời gian tạo)
	StartedAt              *time.Time `json:"started_at,omitempty" db:"thoi_gian_bat_dau"`               // Thời gian bắt đầu cày (user xác nhận login OK)
	CompletedAt            *time.Time `json:"completed_at,omitempty" db:"thoi_gian_hoan_thanh"`          // Thời gian hoàn thành thực tế (nullable)
	CompletedHours         *int       `json:"completed_hours,omitempty" db:"-"`                          // Thời gian hoàn thành (số giờ) - tính từ time_remaining_hours ban đầu
	TimeRemainingHours     *int       `json:"time_remaining_hours,omitempty" db:"thoi_gian_con_lai_gio"` // Thời gian còn lại (giờ) - nullable
	TimeRemainingFormatted string     `json:"time_remaining_formatted,omitempty" db:"-"`                 // Thời gian còn lại đã format (giờ:phút) - tính toán từ completed_hours và received_at

	UpdatedAt time.Time `json:"updated_at" db:"thoi_gian_cap_nhat"` // Thời gian cập nhật
}

// BetReceiptStatus constants
const (
	BetReceiptStatusNew          = "Đơn hàng mới"
	BetReceiptStatusChoChapNhan  = "Chờ chấp nhận"
	BetReceiptStatusInProgress   = "ĐANG THỰC HIỆN"
	BetReceiptStatusDone         = "DONE"
	BetReceiptStatusCancelled    = "HỦY BỎ"
	BetReceiptStatusCompensation = "ĐỀN"
	BetReceiptStatusScanning     = "ĐANG QUÉT MÃ"
	BetReceiptStatusWaitingRef   = "CHỜ TRỌNG TÀI"
)

// BetType constants
const (
	BetTypeWeb      = "web"
	BetTypeExternal = "Kèo ngoài"
)

// Request DTOs
type CreateBetReceiptRequest struct {
	UserName        string  `json:"user_name"`                             // Tên người dùng (từ cột ten trong nguoi_dung) - Optional: nếu user tự tạo thì không cần, admin tạo thì bắt buộc
	TaskCode        string  `json:"task_code" binding:"required"`          // Nhiệm vụ (Title từ API)
	BetType         string  `json:"bet_type" binding:"required"`           // Loại kèo: "web" hoặc "Kèo ngoài"
	WebBetAmountCNY float64 `json:"web_bet_amount_cny" binding:"required"` // Tiền kèo web (CNY) - từ Price
	OrderCode       string  `json:"order_code"`                            // Mã đơn hàng - từ SerialNo
	Notes           string  `json:"notes"`                                 // Ghi chú
	Account         string  `json:"account"`                               // Tài khoản - Admin sẽ điền sau
	Password        string  `json:"password"`                              // Mật khẩu - Admin sẽ điền sau
	Region          string  `json:"region"`                                // Khu vực - từ Server (user có thể điền)
	CompletedHours  *int    `json:"completed_hours"`                       // Thời gian hoàn thành (số giờ) - từ TimeLimit
	OrderSerialNo   *string `json:"order_serial_no"`                       // SerialNo từ link (optional)
	OrderPublish    *int    `json:"order_publish"`                         // Publish từ link (optional)
}

// ParseOrderLinkRequest request để lấy chi tiết đơn hàng từ serialno và publish
type ParseOrderLinkRequest struct {
	SerialNo string `json:"serialno" binding:"required"` // SerialNo từ link
	Publish  int    `json:"publish"`                     // Publish (default: 2)
}

type UpdateBetReceiptStatusRequest struct {
	Status            string     `json:"status" binding:"required"`
	ActualReceivedCNY *float64   `json:"actual_received_cny"`
	CompensationCNY   *float64   `json:"compensation_cny"`
	UserCutCNY        *float64   `json:"user_cut_cny"`  // Tiền cắt (tệ) admin nhập khi HỦY BỎ/ĐỀN
	CancelReason      *string    `json:"cancel_reason"` // Lý do hủy bỏ hoặc lý do đền (bắt buộc khi status = ĐỀN)
	CompletedAt       *time.Time `json:"completed_at"`
	// TODO: Khi update tien_do_hoan_thanh sang "DONE", cần tính cong_thuc_nhan_te
	// cong_thuc_nhan_te sẽ được tính tự động dựa trên công thức
}

type UpdateBetReceiptRequest struct {
	UserName        *string  `json:"user_name"`          // Tên người dùng (từ cột ten trong nguoi_dung)
	TaskCode        *string  `json:"task_code"`          // Mã nhiệm vụ
	BetType         *string  `json:"bet_type"`           // Loại kèo: "web" hoặc "Kèo ngoài"
	WebBetAmountCNY *float64 `json:"web_bet_amount_cny"` // Tiền kèo web (tệ)
	OrderCode       *string  `json:"order_code"`         // Mã đơn hàng
	Notes           *string  `json:"notes"`              // Ghi chú
	Account         *string  `json:"account"`            // Tài khoản
	Password        *string  `json:"password"`           // Mật khẩu
	Region          *string  `json:"region"`             // Khu vực
	CompletedHours  *int     `json:"completed_hours"`    // Thời gian hoàn thành (số giờ)
	OrderSerialNo   *string  `json:"order_serial_no"`    // SerialNo từ link (optional)
	OrderPublish    *int     `json:"order_publish"`      // Publish từ link (optional)
}

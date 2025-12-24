package repository

import (
	"database/sql"
	"fmt"
	"fullstack-backend/internal/models"
	"log"
	"math"
	"time"
)

type BetReceiptRepository struct {
	db *sql.DB
}

func NewBetReceiptRepository(db *sql.DB) *BetReceiptRepository {
	return &BetReceiptRepository{db: db}
}

// GetDB trả về database connection (để sử dụng trong service)
func (r *BetReceiptRepository) GetDB() *sql.DB {
	return r.db
}

// Create tạo đơn hàng (thông tin nhận kèo) mới
func (r *BetReceiptRepository) Create(betReceipt *models.BetReceipt) error {
	// Lấy số thứ tự tiếp theo (số lượng đơn hàng hiện tại + 1)
	var maxSTT sql.NullInt64
	err := r.db.QueryRow("SELECT COALESCE(MAX(stt), 0) FROM thong_tin_nhan_keo").Scan(&maxSTT)
	if err != nil {
		return err
	}
	stt := 1
	if maxSTT.Valid {
		stt = int(maxSTT.Int64) + 1
	}
	betReceipt.STT = stt

	query := `
        INSERT INTO thong_tin_nhan_keo (
            stt, id_nguoi_dung, ma_nhiem_vu, loai_keo, tien_keo_web_te, 
            ma_don_hang, ghi_chu, tien_do_hoan_thanh, 
            tai_khoan, mat_khau, khu_vuc,
            thoi_gian_nhan_keo, thoi_gian_con_lai_gio, thoi_gian_cap_nhat
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, NOW()) 
        RETURNING id, thoi_gian_nhan_keo, thoi_gian_cap_nhat
    `
	return r.db.QueryRow(
		query,
		betReceipt.STT,
		betReceipt.UserID,
		betReceipt.TaskCode,
		betReceipt.BetType,
		betReceipt.WebBetAmountCNY,
		betReceipt.OrderCode,
		betReceipt.Notes,
		betReceipt.Status,
		betReceipt.Account,
		betReceipt.Password,
		betReceipt.Region,
		betReceipt.TimeRemainingHours,
	).Scan(&betReceipt.ID, &betReceipt.ReceivedAt, &betReceipt.UpdatedAt)
}

// GetAll lấy tất cả đơn hàng (thông tin nhận kèo) có phân trang, join với bảng nguoi_dung để lấy tên
func (r *BetReceiptRepository) GetAll(limit, offset int) ([]*models.BetReceipt, error) {
	query := `
        SELECT 
            ttnk.id, ttnk.stt, ttnk.id_nguoi_dung, nd.ten as user_name,
            ttnk.ma_nhiem_vu, ttnk.loai_keo, ttnk.tien_keo_web_te,
            ttnk.ma_don_hang, ttnk.ghi_chu, ttnk.tien_do_hoan_thanh, 
            ttnk.tien_keo_web_thuc_nhan_te, ttnk.tien_den_te, ttnk.cong_thuc_nhan_te,
            ttnk.ly_do_huy, ttnk.tai_khoan, ttnk.mat_khau, ttnk.khu_vuc,
            ttnk.thoi_gian_nhan_keo, ttnk.thoi_gian_hoan_thanh,
            ttnk.thoi_gian_con_lai_gio, ttnk.thoi_gian_cap_nhat
        FROM thong_tin_nhan_keo ttnk
        LEFT JOIN nguoi_dung nd ON ttnk.id_nguoi_dung = nd.id
        ORDER BY ttnk.stt ASC
        LIMIT $1 OFFSET $2
    `
	log.Printf("Repository - 🔍 Executing query với limit=%d, offset=%d", limit, offset)

	// Kiểm tra connection trước khi query (connection pool sẽ tự động reconnect nếu cần)
	if err := r.db.Ping(); err != nil {
		log.Printf("Repository - ❌ Database connection error: %v", err)
		return nil, fmt.Errorf("database connection error: %w", err)
	}

	rows, err := r.db.Query(query, limit, offset)
	if err != nil {
		log.Printf("Repository - ❌ Lỗi khi execute query: %v", err)
		return nil, err
	}
	defer rows.Close()

	betReceipts := []*models.BetReceipt{}
	rowCount := 0
	for rows.Next() {
		rowCount++
		betReceipt := &models.BetReceipt{}
		var completedAt sql.NullTime
		var timeRemainingHours sql.NullInt64
		var userName sql.NullString
		var cancelReason sql.NullString
		var account sql.NullString
		var password sql.NullString
		var region sql.NullString

		err := rows.Scan(
			&betReceipt.ID,
			&betReceipt.STT,
			&betReceipt.UserID,
			&userName,
			&betReceipt.TaskCode,
			&betReceipt.BetType,
			&betReceipt.WebBetAmountCNY,
			&betReceipt.OrderCode,
			&betReceipt.Notes,
			&betReceipt.Status,
			&betReceipt.ActualReceivedCNY,
			&betReceipt.CompensationCNY,
			&betReceipt.ActualAmountCNY,
			&cancelReason,
			&account,
			&password,
			&region,
			&betReceipt.ReceivedAt,
			&completedAt,
			&timeRemainingHours,
			&betReceipt.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if userName.Valid {
			betReceipt.UserName = userName.String
			log.Printf("Repository - ✅ BetReceipt ID: %s, UserID: %s, UserName: %s", betReceipt.ID, betReceipt.UserID, betReceipt.UserName)
		} else {
			// Nếu không tìm thấy tên trong DB (JOIN không match), hiển thị thông báo
			betReceipt.UserName = "không có trong db"
			log.Printf("Repository - ⚠️ BetReceipt ID: %s, UserID: %s, UserName: NULL (không tìm thấy trong DB)", betReceipt.ID, betReceipt.UserID)
		}

		if cancelReason.Valid {
			betReceipt.CancelReason = cancelReason.String
		}

		if account.Valid {
			betReceipt.Account = account.String
		} else {
			betReceipt.Account = ""
		}

		if password.Valid {
			betReceipt.Password = password.String
		} else {
			betReceipt.Password = ""
		}

		if region.Valid {
			betReceipt.Region = region.String
		} else {
			betReceipt.Region = ""
		}

		if completedAt.Valid {
			betReceipt.CompletedAt = &completedAt.Time
			// Tính thời gian hoàn thành thực tế (số giờ) = CompletedAt - ReceivedAt
			elapsed := completedAt.Time.Sub(betReceipt.ReceivedAt)
			// Làm tròn theo quy tắc chuẩn: .1-.4 làm tròn xuống, từ .5 làm tròn lên
			completedHours := int(math.Round(elapsed.Hours()))
			// Nếu < 1 giờ thì trả về 1 giờ
			if completedHours < 1 {
				completedHours = 1
			}
			betReceipt.CompletedHours = &completedHours
		} else {
			betReceipt.CompletedHours = nil
		}
		if timeRemainingHours.Valid {
			hours := int(timeRemainingHours.Int64)
			betReceipt.TimeRemainingHours = &hours

			// Tính toán thời gian còn lại thực tế dựa trên thời gian đã trôi qua
			now := time.Now()
			elapsed := now.Sub(betReceipt.ReceivedAt)
			elapsedHours := int(elapsed.Hours())

			// Thời gian còn lại = Thời gian hoàn thành - Số giờ đã trôi qua
			remainingHours := hours - elapsedHours
			if remainingHours < 0 {
				remainingHours = 0
			}

			// Tính số phút còn lại (phần lẻ của giờ)
			elapsedMinutes := int(elapsed.Minutes())
			remainingMinutes := (hours * 60) - elapsedMinutes
			if remainingMinutes < 0 {
				remainingMinutes = 0
			}

			// Format: giờ:phút (ví dụ: 20:00, 19:30)
			remainingHoursFormatted := remainingMinutes / 60
			remainingMinutesFormatted := remainingMinutes % 60
			betReceipt.TimeRemainingFormatted = fmt.Sprintf("%02d:%02d", remainingHoursFormatted, remainingMinutesFormatted)
		} else {
			betReceipt.TimeRemainingFormatted = ""
		}

		betReceipts = append(betReceipts, betReceipt)
	}

	log.Printf("Repository - ✅ Đã scan %d rows từ database", rowCount)
	return betReceipts, nil
}

// FindByID tìm đơn hàng (thông tin nhận kèo) theo ID
func (r *BetReceiptRepository) FindByID(id string) (*models.BetReceipt, error) {
	betReceipt := &models.BetReceipt{}
	var completedAt sql.NullTime
	var timeRemainingHours sql.NullInt64

	query := `
        SELECT 
            id, stt, id_nguoi_dung, ma_nhiem_vu, loai_keo, tien_keo_web_te,
            ma_don_hang, ghi_chu, tien_do_hoan_thanh, tien_keo_web_thuc_nhan_te,
            tien_den_te, cong_thuc_nhan_te, ly_do_huy, tai_khoan, mat_khau, khu_vuc,
            thoi_gian_nhan_keo, thoi_gian_hoan_thanh,
            thoi_gian_con_lai_gio, thoi_gian_cap_nhat
        FROM thong_tin_nhan_keo 
        WHERE id = $1
    `
	var cancelReason sql.NullString
	var account sql.NullString
	var password sql.NullString
	var region sql.NullString
	err := r.db.QueryRow(query, id).Scan(
		&betReceipt.ID,
		&betReceipt.STT,
		&betReceipt.UserID,
		&betReceipt.TaskCode,
		&betReceipt.BetType,
		&betReceipt.WebBetAmountCNY,
		&betReceipt.OrderCode,
		&betReceipt.Notes,
		&betReceipt.Status,
		&betReceipt.ActualReceivedCNY,
		&betReceipt.CompensationCNY,
		&betReceipt.ActualAmountCNY,
		&cancelReason,
		&account,
		&password,
		&region,
		&betReceipt.ReceivedAt,
		&completedAt,
		&timeRemainingHours,
		&betReceipt.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if cancelReason.Valid {
		betReceipt.CancelReason = cancelReason.String
	}

	if account.Valid {
		betReceipt.Account = account.String
	} else {
		betReceipt.Account = ""
	}

	if password.Valid {
		betReceipt.Password = password.String
	} else {
		betReceipt.Password = ""
	}

	if region.Valid {
		betReceipt.Region = region.String
	} else {
		betReceipt.Region = ""
	}

	if completedAt.Valid {
		betReceipt.CompletedAt = &completedAt.Time
		// Tính thời gian hoàn thành thực tế (số giờ) = CompletedAt - ReceivedAt
		elapsed := completedAt.Time.Sub(betReceipt.ReceivedAt)
		completedHours := int(elapsed.Hours())
		betReceipt.CompletedHours = &completedHours
	} else {
		betReceipt.CompletedHours = nil
	}
	if timeRemainingHours.Valid {
		hours := int(timeRemainingHours.Int64)
		betReceipt.TimeRemainingHours = &hours
	}

	return betReceipt, nil
}

// UpdateStatus cập nhật status và các trường liên quan của đơn hàng
// Xử lý thoi_gian_hoan_thanh:
// - Nếu status là "HỦY BỎ", "DONE", "ĐỀN", "CHỜ CHẤP NHẬN", hoặc "CHỜ TRỌNG TÀI": dùng CompletedAt từ betReceipt (có thể là NULL hoặc có giá trị)
// - Nếu status không phải các status trên: set về NULL
func (r *BetReceiptRepository) UpdateStatus(betReceipt *models.BetReceipt) error {
	// Xử lý thoi_gian_hoan_thanh dựa trên status
	var completedAt interface{}
	if betReceipt.Status == "HỦY BỎ" || betReceipt.Status == "DONE" || betReceipt.Status == "ĐỀN" ||
		betReceipt.Status == "CHỜ CHẤP NHẬN" || betReceipt.Status == "CHỜ TRỌNG TÀI" {
		// Status là một trong các status trên: dùng CompletedAt từ betReceipt
		if betReceipt.CompletedAt != nil {
			completedAt = *betReceipt.CompletedAt
		} else {
			// Nếu CompletedAt là nil, set về NULL trong database
			completedAt = nil
		}
	} else {
		// Status không phải các status trên: set về NULL
		completedAt = nil
	}

	// Xử lý thoi_gian_con_lai_gio (Deadline):
	// Deadline không bao giờ bị thay đổi khi update status, chỉ có thể thay đổi khi update thông thường
	// Giữ nguyên giá trị từ betReceipt (đã được load từ DB hiện tại)
	var timeRemainingHours interface{}
	if betReceipt.TimeRemainingHours != nil {
		timeRemainingHours = *betReceipt.TimeRemainingHours
	} else {
		timeRemainingHours = nil
	}

	query := `
		UPDATE thong_tin_nhan_keo
		SET 
			tien_do_hoan_thanh = $1,
			cong_thuc_nhan_te = $2,
			tien_keo_web_thuc_nhan_te = $3,
			tien_den_te = $4,
			tien_keo_web_te = $5,
			thoi_gian_hoan_thanh = $6,
			thoi_gian_con_lai_gio = $7,
			ly_do_huy = $8,
			thoi_gian_cap_nhat = NOW()
		WHERE id = $9
	`

	var cancelReason interface{}
	if betReceipt.CancelReason != "" {
		cancelReason = betReceipt.CancelReason
	} else {
		cancelReason = nil
	}

	_, err := r.db.Exec(
		query,
		betReceipt.Status,
		betReceipt.ActualAmountCNY,   // cong_thuc_nhan_te
		betReceipt.ActualReceivedCNY, // tien_keo_web_thuc_nhan_te
		betReceipt.CompensationCNY,   // tien_den_te
		betReceipt.WebBetAmountCNY,   // tien_keo_web_te (có thể được cập nhật khi status = HỦY BỎ)
		completedAt,                  // thoi_gian_hoan_thanh
		timeRemainingHours,           // thoi_gian_con_lai_gio
		cancelReason,                 // ly_do_huy
		betReceipt.ID,
	)

	if err != nil {
		log.Printf("Repository - ❌ Lỗi cập nhật status: %v", err)
		return err
	}

	log.Printf("Repository - ✅ Đã cập nhật status thành công cho đơn hàng ID: %s", betReceipt.ID)
	return nil
}

// Update cập nhật các trường thông thường của đơn hàng (không phải status)
func (r *BetReceiptRepository) Update(id string, req *models.UpdateBetReceiptRequest) error {
	// Lấy thông tin đơn hàng hiện tại
	betReceipt, err := r.FindByID(id)
	if err != nil {
		return err
	}

	// Cập nhật các trường nếu được cung cấp
	if req.UserName != nil {
		// Tìm user theo tên (tìm chính xác)
		userRepo := NewUserRepository(r.db)
		users, err := userRepo.FindByName(*req.UserName)
		if err != nil {
			return fmt.Errorf("lỗi khi tìm user: %w", err)
		}
		if len(users) == 0 {
			return fmt.Errorf("không tìm thấy người dùng với tên: %s", *req.UserName)
		}
		// Lấy user đầu tiên (FindByName tìm chính xác nên chỉ có 1 kết quả)
		betReceipt.UserID = users[0].ID
	}
	if req.TaskCode != nil {
		betReceipt.TaskCode = *req.TaskCode
	}
	if req.BetType != nil {
		betReceipt.BetType = *req.BetType
	}
	if req.WebBetAmountCNY != nil {
		betReceipt.WebBetAmountCNY = *req.WebBetAmountCNY
	}
	if req.OrderCode != nil {
		betReceipt.OrderCode = *req.OrderCode
	}
	if req.Notes != nil {
		betReceipt.Notes = *req.Notes
	}
	if req.Account != nil {
		betReceipt.Account = *req.Account
	}
	if req.Password != nil {
		betReceipt.Password = *req.Password
	}
	if req.Region != nil {
		betReceipt.Region = *req.Region
	}
	if req.CompletedHours != nil {
		hours := *req.CompletedHours
		betReceipt.TimeRemainingHours = &hours
	}

	// Update database
	query := `
		UPDATE thong_tin_nhan_keo
		SET 
			id_nguoi_dung = $1,
			ma_nhiem_vu = $2,
			loai_keo = $3,
			tien_keo_web_te = $4,
			ma_don_hang = $5,
			ghi_chu = $6,
			tai_khoan = $7,
			mat_khau = $8,
			khu_vuc = $9,
			thoi_gian_con_lai_gio = $10,
			thoi_gian_cap_nhat = NOW()
		WHERE id = $11
	`

	_, err = r.db.Exec(
		query,
		betReceipt.UserID,
		betReceipt.TaskCode,
		betReceipt.BetType,
		betReceipt.WebBetAmountCNY,
		betReceipt.OrderCode,
		betReceipt.Notes,
		betReceipt.Account,
		betReceipt.Password,
		betReceipt.Region,
		betReceipt.TimeRemainingHours,
		id,
	)

	if err != nil {
		log.Printf("Repository - ❌ Lỗi cập nhật đơn hàng: %v", err)
		return err
	}

	log.Printf("Repository - ✅ Đã cập nhật đơn hàng thành công cho ID: %s", id)
	return nil
}

// Delete xóa đơn hàng theo ID
func (r *BetReceiptRepository) Delete(id string) error {
	// Kiểm tra xem đơn hàng có tồn tại không
	_, err := r.FindByID(id)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("không tìm thấy đơn hàng với ID: %s", id)
		}
		return err
	}

	query := `DELETE FROM thong_tin_nhan_keo WHERE id = $1`
	_, err = r.db.Exec(query, id)
	if err != nil {
		log.Printf("Repository - ❌ Lỗi xóa đơn hàng: %v", err)
		return err
	}

	log.Printf("Repository - ✅ Đã xóa đơn hàng thành công cho ID: %s", id)
	return nil
}

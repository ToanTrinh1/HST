package repository

import (
	"database/sql"
	"fmt"
	"fullstack-backend/internal/models"
	"fullstack-backend/pkg/dailiantong"
	"log"
	"math"
	"strings"
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

	cols := `stt, id_nguoi_dung, ma_nhiem_vu, loai_keo, tien_keo_web_te, ma_don_hang, ghi_chu, tien_do_hoan_thanh, tai_khoan, mat_khau, khu_vuc, order_serial_no, order_publish, thoi_gian_nhan_keo, thoi_gian_con_lai_gio, thoi_gian_cap_nhat`
	placeholders := `$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14, NOW()`
	args := []interface{}{
		betReceipt.STT, betReceipt.UserID, betReceipt.TaskCode, betReceipt.BetType, betReceipt.WebBetAmountCNY,
		betReceipt.OrderCode, betReceipt.Notes, betReceipt.Status, betReceipt.Account, betReceipt.Password,
		betReceipt.Region, betReceipt.OrderSerialNo, betReceipt.OrderPublish, betReceipt.TimeRemainingHours,
	}
	if betReceipt.AssignedAdminID != nil && *betReceipt.AssignedAdminID != "" {
		cols += `, id_admin_duyet`
		placeholders += `, $15`
		args = append(args, *betReceipt.AssignedAdminID)
	}
	query := fmt.Sprintf(`INSERT INTO thong_tin_nhan_keo (%s) VALUES (%s) RETURNING id, thoi_gian_nhan_keo, thoi_gian_cap_nhat`, cols, placeholders)
	return r.db.QueryRow(query, args...).Scan(&betReceipt.ID, &betReceipt.ReceivedAt, &betReceipt.UpdatedAt)
}

// GetByTab lấy đơn hàng theo tab cho admin: don_hang_moi | cho_chap_nhan | tong_hop | da_xu_ly
// - isSuperAdmin: admin tổng thấy tất cả; admin thường chỉ thấy đơn có id_admin_duyet = adminID (hoặc NULL cho tab chờ chấp nhận)
func (r *BetReceiptRepository) GetByTab(limit, offset int, tab, adminID string, isSuperAdmin bool) ([]*models.BetReceipt, error) {
	query := `
        SELECT 
            ttnk.id, ttnk.stt, ttnk.id_nguoi_dung, nd.ten as user_name,
            ttnk.ma_nhiem_vu, ttnk.loai_keo, ttnk.tien_keo_web_te,
            ttnk.ma_don_hang, ttnk.ghi_chu, ttnk.tien_do_hoan_thanh, 
            ttnk.tien_keo_web_thuc_nhan_te, ttnk.tien_den_te, COALESCE(ttnk.tien_cat_te, 0) as tien_cat_te, ttnk.cong_thuc_nhan_te,
            ttnk.exchange_rate, ttnk.ly_do_huy, ttnk.tai_khoan, ttnk.mat_khau, ttnk.khu_vuc,
            ttnk.id_admin_duyet,
            nd_admin.ten as assigned_admin_name,
            ttnk.order_serial_no, ttnk.order_publish,
            ttnk.thoi_gian_nhan_keo, ttnk.thoi_gian_bat_dau, ttnk.thoi_gian_hoan_thanh,
            ttnk.thoi_gian_con_lai_gio, ttnk.thoi_gian_cap_nhat
        FROM thong_tin_nhan_keo ttnk
        LEFT JOIN nguoi_dung nd ON ttnk.id_nguoi_dung = nd.id
        LEFT JOIN nguoi_dung nd_admin ON ttnk.id_admin_duyet = nd_admin.id
    `
	whereConditions := []string{}
	args := []interface{}{}
	argIndex := 1

	switch tab {
	case "don_hang_moi":
		whereConditions = append(whereConditions, "ttnk.tien_do_hoan_thanh = 'Đơn hàng mới'")
		if !isSuperAdmin {
			whereConditions = append(whereConditions, fmt.Sprintf("ttnk.id_admin_duyet = $%d", argIndex))
			args = append(args, adminID)
			argIndex++
		}
	case "cho_chap_nhan":
		// Tất cả admin (cả admin tổng và admin thường) đều thấy toàn bộ đơn "Chờ chấp nhận" để có thể nhận xử lý
		whereConditions = append(whereConditions, "ttnk.tien_do_hoan_thanh = 'Chờ chấp nhận'")
	case "tong_hop":
		// Chỉ đơn đang xử lý (không hiện DONE, HỦY BỎ, ĐỀN)
		whereConditions = append(whereConditions, "ttnk.tien_do_hoan_thanh NOT IN ('Đơn hàng mới', 'Chờ chấp nhận', 'DONE', 'HỦY BỎ', 'ĐỀN')")
		if !isSuperAdmin {
			whereConditions = append(whereConditions, fmt.Sprintf("ttnk.id_admin_duyet = $%d", argIndex))
			args = append(args, adminID)
			argIndex++
		}
	case "da_xu_ly":
		// Đơn đã xử lý: DONE, HỦY BỎ, ĐỀN (dùng cho tab "Đơn hàng đã xử lí")
		whereConditions = append(whereConditions, "ttnk.tien_do_hoan_thanh IN ('DONE', 'HỦY BỎ', 'ĐỀN')")
		if !isSuperAdmin {
			whereConditions = append(whereConditions, fmt.Sprintf("ttnk.id_admin_duyet = $%d", argIndex))
			args = append(args, adminID)
			argIndex++
		}
	default:
		whereConditions = append(whereConditions, "ttnk.tien_do_hoan_thanh NOT IN ('Đơn hàng mới', 'Chờ chấp nhận', 'DONE', 'HỦY BỎ', 'ĐỀN')")
		if !isSuperAdmin {
			whereConditions = append(whereConditions, fmt.Sprintf("ttnk.id_admin_duyet = $%d", argIndex))
			args = append(args, adminID)
			argIndex++
		}
	}

	if len(whereConditions) > 0 {
		query += " WHERE " + strings.Join(whereConditions, " AND ")
	}
	query += fmt.Sprintf(" ORDER BY ttnk.stt ASC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	return r.queryBetReceipts(query, args)
}

// queryBetReceipts chạy query và scan rows thành []*BetReceipt (dùng chung bởi GetAll và GetByTab)
func (r *BetReceiptRepository) queryBetReceipts(query string, args []interface{}) ([]*models.BetReceipt, error) {
	if err := r.db.Ping(); err != nil {
		log.Printf("Repository - ❌ Database connection error: %v", err)
		return nil, fmt.Errorf("database connection error: %w", err)
	}
	rows, err := r.db.Query(query, args...)
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
		var assignedAdminID sql.NullString
		var assignedAdminName sql.NullString
		var orderSerialNo sql.NullString
		var orderPublish sql.NullInt64
		var startedAt sql.NullTime
		var exchangeRate sql.NullFloat64
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
			&betReceipt.UserCutCNY,
			&betReceipt.ActualAmountCNY,
			&exchangeRate,
			&cancelReason,
			&account,
			&password,
			&region,
			&assignedAdminID,
			&assignedAdminName,
			&orderSerialNo,
			&orderPublish,
			&betReceipt.ReceivedAt,
			&startedAt,
			&completedAt,
			&timeRemainingHours,
			&betReceipt.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		if userName.Valid {
			betReceipt.UserName = userName.String
		} else {
			betReceipt.UserName = "không có trong db"
		}
		if exchangeRate.Valid {
			betReceipt.ExchangeRate = exchangeRate.Float64
		} else {
			betReceipt.ExchangeRate = 3550.0
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
		if assignedAdminID.Valid {
			betReceipt.AssignedAdminID = &assignedAdminID.String
		}
		if assignedAdminName.Valid {
			betReceipt.AssignedAdminName = assignedAdminName.String
		}
		if startedAt.Valid {
			betReceipt.StartedAt = &startedAt.Time
		} else {
			betReceipt.StartedAt = nil
		}
		if orderSerialNo.Valid {
			betReceipt.OrderSerialNo = orderSerialNo.String
		} else {
			betReceipt.OrderSerialNo = ""
		}
		if orderPublish.Valid {
			publish := int(orderPublish.Int64)
			betReceipt.OrderPublish = &publish
		} else {
			betReceipt.OrderPublish = nil
		}
		if betReceipt.OrderLink == "" {
			publish := 0
			if betReceipt.OrderPublish != nil {
				publish = *betReceipt.OrderPublish
			}
			betReceipt.OrderLink = dailiantong.BuildOrderLink(betReceipt.OrderSerialNo, publish)
		}
		if completedAt.Valid {
			betReceipt.CompletedAt = &completedAt.Time
			baseTime := betReceipt.ReceivedAt
			if betReceipt.StartedAt != nil {
				baseTime = *betReceipt.StartedAt
			}
			elapsed := completedAt.Time.Sub(baseTime)
			completedHours := int(math.Round(elapsed.Hours()))
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
			var elapsedHours, elapsedMinutes int
			if betReceipt.StartedAt != nil {
				now := time.Now()
				elapsed := now.Sub(*betReceipt.StartedAt)
				elapsedHours = int(elapsed.Hours())
				elapsedMinutes = int(elapsed.Minutes())
			}
			remainingHours := hours - elapsedHours
			if remainingHours < 0 {
				remainingHours = 0
			}
			remainingMinutes := (hours * 60) - elapsedMinutes
			if remainingMinutes < 0 {
				remainingMinutes = 0
			}
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

// GetAll lấy tất cả đơn hàng (thông tin nhận kèo) có phân trang, join với bảng nguoi_dung để lấy tên
// - userID != nil: chỉ lấy đơn hàng của user đó (dùng cho user thường)
// - pendingForAdmin, assignedToAdminID: giữ để tương thích; admin dùng GetByTab
func (r *BetReceiptRepository) GetAll(limit, offset int, userID *string, pendingForAdmin bool, assignedToAdminID *string) ([]*models.BetReceipt, error) {
	query := `
        SELECT 
            ttnk.id, ttnk.stt, ttnk.id_nguoi_dung, nd.ten as user_name,
            ttnk.ma_nhiem_vu, ttnk.loai_keo, ttnk.tien_keo_web_te,
            ttnk.ma_don_hang, ttnk.ghi_chu, ttnk.tien_do_hoan_thanh, 
            ttnk.tien_keo_web_thuc_nhan_te, ttnk.tien_den_te, COALESCE(ttnk.tien_cat_te, 0) as tien_cat_te, ttnk.cong_thuc_nhan_te,
            ttnk.exchange_rate, ttnk.ly_do_huy, ttnk.tai_khoan, ttnk.mat_khau, ttnk.khu_vuc,
            ttnk.id_admin_duyet,
            nd_admin.ten as assigned_admin_name,
            ttnk.order_serial_no, ttnk.order_publish,
            ttnk.thoi_gian_nhan_keo, ttnk.thoi_gian_bat_dau, ttnk.thoi_gian_hoan_thanh,
            ttnk.thoi_gian_con_lai_gio, ttnk.thoi_gian_cap_nhat
        FROM thong_tin_nhan_keo ttnk
        LEFT JOIN nguoi_dung nd ON ttnk.id_nguoi_dung = nd.id
        LEFT JOIN nguoi_dung nd_admin ON ttnk.id_admin_duyet = nd_admin.id
    `

	// Thêm WHERE clause
	args := []interface{}{}
	argIndex := 1
	whereConditions := []string{}

	if userID != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("ttnk.id_nguoi_dung = $%d", argIndex))
		args = append(args, *userID)
		argIndex++
		log.Printf("Repository - 🔍 Filtering by user_id: %s", *userID)
	}
	if pendingForAdmin {
		whereConditions = append(whereConditions, "ttnk.tien_do_hoan_thanh = 'Chờ chấp nhận' AND ttnk.id_admin_duyet IS NULL")
		log.Printf("Repository - 🔍 Filtering: chờ chấp nhận (chưa admin nhận)")
	}
	if assignedToAdminID != nil && *assignedToAdminID != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("ttnk.id_admin_duyet = $%d", argIndex))
		args = append(args, *assignedToAdminID)
		argIndex++
		log.Printf("Repository - 🔍 Filtering by assigned_admin_id: %s", *assignedToAdminID)
	}

	if len(whereConditions) > 0 {
		query += " WHERE " + strings.Join(whereConditions, " AND ")
	}

	query += fmt.Sprintf(" ORDER BY ttnk.stt ASC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	log.Printf("Repository - 🔍 Executing query với limit=%d, offset=%d", limit, offset)
	return r.queryBetReceipts(query, args)
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
            tien_den_te, COALESCE(tien_cat_te, 0) as tien_cat_te, cong_thuc_nhan_te, exchange_rate,
            ly_do_huy, tai_khoan, mat_khau, khu_vuc,
            id_admin_duyet,
            order_serial_no, order_publish,
            thoi_gian_nhan_keo, thoi_gian_bat_dau, thoi_gian_hoan_thanh,
            thoi_gian_con_lai_gio, thoi_gian_cap_nhat
        FROM thong_tin_nhan_keo 
        WHERE id = $1
    `
	var cancelReason sql.NullString
	var account sql.NullString
	var password sql.NullString
	var region sql.NullString
	var assignedAdminID sql.NullString
	var orderSerialNo sql.NullString
	var orderPublish sql.NullInt64
	var startedAt sql.NullTime
	var exchangeRate sql.NullFloat64
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
		&betReceipt.UserCutCNY,
		&betReceipt.ActualAmountCNY,
		&exchangeRate,
		&cancelReason,
		&account,
		&password,
		&region,
		&assignedAdminID,
		&orderSerialNo,
		&orderPublish,
		&betReceipt.ReceivedAt,
		&startedAt,
		&completedAt,
		&timeRemainingHours,
		&betReceipt.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if exchangeRate.Valid {
		betReceipt.ExchangeRate = exchangeRate.Float64
	} else {
		betReceipt.ExchangeRate = 3550.0
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

	if assignedAdminID.Valid {
		betReceipt.AssignedAdminID = &assignedAdminID.String
	}

	if orderSerialNo.Valid {
		betReceipt.OrderSerialNo = orderSerialNo.String
	} else {
		betReceipt.OrderSerialNo = ""
	}

	if orderPublish.Valid {
		publish := int(orderPublish.Int64)
		betReceipt.OrderPublish = &publish
	} else {
		betReceipt.OrderPublish = nil
	}

	if betReceipt.OrderLink == "" {
		publish := 0
		if betReceipt.OrderPublish != nil {
			publish = *betReceipt.OrderPublish
		}
		betReceipt.OrderLink = dailiantong.BuildOrderLink(betReceipt.OrderSerialNo, publish)
	}

	if startedAt.Valid {
		betReceipt.StartedAt = &startedAt.Time
	}
	if completedAt.Valid {
		betReceipt.CompletedAt = &completedAt.Time
		// Tính thời gian hoàn thành thực tế (số giờ) = CompletedAt - StartedAt (nếu có)
		baseTime := betReceipt.ReceivedAt
		if betReceipt.StartedAt != nil {
			baseTime = *betReceipt.StartedAt
		}
		elapsed := completedAt.Time.Sub(baseTime)
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
// - Nếu status là "HỦY BỎ", "DONE", "ĐỀN", "CHỜ DUYỆT", hoặc "CHỜ TRỌNG TÀI": dùng CompletedAt từ betReceipt (có thể là NULL hoặc có giá trị)
// - Nếu status không phải các status trên: set về NULL
func (r *BetReceiptRepository) UpdateStatus(betReceipt *models.BetReceipt) error {
	// Xử lý thoi_gian_hoan_thanh dựa trên status
	var completedAt interface{}
	if betReceipt.Status == "HỦY BỎ" || betReceipt.Status == "DONE" || betReceipt.Status == "ĐỀN" ||
		betReceipt.Status == "Chờ chấp nhận" || betReceipt.Status == "CHỜ TRỌNG TÀI" {
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
			tien_cat_te = $5,
			tien_keo_web_te = $6,
			thoi_gian_hoan_thanh = $7,
			thoi_gian_con_lai_gio = $8,
			ly_do_huy = $9,
			thoi_gian_bat_dau = COALESCE($10, thoi_gian_bat_dau),
			id_admin_duyet = COALESCE($11, id_admin_duyet),
			thoi_gian_cap_nhat = NOW()
		WHERE id = $12
	`

	var cancelReason interface{}
	if betReceipt.CancelReason != "" {
		cancelReason = betReceipt.CancelReason
	} else {
		cancelReason = nil
	}

	var assignedAdminID interface{}
	if betReceipt.AssignedAdminID != nil {
		assignedAdminID = *betReceipt.AssignedAdminID
	}

	_, err := r.db.Exec(
		query,
		betReceipt.Status,
		betReceipt.ActualAmountCNY,   // cong_thuc_nhan_te
		betReceipt.ActualReceivedCNY, // tien_keo_web_thuc_nhan_te
		betReceipt.CompensationCNY,   // tien_den_te
		betReceipt.UserCutCNY,        // tien_cat_te
		betReceipt.WebBetAmountCNY,   // tien_keo_web_te (có thể được cập nhật khi status = HỦY BỎ)
		completedAt,                  // thoi_gian_hoan_thanh
		timeRemainingHours,           // thoi_gian_con_lai_gio
		cancelReason,                 // ly_do_huy
		betReceipt.StartedAt,         // thoi_gian_bat_dau
		assignedAdminID,              // id_admin_duyet
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
	if req.OrderSerialNo != nil {
		betReceipt.OrderSerialNo = *req.OrderSerialNo
	}
	if req.OrderPublish != nil {
		betReceipt.OrderPublish = req.OrderPublish
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
			order_serial_no = $11,
			order_publish = $12,
			thoi_gian_cap_nhat = NOW()
		WHERE id = $13
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
		betReceipt.OrderSerialNo,
		betReceipt.OrderPublish,
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

// TopUserMonthlyResult - Kết quả top user theo tháng
type TopUserMonthlyResult struct {
	UserID    string
	UserName  string
	AmountCNY float64
	AvatarURL *string
}

// GetTop5UsersByMonthlyReceivedAmount lấy top 5 users theo số tiền đã nhận trong tháng
// month: format "YYYY-MM" (ví dụ: "2026-01")
func (r *BetReceiptRepository) GetTop5UsersByMonthlyReceivedAmount(month string) ([]*TopUserMonthlyResult, error) {
	query := `
		SELECT 
			ttnk.id_nguoi_dung,
			COALESCE(MAX(nd.ten), 'N/A') as user_name,
			COALESCE(SUM(ttnk.cong_thuc_nhan_te), 0) as total_amount_cny,
			MAX(nd.avatar_url) as avatar_url
		FROM thong_tin_nhan_keo ttnk
		LEFT JOIN nguoi_dung nd ON ttnk.id_nguoi_dung = nd.id
		WHERE 
			ttnk.tien_do_hoan_thanh IN ('DONE', 'HỦY BỎ', 'ĐỀN')
			AND ttnk.thoi_gian_hoan_thanh IS NOT NULL
			AND TO_CHAR(ttnk.thoi_gian_hoan_thanh, 'YYYY-MM') = $1
		GROUP BY ttnk.id_nguoi_dung
		ORDER BY total_amount_cny DESC
		LIMIT 5
	`

	rows, err := r.db.Query(query, month)
	if err != nil {
		log.Printf("Repository - ❌ Lỗi khi lấy top 5 users: %v", err)
		return nil, err
	}
	defer rows.Close()

	results := []*TopUserMonthlyResult{}
	for rows.Next() {
		result := &TopUserMonthlyResult{}
		var avatarURL sql.NullString
		err := rows.Scan(
			&result.UserID,
			&result.UserName,
			&result.AmountCNY,
			&avatarURL,
		)
		if err != nil {
			log.Printf("Repository - ❌ Lỗi scan top user: %v", err)
			continue
		}
		if avatarURL.Valid {
			result.AvatarURL = &avatarURL.String
		}
		results = append(results, result)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Repository - ❌ Lỗi khi iterate top users: %v", err)
		return nil, err
	}

	log.Printf("Repository - ✅ Đã lấy %d top users cho tháng %s", len(results), month)
	return results, nil
}

// GetMonthlyTotalByUserID tính tổng số tiền đã nhận (actual_amount_cny) theo tháng cho user cụ thể
// month: format "YYYY-MM" (ví dụ: "2026-01"), nếu rỗng thì tính tất cả
// userID: ID của user cần tính
func (r *BetReceiptRepository) GetMonthlyTotalByUserID(userID string, month string) (float64, error) {
	var query string
	var args []interface{}

	if month != "" {
		// Tính theo tháng cụ thể
		query = `
			SELECT COALESCE(SUM(cong_thuc_nhan_te), 0) as total_amount_cny
			FROM thong_tin_nhan_keo
			WHERE id_nguoi_dung = $1
				AND tien_do_hoan_thanh IN ('DONE', 'HỦY BỎ', 'ĐỀN')
				AND thoi_gian_hoan_thanh IS NOT NULL
				AND TO_CHAR(thoi_gian_hoan_thanh, 'YYYY-MM') = $2
		`
		args = []interface{}{userID, month}
	} else {
		// Tính tất cả (không filter theo tháng)
		query = `
			SELECT COALESCE(SUM(cong_thuc_nhan_te), 0) as total_amount_cny
			FROM thong_tin_nhan_keo
			WHERE id_nguoi_dung = $1
				AND tien_do_hoan_thanh IN ('DONE', 'HỦY BỎ', 'ĐỀN')
				AND thoi_gian_hoan_thanh IS NOT NULL
		`
		args = []interface{}{userID}
	}

	var totalAmountCNY float64
	err := r.db.QueryRow(query, args...).Scan(&totalAmountCNY)
	if err != nil {
		log.Printf("Repository - ❌ Lỗi khi tính tổng theo tháng cho user %s, tháng %s: %v", userID, month, err)
		return 0, err
	}

	log.Printf("Repository - ✅ Đã tính tổng cho user %s, tháng %s: %.2f ¥", userID, month, totalAmountCNY)
	return totalAmountCNY, nil
}

// AdminProfitByMonthRow - Một dòng lợi nhuận admin theo tháng (tổng tất cả admin)
type AdminProfitByMonthRow struct {
	Month     string // "YYYY-MM"
	ProfitCNY float64
	ProfitVND float64
}

// AdminProfitStatsByAdminRow - Thống kê & lợi nhuận theo từng admin (1 hàng = 1 admin)
type AdminProfitStatsByAdminRow struct {
	AdminID               string
	AdminName             string
	VaiTro                string // "admin" | "admin_tong"
	SoDonWeb              int64
	TongTienKeoWeb        float64
	TienLoiNhuanKeoWeb    float64
	SoDonNgoai            int64
	TongTienKeoNgoai      float64
	TienLoiNhuanKeoNgoai  float64
	TongLoiNhuanTienKeo   float64
	TongLoiNhuanTienCat   float64
	TongLoiNhuanChenhLech float64
	SoDonHuy              int64
	SoKeoDen              int64
	TongTienDenTe         float64 // Tổng tiền đền (¥) - bảng thống kê toàn tệ
	TienLoiNhuanTienCatTe float64 // Lợi nhuận tiền cắt (¥) - bảng thống kê toàn tệ
	TienThamHutDen        float64
	TongLoiNhuan          float64
}

// UpsertProfitSnapshot tính lợi nhuận theo config hiện tại (tham số) và ghi vào admin_profit_snapshot (đơn DONE/HỦY BỎ/ĐỀN).
func (r *BetReceiptRepository) UpsertProfitSnapshot(betReceipt *models.BetReceipt, exchangeRate, adminReceiveRate, feeWebPct, feeExternalPct, phiWebLookup float64) error {
	if betReceipt.CompletedAt == nil {
		return fmt.Errorf("CompletedAt required for profit snapshot")
	}
	adminRate := adminReceiveRate
	exRate := exchangeRate
	if adminRate <= 0 {
		adminRate = 3850
	}
	if exRate <= 0 {
		exRate = 3550
	}
	if feeWebPct <= 0 {
		feeWebPct = 8
	}
	if feeExternalPct <= 0 {
		feeExternalPct = 7
	}
	feeWeb := feeWebPct / 100.0
	feeExternal := feeExternalPct / 100.0

	amountForKeo := betReceipt.WebBetAmountCNY
	if betReceipt.Status != "DONE" {
		amountForKeo = betReceipt.ActualReceivedCNY
	}
	isWeb := betReceipt.BetType == "web"
	fee := feeWeb
	if !isWeb {
		fee = feeExternal
	}

	var profitKeoCNY, profitKeoVND, profitTienCatVND, profitChenhLechVND, profitDenThamHutVND float64
	switch betReceipt.Status {
	case "DONE", "HỦY BỎ":
		if isWeb {
			profitKeoCNY = betReceipt.WebBetAmountCNY - phiWebLookup - 0.03*(betReceipt.WebBetAmountCNY-phiWebLookup) - betReceipt.ActualAmountCNY
		} else {
			profitKeoCNY = fee * amountForKeo
		}
		profitKeoVND = profitKeoCNY * adminRate
		profitChenhLechVND = (adminRate - exRate) * betReceipt.ActualAmountCNY
	}
	if betReceipt.Status == "HỦY BỎ" || betReceipt.Status == "ĐỀN" {
		profitTienCatVND = betReceipt.UserCutCNY * adminRate
	}
	if betReceipt.Status == "ĐỀN" {
		profitDenThamHutVND = (adminRate - exRate) * math.Abs(betReceipt.ActualAmountCNY)
	}

	totalProfitVND := profitKeoVND + profitTienCatVND + profitChenhLechVND - profitDenThamHutVND
	month := betReceipt.CompletedAt.Format("2006-01")
	var adminID interface{}
	if betReceipt.AssignedAdminID != nil {
		adminID = *betReceipt.AssignedAdminID
	}

	query := `
		INSERT INTO admin_profit_snapshot (
			bet_receipt_id, admin_id, completed_at, month, status, loai_keo,
			tien_keo_te, tien_thuc_nhan_te, cong_thuc_nhan_te, tien_cat_te,
			profit_keo_cny, profit_keo_vnd, profit_tien_cat_vnd, profit_chenh_lech_vnd, profit_den_tham_hut_vnd, total_profit_vnd
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		ON CONFLICT (bet_receipt_id) DO UPDATE SET
			admin_id = EXCLUDED.admin_id,
			completed_at = EXCLUDED.completed_at,
			month = EXCLUDED.month,
			status = EXCLUDED.status,
			loai_keo = EXCLUDED.loai_keo,
			tien_keo_te = EXCLUDED.tien_keo_te,
			tien_thuc_nhan_te = EXCLUDED.tien_thuc_nhan_te,
			cong_thuc_nhan_te = EXCLUDED.cong_thuc_nhan_te,
			tien_cat_te = EXCLUDED.tien_cat_te,
			profit_keo_cny = EXCLUDED.profit_keo_cny,
			profit_keo_vnd = EXCLUDED.profit_keo_vnd,
			profit_tien_cat_vnd = EXCLUDED.profit_tien_cat_vnd,
			profit_chenh_lech_vnd = EXCLUDED.profit_chenh_lech_vnd,
			profit_den_tham_hut_vnd = EXCLUDED.profit_den_tham_hut_vnd,
			total_profit_vnd = EXCLUDED.total_profit_vnd
	`
	_, err := r.db.Exec(query,
		betReceipt.ID,
		adminID,
		*betReceipt.CompletedAt,
		month,
		betReceipt.Status,
		betReceipt.BetType,
		betReceipt.WebBetAmountCNY,
		betReceipt.ActualReceivedCNY,
		betReceipt.ActualAmountCNY,
		betReceipt.UserCutCNY,
		profitKeoCNY,
		profitKeoVND,
		profitTienCatVND,
		profitChenhLechVND,
		profitDenThamHutVND,
		totalProfitVND,
	)
	if err != nil {
		log.Printf("Repository - ❌ UpsertProfitSnapshot: %v", err)
		return err
	}
	log.Printf("Repository - ✅ UpsertProfitSnapshot bet_receipt_id=%s", betReceipt.ID)
	return nil
}

// DeleteProfitSnapshotByBetReceiptID xóa bản ghi lợi nhuận khi đơn bị đổi trạng thái khỏi DONE/HỦY BỎ/ĐỀN.
func (r *BetReceiptRepository) DeleteProfitSnapshotByBetReceiptID(betReceiptID string) error {
	_, err := r.db.Exec(`DELETE FROM admin_profit_snapshot WHERE bet_receipt_id = $1`, betReceiptID)
	if err != nil {
		log.Printf("Repository - ❌ DeleteProfitSnapshotByBetReceiptID: %v", err)
		return err
	}
	log.Printf("Repository - ✅ DeleteProfitSnapshotByBetReceiptID bet_receipt_id=%s", betReceiptID)
	return nil
}

// GetAdminProfitStatsByAdminFromSnapshot đọc thống kê lợi nhuận theo admin từ bảng admin_profit_snapshot (nhanh).
func (r *BetReceiptRepository) GetAdminProfitStatsByAdminFromSnapshot(month string) ([]*AdminProfitStatsByAdminRow, error) {
	query := `
		SELECT 
			COALESCE(aps.admin_id::text, '') as admin_id,
			COALESCE(MAX(nd.ten), 'Chưa gán') as admin_name,
			COALESCE(MAX(nd.vai_tro), 'admin') as vai_tro,
			COUNT(*) FILTER (WHERE aps.loai_keo = 'web' AND aps.status = 'DONE') as so_don_web,
			COALESCE(SUM(aps.tien_keo_te) FILTER (WHERE aps.loai_keo = 'web' AND aps.status = 'DONE'), 0) as tong_tien_keo_web,
			COALESCE(SUM(aps.profit_keo_vnd + aps.profit_chenh_lech_vnd) FILTER (WHERE aps.loai_keo = 'web' AND aps.status IN ('DONE', 'HỦY BỎ')), 0) as tien_loi_nhuan_keo_web,
			COUNT(*) FILTER (WHERE aps.loai_keo = 'Kèo ngoài' AND aps.status = 'DONE') as so_don_ngoai,
			COALESCE(SUM(aps.tien_keo_te) FILTER (WHERE aps.loai_keo = 'Kèo ngoài' AND aps.status = 'DONE'), 0) as tong_tien_keo_ngoai,
			COALESCE(SUM(aps.profit_keo_vnd) FILTER (WHERE aps.status IN ('DONE', 'HỦY BỎ')), 0) as tong_loi_nhuan_tien_keo,
			COALESCE(SUM(aps.profit_tien_cat_vnd), 0) as tien_loi_nhuan_tien_cat,
			COALESCE(SUM(aps.profit_chenh_lech_vnd), 0) as tong_loi_nhuan_chenh_lech,
			COUNT(*) FILTER (WHERE aps.status = 'HỦY BỎ') as so_don_huy,
			COUNT(*) FILTER (WHERE aps.status = 'ĐỀN') as so_keo_den,
			COALESCE(SUM(ABS(aps.cong_thuc_nhan_te)) FILTER (WHERE aps.status = 'ĐỀN'), 0) as tong_tien_den_te,
			COALESCE(SUM(aps.tien_cat_te) FILTER (WHERE aps.status IN ('HỦY BỎ', 'ĐỀN')), 0) as tien_loi_nhuan_tien_cat_te,
			COALESCE(SUM(aps.profit_den_tham_hut_vnd), 0) as tien_tham_hut_den,
			COALESCE(SUM(aps.total_profit_vnd), 0) as tong_loi_nhuan
		FROM admin_profit_snapshot aps
		LEFT JOIN nguoi_dung nd ON nd.id = aps.admin_id
		WHERE ($1 = '' OR aps.month = $1)
		GROUP BY aps.admin_id
		ORDER BY admin_name
	`
	rows, err := r.db.Query(query, month)
	if err != nil {
		log.Printf("Repository - ❌ GetAdminProfitStatsByAdminFromSnapshot: %v", err)
		return nil, err
	}
	defer rows.Close()
	var results []*AdminProfitStatsByAdminRow
	for rows.Next() {
		row := &AdminProfitStatsByAdminRow{}
		if err := rows.Scan(
			&row.AdminID,
			&row.AdminName,
			&row.VaiTro,
			&row.SoDonWeb,
			&row.TongTienKeoWeb,
			&row.TienLoiNhuanKeoWeb,
			&row.SoDonNgoai,
			&row.TongTienKeoNgoai,
			&row.TongLoiNhuanTienKeo,
			&row.TongLoiNhuanTienCat,
			&row.TongLoiNhuanChenhLech,
			&row.SoDonHuy,
			&row.SoKeoDen,
			&row.TongTienDenTe,
			&row.TienLoiNhuanTienCatTe,
			&row.TienThamHutDen,
			&row.TongLoiNhuan,
		); err != nil {
			log.Printf("Repository - ❌ Scan GetAdminProfitStatsByAdminFromSnapshot: %v", err)
			continue
		}
		results = append(results, row)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	log.Printf("Repository - ✅ Đã lấy %d admin thống kê lợi nhuận (từ snapshot)", len(results))
	return results, nil
}

// GetAdminProfitByMonthFromSnapshot đọc lợi nhuận theo tháng từ admin_profit_snapshot (nhanh).
func (r *BetReceiptRepository) GetAdminProfitByMonthFromSnapshot() ([]*AdminProfitByMonthRow, error) {
	query := `
		SELECT 
			aps.month as month,
			COALESCE(SUM(aps.profit_keo_cny) FILTER (WHERE aps.status IN ('DONE', 'HỦY BỎ')), 0) + COALESCE(SUM(aps.tien_cat_te) FILTER (WHERE aps.status IN ('HỦY BỎ', 'ĐỀN')), 0) as profit_cny,
			COALESCE(SUM(aps.total_profit_vnd), 0) as profit_vnd
		FROM admin_profit_snapshot aps
		GROUP BY aps.month
		ORDER BY aps.month DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		log.Printf("Repository - ❌ GetAdminProfitByMonthFromSnapshot: %v", err)
		return nil, err
	}
	defer rows.Close()
	var results []*AdminProfitByMonthRow
	for rows.Next() {
		row := &AdminProfitByMonthRow{}
		if err := rows.Scan(&row.Month, &row.ProfitCNY, &row.ProfitVND); err != nil {
			log.Printf("Repository - ❌ Scan GetAdminProfitByMonthFromSnapshot: %v", err)
			continue
		}
		results = append(results, row)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	log.Printf("Repository - ✅ Đã lấy %d tháng lợi nhuận (từ snapshot)", len(results))
	return results, nil
}

// GetUserFeeConfig lấy config tính tiền cho user: phí rút tiền %, phí trung gian %, bảng phí web (JSON).
func (r *BetReceiptRepository) GetUserFeeConfig() (feeRutTienPctWeb, feeRutTienPctNgoai, feeTrungGianPct float64, feeWebTiersJSON []byte, err error) {
	query := `
		SELECT COALESCE(fee_rut_tien_pct_web, 2), COALESCE(fee_rut_tien_pct_ngoai, 1), COALESCE(fee_trung_gian_pct, 6),
		       COALESCE(fee_web_tiers::text, '[]')
		FROM current_exchange_rate
		WHERE id = 1
	`
	err = r.db.QueryRow(query).Scan(&feeRutTienPctWeb, &feeRutTienPctNgoai, &feeTrungGianPct, &feeWebTiersJSON)
	if err != nil {
		return 0, 0, 0, nil, err
	}
	return feeRutTienPctWeb, feeRutTienPctNgoai, feeTrungGianPct, feeWebTiersJSON, nil
}

// UpdateUserFeeConfig cập nhật config tính tiền user: phí rút tiền %, phí trung gian %, bảng phí web (JSONB).
func (r *BetReceiptRepository) UpdateUserFeeConfig(feeRutTienPctWeb, feeRutTienPctNgoai, feeTrungGianPct float64, feeWebTiersJSON []byte) error {
	query := `
		UPDATE current_exchange_rate
		SET fee_rut_tien_pct_web = $1, fee_rut_tien_pct_ngoai = $2, fee_trung_gian_pct = $3, fee_web_tiers = $4::jsonb, updated_at = NOW()
		WHERE id = 1
	`
	_, err := r.db.Exec(query, feeRutTienPctWeb, feeRutTienPctNgoai, feeTrungGianPct, feeWebTiersJSON)
	return err
}

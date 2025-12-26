package service

import (
	"encoding/json"
	"errors"
	"fullstack-backend/internal/models"
	"fullstack-backend/internal/repository"
	"log"
	"time"
)

type BetReceiptService struct {
	betReceiptRepo *repository.BetReceiptRepository
	userRepo       *repository.UserRepository
	walletRepo     *repository.WalletRepository
	historyRepo    *repository.BetReceiptHistoryRepository
}

func NewBetReceiptService(betReceiptRepo *repository.BetReceiptRepository, userRepo *repository.UserRepository, walletRepo *repository.WalletRepository, historyRepo *repository.BetReceiptHistoryRepository) *BetReceiptService {
	return &BetReceiptService{
		betReceiptRepo: betReceiptRepo,
		userRepo:       userRepo,
		walletRepo:     walletRepo,
		historyRepo:    historyRepo,
	}
}

// CreateBetReceipt tạo đơn hàng (thông tin nhận kèo) mới
func (s *BetReceiptService) CreateBetReceipt(req *models.CreateBetReceiptRequest) (*models.BetReceipt, error) {
	log.Printf("Service - Tạo đơn hàng cho user_name: %s", req.UserName)

	// 1. Tìm người dùng theo tên (tìm chính xác tên)
	users, err := s.userRepo.FindByName(req.UserName)
	if err != nil {
		log.Printf("Service - ❌ Lỗi khi tìm người dùng: %v", err)
		return nil, errors.New("Lỗi khi tìm kiếm người dùng")
	}

	// Lọc để tìm user có tên chính xác (phải khớp hoàn toàn, phân biệt hoa thường)
	var foundUser *models.User
	for _, u := range users {
		// So sánh chính xác (case-sensitive) - tên nhập vào phải khớp hoàn toàn với tên trong DB
		if u.Name == req.UserName {
			foundUser = u
			break
		}
	}

	if foundUser == nil {
		log.Printf("Service - ❌ Không tìm thấy người dùng với tên: %s", req.UserName)
		return nil, errors.New("Tên người dùng '" + req.UserName + "' không có trong hệ thống")
	}

	log.Printf("Service - ✅ Tìm thấy người dùng: %s (%s), ID: %s", foundUser.Name, foundUser.Email, foundUser.ID)

	// 2. Kiểm tra loại kèo hợp lệ
	if req.BetType != models.BetTypeWeb && req.BetType != models.BetTypeExternal {
		return nil, errors.New("Loại kèo không hợp lệ. Phải là 'web' hoặc 'Kèo ngoài'")
	}

	// 3. Đặt trạng thái mặc định là "Đơn hàng mới"
	status := models.BetReceiptStatusNew

	// 4. Tính thời gian còn lại: Thời gian hoàn thành (completed_hours) = Thời gian còn lại ban đầu
	// Thời gian còn lại sẽ bằng thời gian hoàn thành vì lúc tạo đơn, thời gian nhận kèo = NOW()
	// Vậy thời gian còn lại ban đầu = completed_hours
	var timeRemainingHours *int
	if req.CompletedHours != nil {
		timeRemainingHours = req.CompletedHours
	}

	// 5. Tạo đơn hàng (thông tin nhận kèo)
	betReceipt := &models.BetReceipt{
		UserID:             foundUser.ID,
		TaskCode:           req.TaskCode,
		BetType:            req.BetType,
		WebBetAmountCNY:    req.WebBetAmountCNY,
		OrderCode:          req.OrderCode,
		Notes:              req.Notes,
		Account:            req.Account,
		Password:           req.Password,
		Region:             req.Region,
		Status:             status,
		CompletedHours:     req.CompletedHours, // Lưu thời gian hoàn thành ban đầu
		TimeRemainingHours: timeRemainingHours,
		ActualReceivedCNY:  0,
		CompensationCNY:    0,
		ActualAmountCNY:    0,
	}

	if err := s.betReceiptRepo.Create(betReceipt); err != nil {
		log.Printf("Service - ❌ Lỗi tạo đơn hàng: %v", err)
		return nil, errors.New("Lỗi khi tạo đơn hàng: " + err.Error())
	}

	// Set UserName để trả về trong response (không cần query lại từ DB)
	betReceipt.UserName = foundUser.Name

	log.Printf("Service - ✅ Đơn hàng đã được tạo với ID: %s, STT: %d, UserName: %s", betReceipt.ID, betReceipt.STT, betReceipt.UserName)

	return betReceipt, nil
}

// GetAllBetReceipts lấy tất cả đơn hàng (thông tin nhận kèo)
// Nếu userID != nil, chỉ lấy đơn hàng của user đó
func (s *BetReceiptService) GetAllBetReceipts(limit, offset int, userID *string) ([]*models.BetReceipt, error) {
	return s.betReceiptRepo.GetAll(limit, offset, userID)
}

// GetBetReceiptByID lấy đơn hàng (thông tin nhận kèo) theo ID
func (s *BetReceiptService) GetBetReceiptByID(id string) (*models.BetReceipt, error) {
	return s.betReceiptRepo.FindByID(id)
}

// UpdateBetReceipt cập nhật các trường thông thường của đơn hàng (không phải status)
func (s *BetReceiptService) UpdateBetReceipt(id string, req *models.UpdateBetReceiptRequest, performedBy *string) (*models.BetReceipt, error) {
	log.Printf("Service - Cập nhật đơn hàng ID: %s", id)

	// Kiểm tra đơn hàng có tồn tại không và lấy dữ liệu cũ
	oldBetReceipt, err := s.betReceiptRepo.FindByID(id)
	if err != nil {
		log.Printf("Service - ❌ Không tìm thấy đơn hàng với ID: %s", id)
		return nil, errors.New("Không tìm thấy đơn hàng")
	}

	// Validation
	if req.BetType != nil && *req.BetType != models.BetTypeWeb && *req.BetType != models.BetTypeExternal {
		return nil, errors.New("Loại kèo không hợp lệ. Phải là 'web' hoặc 'Kèo ngoài'")
	}

	// Cập nhật trong database
	if err := s.betReceiptRepo.Update(id, req); err != nil {
		log.Printf("Service - ❌ Lỗi cập nhật đơn hàng: %v", err)
		return nil, errors.New("Lỗi khi cập nhật đơn hàng: " + err.Error())
	}

	// Lấy lại thông tin đơn hàng đã cập nhật
	betReceipt, err := s.betReceiptRepo.FindByID(id)
	if err != nil {
		log.Printf("Service - ❌ Lỗi lấy thông tin đơn hàng sau khi cập nhật: %v", err)
		return nil, errors.New("Lỗi khi lấy thông tin đơn hàng")
	}

	// Lấy tên người dùng
	if req.UserName != nil {
		users, err := s.userRepo.FindByName(*req.UserName)
		if err == nil {
			for _, u := range users {
				if u.Name == *req.UserName {
					betReceipt.UserName = u.Name
					break
				}
			}
		}
	} else {
		// Nếu không cập nhật user_name, lấy từ database
		user, err := s.userRepo.FindByID(betReceipt.UserID)
		if err == nil && user != nil {
			betReceipt.UserName = user.Name
		}
	}

	// Ghi log lịch sử (UPDATE)
	if s.historyRepo != nil {
		go func() {
			oldData, _ := betReceiptToMap(oldBetReceipt)
			newData, _ := betReceiptToMap(betReceipt)
			changedFields := repository.FindChangedFields(oldData, newData)

			historyReq := &models.CreateHistoryRequest{
				BetReceiptID:  id,
				Action:        models.HistoryActionUpdate,
				PerformedBy:   performedBy,
				OldData:       oldData,
				NewData:       newData,
				ChangedFields: changedFields,
				Description:   "Cập nhật thông tin đơn hàng",
			}

			if err := s.createHistory(historyReq); err != nil {
				log.Printf("Service - ⚠️ Không thể ghi lịch sử: %v", err)
			}
		}()
	}

	log.Printf("Service - ✅ Đã cập nhật đơn hàng thành công cho ID: %s", id)
	return betReceipt, nil
}

// DeleteBetReceipt xóa đơn hàng
func (s *BetReceiptService) DeleteBetReceipt(id string, performedBy *string) error {
	log.Printf("Service - Xóa đơn hàng ID: %s", id)

	// Kiểm tra đơn hàng có tồn tại không
	betReceipt, err := s.betReceiptRepo.FindByID(id)
	if err != nil {
		log.Printf("Service - ❌ Không tìm thấy đơn hàng với ID: %s", id)
		return errors.New("Không tìm thấy đơn hàng")
	}

	// Nếu đơn hàng có status = DONE, HỦY BỎ, hoặc ĐỀN, cần tính lại wallet
	const exchangeRate = 3550.0
	oldStatus := betReceipt.Status
	userID := betReceipt.UserID

	// Lưu dữ liệu cũ để ghi log
	oldData, _ := betReceiptToMap(betReceipt)

	// Xóa đơn hàng
	if err := s.betReceiptRepo.Delete(id); err != nil {
		log.Printf("Service - ❌ Lỗi xóa đơn hàng: %v", err)
		return errors.New("Lỗi khi xóa đơn hàng: " + err.Error())
	}

	// Ghi log lịch sử (DELETE)
	if s.historyRepo != nil {
		go func() {
			historyReq := &models.CreateHistoryRequest{
				BetReceiptID: id,
				Action:       models.HistoryActionDelete,
				PerformedBy:  performedBy,
				OldData:      oldData,
				Description:  "Xóa đơn hàng",
			}

			if err := s.createHistory(historyReq); err != nil {
				log.Printf("Service - ⚠️ Không thể ghi lịch sử: %v", err)
			}
		}()
	}

	// Nếu đơn hàng đã có ảnh hưởng đến wallet (status = DONE, HỦY BỎ, hoặc ĐỀN), tính lại wallet
	if oldStatus == models.BetReceiptStatusDone || oldStatus == models.BetReceiptStatusCancelled || oldStatus == models.BetReceiptStatusCompensation {
		if err := s.walletRepo.RecalculateTotalReceived(userID, exchangeRate); err != nil {
			log.Printf("Service - ❌ Lỗi tính lại wallet sau khi xóa: %v", err)
			// Không return error vì đơn hàng đã bị xóa, chỉ log warning
			log.Printf("Service - ⚠️ Đơn hàng đã bị xóa nhưng không thể tính lại wallet, cần tính thủ công")
		} else {
			log.Printf("Service - ✅ Đã tính lại wallet cho user ID: %s sau khi xóa đơn hàng", userID)
		}
	}

	log.Printf("Service - ✅ Đã xóa đơn hàng thành công cho ID: %s", id)
	return nil
}

// lookupPhiWeb tra cứu phí web dựa trên giá kèo (tệ)
// Bảng tham chiếu:
// < 20: 2
// 20-50: 4
// 51-100: 5
// 101-150: 6
// 151-200: 7
// 201-250: 8
// 251-300: 9
// 301-350: 10
// > 351: 11
// >= 800: 20
func lookupPhiWeb(giaKeo float64) float64 {
	if giaKeo < 20 {
		return 2
	} else if giaKeo >= 20 && giaKeo <= 50 {
		return 4
	} else if giaKeo >= 51 && giaKeo <= 100 {
		return 5
	} else if giaKeo >= 101 && giaKeo <= 150 {
		return 6
	} else if giaKeo >= 151 && giaKeo <= 200 {
		return 7
	} else if giaKeo >= 201 && giaKeo <= 250 {
		return 8
	} else if giaKeo >= 251 && giaKeo <= 300 {
		return 9
	} else if giaKeo >= 301 && giaKeo <= 350 {
		return 10
	} else if giaKeo >= 800 {
		return 20
	} else {
		// > 351 và < 800
		return 11
	}
}

// calculateActualAmountCNY tính "Công thực nhận" (ActualAmountCNY) dựa trên loại kèo và giá kèo
// Công thức:
// - Kèo web: Tổng thực nhận = Giá kèo - Phí web - (Giá kèo × 2%) - (Giá kèo × 6%)
// - Kèo ngoài: Tổng thực nhận = Giá kèo - 0 - (Giá kèo × 1%) - (Giá kèo × 6%)
func calculateActualAmountCNY(betType string, giaKeo float64) float64 {
	var phiWeb, phiRutTien, phiTrungGian float64

	if betType == models.BetTypeWeb {
		// Kèo web
		phiWeb = lookupPhiWeb(giaKeo)
		phiRutTien = giaKeo * 0.02   // 2%
		phiTrungGian = giaKeo * 0.06 // 6%
	} else if betType == models.BetTypeExternal {
		// Kèo ngoài
		phiWeb = 0
		phiRutTien = giaKeo * 0.01   // 1%
		phiTrungGian = giaKeo * 0.06 // 6%
	} else {
		// Loại kèo không hợp lệ, trả về 0
		log.Printf("Service - ⚠️ Loại kèo không hợp lệ: %s", betType)
		return 0
	}

	tongThucNhan := giaKeo - phiWeb - phiRutTien - phiTrungGian
	log.Printf("Service - 📊 Tính Công thực nhận - Loại kèo: %s, Giá kèo: %.2f, Phí web: %.2f, Phí rút tiền: %.2f, Phí trung gian: %.2f, Tổng thực nhận: %.2f",
		betType, giaKeo, phiWeb, phiRutTien, phiTrungGian, tongThucNhan)

	return tongThucNhan
}

// UpdateExchangeRateForProcessedOrders cập nhật tỷ giá cho tất cả đơn hàng đã xử lí (DONE, HỦY BỎ, ĐỀN)
// Sau đó recalculate lại wallet cho tất cả users
func (s *BetReceiptService) UpdateExchangeRateForProcessedOrders(newExchangeRate float64) error {
	log.Printf("Service - 🔄 Bắt đầu cập nhật tỷ giá cho các đơn hàng đã xử lí, tỷ giá mới: %.2f", newExchangeRate)

	// 1. Cập nhật tỷ giá hiện tại vào bảng current_exchange_rate
	updateCurrentRateQuery := `
		INSERT INTO current_exchange_rate (id, exchange_rate, updated_at)
		VALUES (1, $1, CURRENT_TIMESTAMP)
		ON CONFLICT (id) 
		DO UPDATE SET 
			exchange_rate = $1,
			updated_at = CURRENT_TIMESTAMP
	`

	_, err := s.betReceiptRepo.GetDB().Exec(updateCurrentRateQuery, newExchangeRate)
	if err != nil {
		log.Printf("Service - ❌ Lỗi cập nhật tỷ giá hiện tại: %v", err)
		return err
	}

	log.Printf("Service - ✅ Đã cập nhật tỷ giá hiện tại thành %.2f", newExchangeRate)

	// 2. Cập nhật tỷ giá cho tất cả đơn hàng có status DONE, HỦY BỎ, ĐỀN
	updateOrdersQuery := `
		UPDATE thong_tin_nhan_keo
		SET exchange_rate = $1
		WHERE tien_do_hoan_thanh IN ('DONE', 'HỦY BỎ', 'ĐỀN')
	`

	result, err := s.betReceiptRepo.GetDB().Exec(updateOrdersQuery, newExchangeRate)
	if err != nil {
		log.Printf("Service - ❌ Lỗi cập nhật tỷ giá cho đơn hàng: %v", err)
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Service - ⚠️ Không thể lấy số dòng bị ảnh hưởng: %v", err)
	} else {
		log.Printf("Service - ✅ Đã cập nhật tỷ giá cho %d đơn hàng", rowsAffected)
	}

	// 3. Lấy danh sách tất cả user IDs có đơn hàng đã xử lí
	userIDsQuery := `
		SELECT DISTINCT id_nguoi_dung
		FROM thong_tin_nhan_keo
		WHERE tien_do_hoan_thanh IN ('DONE', 'HỦY BỎ', 'ĐỀN')
	`

	rows, err := s.betReceiptRepo.GetDB().Query(userIDsQuery)
	if err != nil {
		log.Printf("Service - ❌ Lỗi lấy danh sách user IDs: %v", err)
		return err
	}
	defer rows.Close()

	var userIDs []string
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			log.Printf("Service - ⚠️ Lỗi scan user ID: %v", err)
			continue
		}
		userIDs = append(userIDs, userID)
	}

	log.Printf("Service - ✅ Tìm thấy %d users cần tính lại wallet", len(userIDs))

	// 4. Recalculate wallet cho từng user (dùng tỷ giá riêng của từng đơn hàng)
	for _, userID := range userIDs {
		if err := s.walletRepo.RecalculateWallet(userID, newExchangeRate); err != nil {
			log.Printf("Service - ⚠️ Lỗi tính lại wallet cho user %s: %v", userID, err)
			// Tiếp tục với user khác dù có lỗi
			continue
		}
		log.Printf("Service - ✅ Đã tính lại wallet cho user %s", userID)
	}

	log.Printf("Service - ✅ Hoàn thành cập nhật tỷ giá và tính lại wallet")
	return nil
}

// GetCurrentExchangeRate lấy tỷ giá hiện tại từ bảng current_exchange_rate
func (s *BetReceiptService) GetCurrentExchangeRate() (float64, error) {
	query := `
		SELECT exchange_rate
		FROM current_exchange_rate
		WHERE id = 1
	`

	var exchangeRate float64
	err := s.betReceiptRepo.GetDB().QueryRow(query).Scan(&exchangeRate)
	if err != nil {
		log.Printf("Service - ❌ Lỗi lấy tỷ giá hiện tại: %v", err)
		// Nếu không tìm thấy, trả về giá trị mặc định
		return 3550.0, nil
	}

	log.Printf("Service - ✅ Tỷ giá hiện tại: %.2f", exchangeRate)
	return exchangeRate, nil
}

// UpdateBetReceiptStatus cập nhật status của đơn hàng
// Khi status = "DONE", tự động tính "Công thực nhận" (ActualAmountCNY)
func (s *BetReceiptService) UpdateBetReceiptStatus(id string, req *models.UpdateBetReceiptStatusRequest, performedBy *string) (*models.BetReceipt, error) {
	log.Printf("Service - Cập nhật status cho đơn hàng ID: %s, Status mới: %s", id, req.Status)

	// 1. Lấy thông tin đơn hàng hiện tại
	betReceipt, err := s.betReceiptRepo.FindByID(id)
	if err != nil {
		log.Printf("Service - ❌ Không tìm thấy đơn hàng với ID: %s", id)
		return nil, errors.New("Không tìm thấy đơn hàng")
	}

	// Lưu dữ liệu cũ để ghi log
	oldBetReceiptData, _ := betReceiptToMap(betReceipt)

	// 2. Xử lý "Công thực nhận" và cập nhật wallet
	// Lấy tỷ giá hiện tại từ bảng current_exchange_rate
	exchangeRate, err := s.GetCurrentExchangeRate()
	if err != nil {
		log.Printf("Service - ⚠️ Không thể lấy tỷ giá hiện tại, dùng giá trị mặc định 3550.0: %v", err)
		exchangeRate = 3550.0 // Tỷ giá VND/CNY mặc định
	}

	// Lưu status cũ để kiểm tra xem có cần tính lại wallet không
	oldStatus := betReceipt.Status

	// 3. Xử lý theo từng status
	if req.Status == models.BetReceiptStatusDone {
		// Status = "DONE": Set ActualReceivedCNY = WebBetAmountCNY ban đầu và tính ActualAmountCNY
		betReceipt.ActualReceivedCNY = betReceipt.WebBetAmountCNY // ActualReceivedCNY = WebBetAmountCNY khi DONE
		actualAmountCNY := calculateActualAmountCNY(betReceipt.BetType, betReceipt.WebBetAmountCNY)
		betReceipt.ActualAmountCNY = actualAmountCNY
		// Lưu tỷ giá hiện tại khi đơn hàng chuyển sang DONE
		betReceipt.ExchangeRate = exchangeRate
		log.Printf("Service - ✅ Status = DONE, set ActualReceivedCNY = WebBetAmountCNY = %.2f, Công thực nhận: %.2f, Tỷ giá: %.2f cho đơn hàng ID: %s",
			betReceipt.WebBetAmountCNY, actualAmountCNY, betReceipt.ExchangeRate, id)
	} else if req.Status == models.BetReceiptStatusCancelled {
		// Status = "HỦY BỎ": Yêu cầu nhập ActualReceivedCNY
		if req.ActualReceivedCNY == nil {
			return nil, errors.New("Khi chọn status 'Hủy bỏ', phải nhập 'Tiền kèo thực nhận' (ActualReceivedCNY)")
		}

		actualReceivedCNY := *req.ActualReceivedCNY
		betReceipt.ActualReceivedCNY = actualReceivedCNY
		// KHÔNG thay đổi WebBetAmountCNY (giữ nguyên giá trị ban đầu)

		// Tính ActualAmountCNY dựa trên ActualReceivedCNY (coi như WebBetAmountCNY để tính)
		// Nếu ActualReceivedCNY = 0 thì ActualAmountCNY = 0
		if actualReceivedCNY == 0 {
			betReceipt.ActualAmountCNY = 0
			log.Printf("Service - ℹ️ Status = HỦY BỎ, ActualReceivedCNY = 0, set ActualAmountCNY = 0 cho đơn hàng ID: %s", id)
		} else {
			actualAmountCNY := calculateActualAmountCNY(betReceipt.BetType, actualReceivedCNY)
			betReceipt.ActualAmountCNY = actualAmountCNY
			// Lưu tỷ giá hiện tại khi đơn hàng chuyển sang HỦY BỎ
			betReceipt.ExchangeRate = exchangeRate
			log.Printf("Service - ✅ Status = HỦY BỎ, ActualReceivedCNY = %.2f, Công thực nhận: %.2f, Tỷ giá: %.2f cho đơn hàng ID: %s",
				actualReceivedCNY, actualAmountCNY, betReceipt.ExchangeRate, id)
		}
	} else if req.Status == models.BetReceiptStatusCompensation {
		// Status = "ĐỀN": Yêu cầu nhập CompensationCNY và CancelReason (lý do đền)
		if req.CompensationCNY == nil {
			return nil, errors.New("Khi chọn status 'Đền', phải nhập 'Tiền đền' (CompensationCNY)")
		}
		if req.CancelReason == nil || *req.CancelReason == "" {
			return nil, errors.New("Khi chọn status 'Đền', phải nhập 'Lý do đền' (CancelReason)")
		}

		compensationCNY := *req.CompensationCNY
		// Validation: Tiền đền phải > 0
		if compensationCNY <= 0 {
			return nil, errors.New("Tiền đền phải lớn hơn 0")
		}

		betReceipt.CompensationCNY = compensationCNY
		betReceipt.CancelReason = *req.CancelReason
		// KHÔNG thay đổi WebBetAmountCNY và ActualReceivedCNY (giữ nguyên giá trị)

		// ActualAmountCNY = -CompensationCNY (nhập bao nhiêu trừ bấy nhiêu, không dùng công thức)
		// Lưu tỷ giá hiện tại khi đơn hàng chuyển sang ĐỀN
		betReceipt.ExchangeRate = exchangeRate
		betReceipt.ActualAmountCNY = -compensationCNY // Giá trị ÂM để trừ tiền
		log.Printf("Service - ✅ Status = ĐỀN, CompensationCNY = %.2f, ActualAmountCNY (âm): %.2f cho đơn hàng ID: %s",
			compensationCNY, betReceipt.ActualAmountCNY, id)
		log.Printf("Service - ✅ Status = ĐỀN, Lý do đền: %s cho đơn hàng ID: %s", betReceipt.CancelReason, id)
	} else {
		// Khi status không phải "DONE", "HỦY BỎ", hoặc "ĐỀN"
		// Nếu đổi từ "DONE" hoặc "HỦY BỎ" sang status khác, reset ActualReceivedCNY về 0 và xóa lý do hủy
		if oldStatus == models.BetReceiptStatusDone || oldStatus == models.BetReceiptStatusCancelled {
			betReceipt.ActualReceivedCNY = 0
			betReceipt.CancelReason = "" // Xóa lý do hủy khi đổi sang status khác
			log.Printf("Service - ℹ️ Đổi từ %s sang %s, reset ActualReceivedCNY = 0 và xóa lý do hủy cho đơn hàng ID: %s", oldStatus, req.Status, id)
		}
		// Nếu đổi từ "ĐỀN" sang status khác, reset CompensationCNY về 0
		if oldStatus == models.BetReceiptStatusCompensation {
			betReceipt.CompensationCNY = 0
			log.Printf("Service - ℹ️ Đổi từ %s sang %s, reset CompensationCNY = 0 cho đơn hàng ID: %s", oldStatus, req.Status, id)
		}
		// Không hiển thị "Công thực nhận"
		betReceipt.ActualAmountCNY = 0
		log.Printf("Service - ℹ️ Status không phải DONE/HỦY BỎ/ĐỀN, set Công thực nhận = 0 cho đơn hàng ID: %s", id)
	}

	// 4. Cập nhật các trường khác nếu có (chỉ khi không phải "HỦY BỎ", "DONE", và "ĐỀN" vì đã xử lý ở trên)
	// Lưu ý: Nếu đổi từ "DONE" hoặc "HỦY BỎ" sang status khác, ActualReceivedCNY đã được reset về 0 ở phần trên
	// Nếu đổi từ "ĐỀN" sang status khác, CompensationCNY đã được reset về 0 ở phần trên
	// và sẽ không bị override ở đây (vì khi đổi status, thường không gửi các giá trị này trong request)
	if req.Status != models.BetReceiptStatusCancelled && req.Status != models.BetReceiptStatusDone && req.Status != models.BetReceiptStatusCompensation {
		if req.ActualReceivedCNY != nil {
			betReceipt.ActualReceivedCNY = *req.ActualReceivedCNY
		}
		// CompensationCNY chỉ có giá trị khi status = "ĐỀN", các status khác luôn là 0
		// Không cho phép override CompensationCNY khi status không phải "ĐỀN"
		betReceipt.CompensationCNY = 0
		log.Printf("Service - ✅ Status không phải ĐỀN, set CompensationCNY = 0 cho đơn hàng ID: %s", id)
	}
	// 4.5. Xử lý thời gian hoàn thành:
	// - Nếu status là "HỦY BỎ", "DONE", "ĐỀN", "CHỜ CHẤP NHẬN", hoặc "CHỜ TRỌNG TÀI": set thời gian hoàn thành
	// - Nếu status không phải các status trên: xóa thời gian hoàn thành (set về NULL)
	// - Nếu trước đó status là "CHỜ CHẤP NHẬN" hoặc "CHỜ TRỌNG TÀI" (đã có CompletedAt),
	//   khi chuyển sang DONE/HỦY BỎ/ĐỀN thì giữ nguyên ngày cũ (không cập nhật lại)
	if req.Status == models.BetReceiptStatusDone || req.Status == models.BetReceiptStatusCancelled || req.Status == models.BetReceiptStatusCompensation ||
		req.Status == models.BetReceiptStatusPending || req.Status == models.BetReceiptStatusWaitingRef {
		// Kiểm tra nếu trước đó là "CHỜ CHẤP NHẬN" hoặc "CHỜ TRỌNG TÀI" và đã có CompletedAt
		// Khi chuyển sang DONE/HỦY BỎ/ĐỀN thì giữ nguyên ngày cũ
		if (oldStatus == models.BetReceiptStatusPending || oldStatus == models.BetReceiptStatusWaitingRef) &&
			betReceipt.CompletedAt != nil &&
			(req.Status == models.BetReceiptStatusDone || req.Status == models.BetReceiptStatusCancelled || req.Status == models.BetReceiptStatusCompensation) {
			// Giữ nguyên CompletedAt cũ (không cập nhật lại)
			log.Printf("Service - ℹ️ Giữ nguyên thời gian hoàn thành cũ cho đơn hàng ID: %s (từ %s sang %s)", id, oldStatus, req.Status)
		} else {
			// Nếu có CompletedAt trong request, dùng nó (thường là nil, sẽ set mới)
			if req.CompletedAt != nil {
				betReceipt.CompletedAt = req.CompletedAt
			} else {
				// Set thời gian mới khi chuyển sang các status này
				now := time.Now()
				betReceipt.CompletedAt = &now
				log.Printf("Service - ✅ Set thời gian hoàn thành mới cho đơn hàng ID: %s với status: %s", id, req.Status)
			}
		}
	} else {
		// Status không phải các status trên -> xóa thời gian hoàn thành
		betReceipt.CompletedAt = nil
		log.Printf("Service - ✅ Xóa thời gian hoàn thành cho đơn hàng ID: %s khi chuyển sang status: %s", id, req.Status)
	}

	// 4.6. Xử lý thời gian còn lại (Deadline):
	// Deadline không bao giờ bị thay đổi khi update status, chỉ có thể thay đổi khi bấm nút chỉnh sửa
	// Giữ nguyên giá trị TimeRemainingHours từ DB hiện tại (không thay đổi)
	log.Printf("Service - ℹ️ Giữ nguyên Deadline (thoi_gian_con_lai_gio) cho đơn hàng ID: %s khi chuyển sang status: %s", id, req.Status)

	// 5. Cập nhật status vào database TRƯỚC (để khi tính lại wallet, status đã được update)
	betReceipt.Status = req.Status

	// 5. Lưu vào database
	if err := s.betReceiptRepo.UpdateStatus(betReceipt); err != nil {
		log.Printf("Service - ❌ Lỗi cập nhật status: %v", err)
		return nil, errors.New("Lỗi khi cập nhật status: " + err.Error())
	}

	// 6. Tính lại wallet SAU KHI đã update status vào database
	// - Status mới = DONE, HỦY BỎ, hoặc ĐỀN (DONE và HỦY BỎ cộng tiền, ĐỀN trừ tiền)
	// - Status cũ = DONE, HỦY BỎ, hoặc ĐỀN và status mới ≠ DONE, ≠ HỦY BỎ, và ≠ ĐỀN (tính lại wallet)
	if req.Status == models.BetReceiptStatusDone || req.Status == models.BetReceiptStatusCancelled || req.Status == models.BetReceiptStatusCompensation ||
		oldStatus == models.BetReceiptStatusDone || oldStatus == models.BetReceiptStatusCancelled || oldStatus == models.BetReceiptStatusCompensation {
		// Tính lại tổng "Công thực nhận" từ tất cả bet receipts có status = "DONE", "HỦY BỎ", hoặc "ĐỀN"
		// (ĐỀN có ActualAmountCNY âm nên sẽ tự động trừ đi)
		// và cập nhật wallet theo tổng này (đảm bảo wallet luôn phản ánh đúng tổng từ database)
		if err := s.walletRepo.RecalculateTotalReceived(betReceipt.UserID, exchangeRate); err != nil {
			log.Printf("Service - ❌ Lỗi tính lại wallet: %v", err)
			return nil, errors.New("Lỗi khi cập nhật wallet: " + err.Error())
		}
		log.Printf("Service - ✅ Đã tính lại wallet cho user ID: %s từ tất cả bet receipts có status = DONE, HỦY BỎ, hoặc ĐỀN",
			betReceipt.UserID)
	}

	// Ghi log lịch sử (UPDATE status)
	if s.historyRepo != nil {
		go func() {
			newBetReceiptData, _ := betReceiptToMap(betReceipt)
			changedFields := repository.FindChangedFields(oldBetReceiptData, newBetReceiptData)

			historyReq := &models.CreateHistoryRequest{
				BetReceiptID:  id,
				Action:        models.HistoryActionUpdate,
				PerformedBy:   performedBy,
				OldData:       oldBetReceiptData,
				NewData:       newBetReceiptData,
				ChangedFields: changedFields,
				Description:   "Cập nhật status: " + oldStatus + " -> " + req.Status,
			}

			if err := s.createHistory(historyReq); err != nil {
				log.Printf("Service - ⚠️ Không thể ghi lịch sử: %v", err)
			}
		}()
	}

	log.Printf("Service - ✅ Đã cập nhật status thành công cho đơn hàng ID: %s", id)
	return betReceipt, nil
}

// Helper function: Convert BetReceipt to map[string]interface{}
func betReceiptToMap(betReceipt *models.BetReceipt) (map[string]interface{}, error) {
	data, err := json.Marshal(betReceipt)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}

	return result, nil
}

// Helper function: Create history record
func (s *BetReceiptService) createHistory(req *models.CreateHistoryRequest) error {
	historyService := NewBetReceiptHistoryService(s.historyRepo)
	return historyService.CreateHistory(req)
}

// RecalculateActualAmountCNY tính lại "Công thực nhận" (ActualAmountCNY) cho một đơn hàng đã xử lý
// Chỉ áp dụng cho các đơn hàng có status = DONE, HỦY BỎ, hoặc ĐỀN
func (s *BetReceiptService) RecalculateActualAmountCNY(id string) (*models.BetReceipt, error) {
	log.Printf("Service - 🔄 Bắt đầu tính lại Công thực nhận cho đơn hàng ID: %s", id)

	// 1. Lấy thông tin đơn hàng hiện tại
	betReceipt, err := s.betReceiptRepo.FindByID(id)
	if err != nil {
		log.Printf("Service - ❌ Không tìm thấy đơn hàng với ID: %s", id)
		return nil, errors.New("Không tìm thấy đơn hàng")
	}

	// 2. Kiểm tra status có phải là đơn hàng đã xử lý không
	processedStatuses := []string{models.BetReceiptStatusDone, models.BetReceiptStatusCancelled, models.BetReceiptStatusCompensation}
	isProcessed := false
	for _, status := range processedStatuses {
		if betReceipt.Status == status {
			isProcessed = true
			break
		}
	}

	if !isProcessed {
		log.Printf("Service - ❌ Đơn hàng ID: %s có status '%s' chưa được xử lý. Chỉ tính lại tệ cho đơn hàng có status DONE, HỦY BỎ, hoặc ĐỀN", id, betReceipt.Status)
		return nil, errors.New("Chỉ có thể tính lại tệ cho đơn hàng đã xử lý (DONE, HỦY BỎ, hoặc ĐỀN)")
	}

	// 3. Tính lại ActualAmountCNY dựa trên status
	var newActualAmountCNY float64
	exchangeRate := 3550.0 // Tỷ giá mặc định

	if betReceipt.Status == models.BetReceiptStatusDone {
		// DONE: Tính dựa trên WebBetAmountCNY
		newActualAmountCNY = calculateActualAmountCNY(betReceipt.BetType, betReceipt.WebBetAmountCNY)
		betReceipt.ActualReceivedCNY = betReceipt.WebBetAmountCNY
		log.Printf("Service - ✅ Status = DONE, tính lại ActualAmountCNY = %.2f (từ WebBetAmountCNY = %.2f)", newActualAmountCNY, betReceipt.WebBetAmountCNY)
	} else if betReceipt.Status == models.BetReceiptStatusCancelled {
		// HỦY BỎ: Tính dựa trên ActualReceivedCNY
		if betReceipt.ActualReceivedCNY == 0 {
			newActualAmountCNY = 0
		} else {
			newActualAmountCNY = calculateActualAmountCNY(betReceipt.BetType, betReceipt.ActualReceivedCNY)
		}
		log.Printf("Service - ✅ Status = HỦY BỎ, tính lại ActualAmountCNY = %.2f (từ ActualReceivedCNY = %.2f)", newActualAmountCNY, betReceipt.ActualReceivedCNY)
	} else if betReceipt.Status == models.BetReceiptStatusCompensation {
		// ĐỀN: ActualAmountCNY = -CompensationCNY
		newActualAmountCNY = -betReceipt.CompensationCNY
		log.Printf("Service - ✅ Status = ĐỀN, tính lại ActualAmountCNY = %.2f (âm của CompensationCNY = %.2f)", newActualAmountCNY, betReceipt.CompensationCNY)
	}

	// 4. Lưu tỷ giá nếu chưa có
	if betReceipt.ExchangeRate == 0 {
		betReceipt.ExchangeRate = exchangeRate
	}

	// 5. Lưu ActualAmountCNY cũ để tính lại wallet
	oldActualAmountCNY := betReceipt.ActualAmountCNY
	betReceipt.ActualAmountCNY = newActualAmountCNY

	// 6. Cập nhật vào database (dùng UpdateStatus để cập nhật ActualAmountCNY)
	err = s.betReceiptRepo.UpdateStatus(betReceipt)
	if err != nil {
		log.Printf("Service - ❌ Lỗi cập nhật ActualAmountCNY: %v", err)
		return nil, errors.New("Lỗi khi cập nhật Công thực nhận: " + err.Error())
	}

	// 7. Tính lại wallet cho user (vì ActualAmountCNY đã thay đổi)
	// Tính lại từ đầu dựa trên tất cả đơn hàng
	if oldActualAmountCNY != newActualAmountCNY {
		log.Printf("Service - 🔄 ActualAmountCNY thay đổi: %.2f -> %.2f, tính lại wallet cho user %s", oldActualAmountCNY, newActualAmountCNY, betReceipt.UserID)

		// Tính lại wallet từ đầu (recalculate từ tất cả đơn hàng)
		// RecalculateWallet sẽ tự tạo wallet nếu chưa có
		err = s.walletRepo.RecalculateWallet(betReceipt.UserID, betReceipt.ExchangeRate)
		if err != nil {
			log.Printf("Service - ❌ Lỗi tính lại wallet: %v", err)
			return nil, errors.New("Lỗi khi tính lại wallet: " + err.Error())
		}

		log.Printf("Service - ✅ Đã tính lại wallet cho user %s", betReceipt.UserID)
	}

	log.Printf("Service - ✅ Tính lại Công thực nhận thành công - ID: %s, ActualAmountCNY: %.2f", id, newActualAmountCNY)

	return betReceipt, nil
}

package service

import (
	"errors"
	"fullstack-backend/internal/models"
	"fullstack-backend/internal/repository"
	"log"
)

type BetReceiptService struct {
	betReceiptRepo *repository.BetReceiptRepository
	userRepo       *repository.UserRepository
	walletRepo     *repository.WalletRepository
}

func NewBetReceiptService(betReceiptRepo *repository.BetReceiptRepository, userRepo *repository.UserRepository, walletRepo *repository.WalletRepository) *BetReceiptService {
	return &BetReceiptService{
		betReceiptRepo: betReceiptRepo,
		userRepo:       userRepo,
		walletRepo:     walletRepo,
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

	// 3. Đặt trạng thái mặc định là "ĐANG THỰC HIỆN"
	status := models.BetReceiptStatusInProgress

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
func (s *BetReceiptService) GetAllBetReceipts(limit, offset int) ([]*models.BetReceipt, error) {
	return s.betReceiptRepo.GetAll(limit, offset)
}

// GetBetReceiptByID lấy đơn hàng (thông tin nhận kèo) theo ID
func (s *BetReceiptService) GetBetReceiptByID(id string) (*models.BetReceipt, error) {
	return s.betReceiptRepo.FindByID(id)
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

// UpdateBetReceiptStatus cập nhật status của đơn hàng
// Khi status = "DONE", tự động tính "Công thực nhận" (ActualAmountCNY)
func (s *BetReceiptService) UpdateBetReceiptStatus(id string, req *models.UpdateBetReceiptStatusRequest) (*models.BetReceipt, error) {
	log.Printf("Service - Cập nhật status cho đơn hàng ID: %s, Status mới: %s", id, req.Status)

	// 1. Lấy thông tin đơn hàng hiện tại
	betReceipt, err := s.betReceiptRepo.FindByID(id)
	if err != nil {
		log.Printf("Service - ❌ Không tìm thấy đơn hàng với ID: %s", id)
		return nil, errors.New("Không tìm thấy đơn hàng")
	}

	// 2. Xử lý "Công thực nhận" và cập nhật wallet
	const exchangeRate = 3550.0 // Tỷ giá VND/CNY

	// Lưu status cũ để kiểm tra xem có cần tính lại wallet không
	oldStatus := betReceipt.Status

	if req.Status == models.BetReceiptStatusDone {
		actualAmountCNY := calculateActualAmountCNY(betReceipt.BetType, betReceipt.WebBetAmountCNY)
		betReceipt.ActualAmountCNY = actualAmountCNY
		log.Printf("Service - ✅ Đã tính Công thực nhận: %.2f cho đơn hàng ID: %s", actualAmountCNY, id)
	} else {
		// Khi status không phải "DONE", không hiển thị "Công thực nhận"
		betReceipt.ActualAmountCNY = 0
		log.Printf("Service - ℹ️ Status không phải DONE, set Công thực nhận = 0 cho đơn hàng ID: %s", id)
	}

	// 3. Cập nhật các trường khác nếu có
	if req.ActualReceivedCNY != nil {
		betReceipt.ActualReceivedCNY = *req.ActualReceivedCNY
	}
	if req.CompensationCNY != nil {
		betReceipt.CompensationCNY = *req.CompensationCNY
	}
	if req.CompletedAt != nil {
		betReceipt.CompletedAt = req.CompletedAt
	}

	// 4. Cập nhật status vào database TRƯỚC (để khi tính lại wallet, status đã được update)
	betReceipt.Status = req.Status

	// 5. Lưu vào database
	if err := s.betReceiptRepo.UpdateStatus(betReceipt); err != nil {
		log.Printf("Service - ❌ Lỗi cập nhật status: %v", err)
		return nil, errors.New("Lỗi khi cập nhật status: " + err.Error())
	}

	// 6. Tính lại wallet SAU KHI đã update status vào database
	// - Status mới = DONE (cộng thêm vào wallet)
	// - Status cũ = DONE và status mới ≠ DONE (trừ đi khỏi wallet)
	if req.Status == models.BetReceiptStatusDone || oldStatus == models.BetReceiptStatusDone {
		// Tính lại tổng "Công thực nhận" từ tất cả bet receipts có status = "DONE"
		// và cập nhật wallet theo tổng này (đảm bảo wallet luôn phản ánh đúng tổng từ database)
		if err := s.walletRepo.RecalculateTotalReceived(betReceipt.UserID, exchangeRate); err != nil {
			log.Printf("Service - ❌ Lỗi tính lại wallet: %v", err)
			return nil, errors.New("Lỗi khi cập nhật wallet: " + err.Error())
		}
		log.Printf("Service - ✅ Đã tính lại wallet cho user ID: %s từ tất cả bet receipts có status = DONE",
			betReceipt.UserID)
	}

	log.Printf("Service - ✅ Đã cập nhật status thành công cho đơn hàng ID: %s", id)
	return betReceipt, nil
}

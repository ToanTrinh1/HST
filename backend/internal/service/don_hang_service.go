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
}

func NewBetReceiptService(betReceiptRepo *repository.BetReceiptRepository, userRepo *repository.UserRepository) *BetReceiptService {
	return &BetReceiptService{
		betReceiptRepo: betReceiptRepo,
		userRepo:       userRepo,
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

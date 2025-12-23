package service

import (
	"errors"
	"fullstack-backend/internal/models"
	"fullstack-backend/internal/repository"
	"log"
)

type DepositService struct {
	depositRepo *repository.DepositRepository
	userRepo    *repository.UserRepository
	walletRepo  *repository.WalletRepository
}

func NewDepositService(depositRepo *repository.DepositRepository, userRepo *repository.UserRepository, walletRepo *repository.WalletRepository) *DepositService {
	return &DepositService{
		depositRepo: depositRepo,
		userRepo:    userRepo,
		walletRepo:  walletRepo,
	}
}

// CreateDeposit tạo record nạp tiền và cập nhật wallet
// req.UserName: tên người dùng (từ cột ten trong nguoi_dung)
// req.AmountVND: số tiền VND cần nạp
func (s *DepositService) CreateDeposit(req *models.CreateDepositRequest) (*models.Deposit, error) {
	log.Printf("Service - Nạp tiền cho user_name: %s, AmountVND: %.2f", req.UserName, req.AmountVND)

	// 1. Tìm người dùng theo tên
	users, err := s.userRepo.FindByName(req.UserName)
	if err != nil {
		log.Printf("Service - ❌ Lỗi khi tìm người dùng: %v", err)
		return nil, errors.New("Lỗi khi tìm kiếm người dùng")
	}

	// Lọc để tìm user có tên chính xác
	var foundUser *models.User
	for _, u := range users {
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

	// 2. Tạo deposit record
	deposit := &models.Deposit{
		UserID:    foundUser.ID,
		AmountVND: req.AmountVND,
		Notes:     req.Notes,
	}

	if err := s.depositRepo.Create(deposit); err != nil {
		log.Printf("Service - ❌ Lỗi tạo deposit: %v", err)
		return nil, errors.New("Lỗi khi tạo deposit: " + err.Error())
	}

	// 3. Cập nhật wallet: cộng amountVND vào tong_coc_vnd và tính lại so_du_hien_tai_vnd
	if err := s.walletRepo.AddToTotalDepositVND(foundUser.ID, req.AmountVND); err != nil {
		log.Printf("Service - ❌ Lỗi cập nhật wallet: %v", err)
		return nil, errors.New("Lỗi khi cập nhật wallet: " + err.Error())
	}

	log.Printf("Service - ✅ Đã nạp tiền thành công cho user ID: %s, AmountVND: %.2f", 
		foundUser.ID, req.AmountVND)

	return deposit, nil
}


package service

import (
	"fmt"
	"fullstack-backend/internal/models"
	"fullstack-backend/internal/repository"
	"log"
)

type WithdrawalService struct {
	withdrawalRepo *repository.WithdrawalRepository
	userRepo       *repository.UserRepository
	walletRepo     *repository.WalletRepository
}

func NewWithdrawalService(withdrawalRepo *repository.WithdrawalRepository, userRepo *repository.UserRepository, walletRepo *repository.WalletRepository) *WithdrawalService {
	return &WithdrawalService{
		withdrawalRepo: withdrawalRepo,
		userRepo:       userRepo,
		walletRepo:     walletRepo,
	}
}

// CreateWithdrawal tạo record rút tiền và cập nhật wallet
// req.UserName: tên người dùng (từ cột ten trong nguoi_dung)
// req.AmountVND: số tiền VND cần rút
// Lưu ý: Cho phép rút tiền ngay cả khi số dư không đủ (số dư có thể âm)
func (s *WithdrawalService) CreateWithdrawal(req *models.CreateWithdrawalRequest) (*models.Withdrawal, error) {
	log.Printf("Service - Rút tiền cho user_name: %s, AmountVND: %.2f", req.UserName, req.AmountVND)

	// 1. Tìm người dùng theo tên
	users, err := s.userRepo.FindByName(req.UserName)
	if err != nil {
		log.Printf("Service - ❌ Lỗi khi tìm người dùng: %v", err)
		return nil, fmt.Errorf("Lỗi khi tìm kiếm người dùng: %w", err)
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
		return nil, fmt.Errorf("Tên người dùng '%s' không có trong hệ thống", req.UserName)
	}

	log.Printf("Service - ✅ Tìm thấy người dùng: %s (%s), ID: %s", foundUser.Name, foundUser.Email, foundUser.ID)

	// 2. Lấy thông tin wallet (nếu có) để log số dư hiện tại
	wallet, err := s.walletRepo.GetWalletByUserID(foundUser.ID)
	if err != nil {
		log.Printf("Service - ⚠️ Lỗi khi lấy wallet: %v (sẽ tự động tạo khi rút tiền)", err)
	} else if wallet != nil {
		log.Printf("Service - 💰 Số dư hiện tại: %.2f VND, Số tiền rút: %.2f VND", wallet.CurrentBalanceVND, req.AmountVND)
	} else {
		log.Printf("Service - 💰 Wallet chưa tồn tại, sẽ tự động tạo khi rút tiền. Số tiền rút: %.2f VND", req.AmountVND)
	}

	// 3. Tạo withdrawal record
	var amountCNY float64
	if req.AmountCNY != nil {
		amountCNY = *req.AmountCNY
	}

	withdrawal := &models.Withdrawal{
		UserID:    foundUser.ID,
		AmountCNY: amountCNY,
		AmountVND: req.AmountVND,
		Notes:     req.Notes,
	}

	if err := s.withdrawalRepo.Create(withdrawal); err != nil {
		log.Printf("Service - ❌ Lỗi tạo withdrawal: %v", err)
		return nil, fmt.Errorf("Lỗi khi tạo withdrawal: %w", err)
	}

	// 4. Cập nhật wallet: cộng amountVND vào tong_da_rut_vnd và tính lại so_du_hien_tai_vnd
	// Method này sẽ tự động tạo wallet nếu chưa có
	if err := s.walletRepo.AddToTotalWithdrawnVND(foundUser.ID, req.AmountVND); err != nil {
		log.Printf("Service - ❌ Lỗi cập nhật wallet: %v", err)
		return nil, fmt.Errorf("Lỗi khi cập nhật wallet: %w", err)
	}

	// 5. Lấy lại wallet để log số dư mới
	updatedWallet, err := s.walletRepo.GetWalletByUserID(foundUser.ID)
	if err == nil && updatedWallet != nil {
		log.Printf("Service - ✅ Đã rút tiền thành công cho user ID: %s, AmountVND: %.2f",
			foundUser.ID, req.AmountVND)
		log.Printf("Service - 💰 Số dư mới: %.2f VND", updatedWallet.CurrentBalanceVND)
	} else {
		log.Printf("Service - ✅ Đã rút tiền thành công cho user ID: %s, AmountVND: %.2f",
			foundUser.ID, req.AmountVND)
	}

	return withdrawal, nil
}

// GetAllWithdrawals lấy tất cả lịch sử rút tiền
func (s *WithdrawalService) GetAllWithdrawals() ([]repository.WithdrawalWithUser, error) {
	log.Printf("Service - Lấy tất cả lịch sử rút tiền")

	withdrawals, err := s.withdrawalRepo.GetAll()
	if err != nil {
		log.Printf("Service - ❌ Lỗi lấy danh sách withdrawals: %v", err)
		return nil, err
	}

	log.Printf("Service - ✅ Đã lấy %d withdrawals", len(withdrawals))
	return withdrawals, nil
}

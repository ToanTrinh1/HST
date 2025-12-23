package service

import (
	"fullstack-backend/internal/models"
	"fullstack-backend/internal/repository"
	"log"
)

type WalletService struct {
	walletRepo *repository.WalletRepository
}

func NewWalletService(walletRepo *repository.WalletRepository) *WalletService {
	return &WalletService{
		walletRepo: walletRepo,
	}
}

// WalletWithUserResponse - Response DTO kết hợp wallet và user info
// User.Name sẽ chứa giá trị từ nd.ten trong database
type WalletWithUserResponse struct {
	Wallet *models.Wallet `json:"wallet"`
	User   *models.User   `json:"user"`
}

// GetAllWallets lấy tất cả wallets với thông tin user
// User.Name được map từ nd.ten trong bảng nguoi_dung
func (s *WalletService) GetAllWallets(limit, offset int) ([]*WalletWithUserResponse, error) {
	wallets, users, err := s.walletRepo.GetAllWallets(limit, offset)
	if err != nil {
		return nil, err
	}

	// Kết hợp wallets và users thành response
	results := make([]*WalletWithUserResponse, len(wallets))
	for i := range wallets {
		results[i] = &WalletWithUserResponse{
			Wallet: wallets[i],
			User:   users[i], // User.Name đã được map từ nd.ten
		}
	}

	return results, nil
}

// RecalculateWallet tính toán lại wallet từ dữ liệu thực tế trong database
// exchangeRate: Tỷ giá VND/CNY (mặc định 3550)
func (s *WalletService) RecalculateWallet(userID string, exchangeRate float64) error {
	return s.walletRepo.RecalculateWallet(userID, exchangeRate)
}

// RecalculateAllWallets tính toán lại tất cả wallets từ dữ liệu thực tế trong database
// exchangeRate: Tỷ giá VND/CNY (mặc định 3550)
func (s *WalletService) RecalculateAllWallets(exchangeRate float64) error {
	// Lấy tất cả wallets với user info
	results, err := s.GetAllWallets(10000, 0) // Lấy tối đa 10000 users
	if err != nil {
		return err
	}

	// Recalculate wallet cho mỗi user
	for _, result := range results {
		userID := result.User.ID
		err := s.walletRepo.RecalculateWallet(userID, exchangeRate)
		if err != nil {
			// Log error nhưng tiếp tục với các users khác
			log.Printf("Lỗi khi recalculate wallet cho userID %s: %v", userID, err)
		}
	}

	return nil
}

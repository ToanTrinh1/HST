package handlers

import (
	"fullstack-backend/internal/service"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type WalletHandler struct {
	walletService *service.WalletService
}

func NewWalletHandler(walletService *service.WalletService) *WalletHandler {
	return &WalletHandler{
		walletService: walletService,
	}
}

// GetAllWallets lấy tất cả wallets
// User.Name trong response sẽ chứa giá trị từ nd.ten trong database
func (h *WalletHandler) GetAllWallets(c *gin.Context) {
	log.Println("=== BẮT ĐẦU LẤY DANH SÁCH WALLETS ===")

	// Parse query parameters
	limitStr := c.DefaultQuery("limit", "100")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 100
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	results, err := h.walletService.GetAllWallets(limit, offset)
	if err != nil {
		log.Printf("❌ LỖI LẤY DANH SÁCH WALLETS: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi lấy danh sách wallets",
		})
		return
	}

	log.Printf("✅ LẤY DANH SÁCH WALLETS THÀNH CÔNG - Số lượng: %d", len(results))
	if len(results) > 0 {
		log.Printf("👤 Tên người dùng đầu tiên (từ nd.ten): %s", results[0].User.Name)
	}
	log.Println("=== KẾT THÚC LẤY DANH SÁCH WALLETS ===")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    results,
	})
}

// RecalculateWallet tính toán lại wallet từ dữ liệu thực tế trong database
// Dùng khi đã xóa/sửa trực tiếp trong database và cần đồng bộ lại wallet
func (h *WalletHandler) RecalculateWallet(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "user_id là bắt buộc",
		})
		return
	}

	// Tỷ giá mặc định: 3550 VND = 1 CNY
	exchangeRate := 3550.0
	if rateStr := c.Query("exchange_rate"); rateStr != "" {
		if rate, err := strconv.ParseFloat(rateStr, 64); err == nil && rate > 0 {
			exchangeRate = rate
		}
	}

	log.Printf("=== BẮT ĐẦU RECALCULATE WALLET - UserID: %s, ExchangeRate: %.2f ===", userID, exchangeRate)

	err := h.walletService.RecalculateWallet(userID, exchangeRate)
	if err != nil {
		log.Printf("❌ LỖI RECALCULATE WALLET: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi tính toán lại wallet: " + err.Error(),
		})
		return
	}

	log.Printf("✅ RECALCULATE WALLET THÀNH CÔNG - UserID: %s", userID)
	log.Println("=== KẾT THÚC RECALCULATE WALLET ===")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đã tính toán lại wallet thành công",
	})
}

// RecalculateAllWallets tính toán lại tất cả wallets từ dữ liệu thực tế trong database
// Dùng khi đã xóa/sửa trực tiếp trong database và cần đồng bộ lại tất cả wallets
func (h *WalletHandler) RecalculateAllWallets(c *gin.Context) {
	// Tỷ giá mặc định: 3550 VND = 1 CNY
	exchangeRate := 3550.0
	if rateStr := c.Query("exchange_rate"); rateStr != "" {
		if rate, err := strconv.ParseFloat(rateStr, 64); err == nil && rate > 0 {
			exchangeRate = rate
		}
	}

	log.Printf("=== BẮT ĐẦU RECALCULATE TẤT CẢ WALLETS - ExchangeRate: %.2f ===", exchangeRate)

	err := h.walletService.RecalculateAllWallets(exchangeRate)
	if err != nil {
		log.Printf("❌ LỖI RECALCULATE TẤT CẢ WALLETS: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi tính toán lại wallets: " + err.Error(),
		})
		return
	}

	log.Printf("✅ RECALCULATE TẤT CẢ WALLETS THÀNH CÔNG")
	log.Println("=== KẾT THÚC RECALCULATE TẤT CẢ WALLETS ===")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đã tính toán lại tất cả wallets thành công",
	})
}

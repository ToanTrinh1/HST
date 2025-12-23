package routes

import (
	"fullstack-backend/internal/api/handlers"

	"github.com/gin-gonic/gin"
)

// setupWalletRoutes thiết lập các routes liên quan đến wallet (rút tiền)
func setupWalletRoutes(api *gin.RouterGroup, handler *handlers.WalletHandler) {
	wallets := api.Group("/wallets")
	{
		// Protected routes - cần JWT token
		wallets.GET("", handler.GetAllWallets)                           // Lấy danh sách tất cả wallets
		wallets.POST("/recalculate-all", handler.RecalculateAllWallets)  // Tính toán lại tất cả wallets từ dữ liệu thực tế
		wallets.POST("/:user_id/recalculate", handler.RecalculateWallet) // Tính toán lại wallet cho một user cụ thể
	}
}

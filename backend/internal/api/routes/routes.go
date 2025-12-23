package routes

import (
	"fullstack-backend/internal/api/handlers"

	"github.com/gin-gonic/gin"
)

// SetupRoutes khởi tạo tất cả routes cho application
func SetupRoutes(
	router *gin.Engine,
	authHandler *handlers.AuthHandler,
	betReceiptHandler *handlers.BetReceiptHandler,
	walletHandler *handlers.WalletHandler,
	depositHandler *handlers.DepositHandler,
	withdrawalHandler *handlers.WithdrawalHandler,
) {
	// API group - prefix /api cho tất cả endpoints
	api := router.Group("/api")

	// Setup routes theo từng module
	setupAuthRoutes(api, authHandler)
	setupDonHangRoutes(api, betReceiptHandler)
	setupWalletRoutes(api, walletHandler)
	setupDepositRoutes(api, depositHandler)
	setupWithdrawalRoutes(api, withdrawalHandler)

	// TODO: Thêm các routes khác ở đây khi phát triển
	// setupUserRoutes(api, userHandler)
	// setupProductRoutes(api, productHandler)
}

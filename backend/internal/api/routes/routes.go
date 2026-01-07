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
	historyHandler *handlers.BetReceiptHistoryHandler,
) {
	// API group - prefix /api cho tất cả endpoints
	api := router.Group("/api")

	// Health check endpoint
	api.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "HST API",
		})
	})

	// Setup routes theo từng module
	setupAuthRoutes(api, authHandler)
	setupDonHangRoutes(api, betReceiptHandler)
	setupWalletRoutes(api, walletHandler)
	setupDepositRoutes(api, depositHandler)
	setupWithdrawalRoutes(api, withdrawalHandler)
	SetupBetReceiptHistoryRoutes(api, historyHandler)

	// TODO: Thêm các routes khác ở đây khi phát triển
	// setupUserRoutes(api, userHandler)
	// setupProductRoutes(api, productHandler)
}

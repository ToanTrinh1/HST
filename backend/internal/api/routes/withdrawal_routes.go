package routes

import (
	"fullstack-backend/internal/api/handlers"

	"github.com/gin-gonic/gin"
)

// setupWithdrawalRoutes thiết lập các routes liên quan đến rút tiền (withdrawal)
func setupWithdrawalRoutes(api *gin.RouterGroup, handler *handlers.WithdrawalHandler) {
	withdrawals := api.Group("/withdrawals")
	{
		// Protected routes - cần JWT token
		withdrawals.POST("", handler.CreateWithdrawal)  // Rút tiền
		withdrawals.GET("", handler.GetAllWithdrawals)  // Lấy tất cả lịch sử rút tiền
	}
}


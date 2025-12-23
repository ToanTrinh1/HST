package routes

import (
	"fullstack-backend/internal/api/handlers"

	"github.com/gin-gonic/gin"
)

// setupDepositRoutes thiết lập các routes liên quan đến nạp tiền (deposit)
func setupDepositRoutes(api *gin.RouterGroup, handler *handlers.DepositHandler) {
	deposits := api.Group("/deposits")
	{
		// Protected routes - cần JWT token
		deposits.POST("", handler.CreateDeposit)        // Nạp tiền
		deposits.GET("", handler.GetAllDeposits)        // Lấy tất cả lịch sử nạp tiền
	}
}


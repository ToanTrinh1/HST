package routes

import (
	"fullstack-backend/internal/api/handlers"

	"github.com/gin-gonic/gin"
)

// setupDonHangRoutes thiết lập các routes liên quan đến đơn hàng (thông tin nhận kèo)
func setupDonHangRoutes(api *gin.RouterGroup, handler *handlers.BetReceiptHandler) {
	betReceipts := api.Group("/bet-receipts")
	{
		// Protected routes - cần JWT token
		betReceipts.POST("", handler.CreateBetReceipt)                   // Tạo đơn hàng mới
		betReceipts.GET("", handler.GetAllBetReceipts)                   // Lấy danh sách đơn hàng
		betReceipts.GET("/:id", handler.GetBetReceiptByID)               // Lấy thông tin đơn hàng theo ID
		betReceipts.PATCH("/:id/status", handler.UpdateBetReceiptStatus) // Cập nhật status đơn hàng (tự động tính Công thực nhận khi DONE)

		// TODO: Thêm các endpoints khác khi cần
		// betReceipts.PUT("/:id", handler.UpdateBetReceipt)
		// betReceipts.DELETE("/:id", handler.DeleteBetReceipt)
	}
}

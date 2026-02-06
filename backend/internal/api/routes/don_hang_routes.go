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
		betReceipts.POST("/parse-link", handler.ParseOrderLink)                         // Parse link dailiantong.com để lấy thông tin đơn hàng
		betReceipts.POST("", handler.CreateBetReceipt)                                  // Tạo đơn hàng mới
		betReceipts.GET("", handler.GetAllBetReceipts)                                  // Lấy danh sách đơn hàng
		betReceipts.GET("/current-exchange-rate", handler.GetCurrentExchangeRate)       // Lấy tỷ giá hiện tại (cần auth, trả về đủ config)
		betReceipts.GET("/public-exchange-rate", handler.GetPublicExchangeRate)         // Tỷ giá công khai cho UI user (không auth, chỉ exchange_rate)
		betReceipts.GET("/public-user-fee-config", handler.GetPublicUserFeeConfig)      // Config tính tiền user (tỷ giá + phí rút tiền %, phí trung gian %, bảng phí web) cho màn CÔNG THỨC TÍNH TIỀN
		betReceipts.GET("/top-5-monthly", handler.GetTop5UsersByMonthlyReceivedAmount)  // Lấy top 5 users theo số tiền đã nhận trong tháng (phải đặt trước /:id)
		betReceipts.GET("/monthly-total", handler.GetMonthlyTotalByUserID)              // Tính tổng số tiền đã nhận theo tháng cho user hiện tại (phải đặt trước /:id)
		betReceipts.GET("/admin-profit-by-month", handler.GetAdminProfitByMonth)        // Lợi nhuận admin theo tháng (chỉ admin)
		betReceipts.GET("/admin-profit-stats", handler.GetAdminProfitStatsByAdmin)      // Thống kê & lợi nhuận theo admin (chỉ admin)
		betReceipts.GET("/:id", handler.GetBetReceiptByID)                              // Lấy thông tin đơn hàng theo ID
		betReceipts.PATCH("/:id/status", handler.UpdateBetReceiptStatus)                // Cập nhật status đơn hàng (tự động tính Công thực nhận khi DONE)
		betReceipts.PUT("/:id", handler.UpdateBetReceipt)                               // Cập nhật các trường thông thường của đơn hàng (không phải status)
		betReceipts.DELETE("/:id", handler.DeleteBetReceipt)                            // Xóa đơn hàng
		betReceipts.POST("/update-config", handler.UpdateConfig)                        // Cập nhật config: tỷ giá trả, nhận, phí web %, admin giữ %, phí rút tiền, phí trung gian, bảng phí web
		betReceipts.POST("/:id/recalculate-amount", handler.RecalculateActualAmountCNY) // Tính lại tệ cho đơn hàng đã xử lý
	}
}

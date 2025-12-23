package handlers

import (
	"fullstack-backend/internal/models"
	"fullstack-backend/internal/service"
	"fullstack-backend/pkg/utils"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type WithdrawalHandler struct {
	withdrawalService *service.WithdrawalService
	jwtSecret         string
}

func NewWithdrawalHandler(withdrawalService *service.WithdrawalService, jwtSecret string) *WithdrawalHandler {
	return &WithdrawalHandler{
		withdrawalService: withdrawalService,
		jwtSecret:         jwtSecret,
	}
}

// CreateWithdrawal xử lý rút tiền
func (h *WithdrawalHandler) CreateWithdrawal(c *gin.Context) {
	var req models.CreateWithdrawalRequest

	log.Println("=== BẮT ĐẦU XỬ LÝ RÚT TIỀN ===")

	// Parse request body
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	log.Printf("📝 Thông tin rút tiền - Tên người dùng: %s, Số tiền VND: %.2f", req.UserName, req.AmountVND)

	// Kiểm tra quyền admin (từ JWT token)
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Yêu cầu xác thực",
		})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Định dạng token không hợp lệ",
		})
		return
	}

	claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Token không hợp lệ hoặc đã hết hạn",
		})
		return
	}

	log.Printf("🔍 Người rút tiền - User ID: %s", claims.UserID)

	// Gọi service để xử lý logic
	withdrawal, err := h.withdrawalService.CreateWithdrawal(&req)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ RÚT TIỀN THẤT BẠI: %s", errorMsg)

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ RÚT TIỀN THÀNH CÔNG - ID: %s, UserID: %s, AmountVND: %.2f",
		withdrawal.ID, withdrawal.UserID, withdrawal.AmountVND)
	log.Println("=== KẾT THÚC XỬ LÝ RÚT TIỀN ===\n")

	// Trả response thành công
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    withdrawal,
	})
}

// GetAllWithdrawals lấy tất cả lịch sử rút tiền
func (h *WithdrawalHandler) GetAllWithdrawals(c *gin.Context) {
	log.Println("=== BẮT ĐẦU LẤY DANH SÁCH LỊCH SỬ RÚT TIỀN ===")

	// Kiểm tra quyền admin (từ JWT token)
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Yêu cầu xác thực",
		})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Định dạng token không hợp lệ",
		})
		return
	}

	_, err := utils.ValidateJWT(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Token không hợp lệ hoặc đã hết hạn",
		})
		return
	}

	// Gọi service để lấy danh sách
	withdrawals, err := h.withdrawalService.GetAllWithdrawals()
	if err != nil {
		log.Printf("❌ LỖI LẤY DANH SÁCH RÚT TIỀN: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi lấy danh sách lịch sử rút tiền",
		})
		return
	}

	log.Printf("✅ Đã lấy %d lịch sử rút tiền", len(withdrawals))
	log.Println("=== KẾT THÚC LẤY DANH SÁCH LỊCH SỬ RÚT TIỀN ===\n")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    withdrawals,
	})
}


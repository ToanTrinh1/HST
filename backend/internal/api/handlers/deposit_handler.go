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

type DepositHandler struct {
	depositService *service.DepositService
	jwtSecret      string
}

func NewDepositHandler(depositService *service.DepositService, jwtSecret string) *DepositHandler {
	return &DepositHandler{
		depositService: depositService,
		jwtSecret:      jwtSecret,
	}
}

// CreateDeposit xử lý nạp tiền
func (h *DepositHandler) CreateDeposit(c *gin.Context) {
	var req models.CreateDepositRequest

	log.Println("=== BẮT ĐẦU XỬ LÝ NẠP TIỀN ===")

	// Parse request body
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	log.Printf("📝 Thông tin nạp tiền - Tên người dùng: %s, Số tiền VND: %.2f", req.UserName, req.AmountVND)

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

	log.Printf("🔍 Người nạp tiền - User ID: %s", claims.UserID)

	// Gọi service để xử lý logic
	deposit, err := h.depositService.CreateDeposit(&req)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ NẠP TIỀN THẤT BẠI: %s", errorMsg)

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ NẠP TIỀN THÀNH CÔNG - ID: %s, UserID: %s, AmountVND: %.2f",
		deposit.ID, deposit.UserID, deposit.AmountVND)
	log.Println("=== KẾT THÚC XỬ LÝ NẠP TIỀN ===\n")

	// Trả response thành công
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    deposit,
	})
}

// GetAllDeposits lấy tất cả lịch sử nạp tiền
func (h *DepositHandler) GetAllDeposits(c *gin.Context) {
	log.Println("=== BẮT ĐẦU LẤY DANH SÁCH LỊCH SỬ NẠP TIỀN ===")

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
	deposits, err := h.depositService.GetAllDeposits()
	if err != nil {
		log.Printf("❌ LỖI LẤY DANH SÁCH NẠP TIỀN: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi lấy danh sách lịch sử nạp tiền",
		})
		return
	}

	log.Printf("✅ Đã lấy %d lịch sử nạp tiền", len(deposits))
	log.Println("=== KẾT THÚC LẤY DANH SÁCH LỊCH SỬ NẠP TIỀN ===\n")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    deposits,
	})
}

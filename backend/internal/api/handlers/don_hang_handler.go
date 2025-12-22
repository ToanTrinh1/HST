package handlers

// Xử lý các request liên quan đến đơn hàng (thông tin nhận kèo)
import (
	"fullstack-backend/internal/models"
	"fullstack-backend/internal/service"
	"fullstack-backend/pkg/utils"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type BetReceiptHandler struct {
	betReceiptService *service.BetReceiptService
	jwtSecret         string
}

func NewBetReceiptHandler(betReceiptService *service.BetReceiptService, jwtSecret string) *BetReceiptHandler {
	return &BetReceiptHandler{
		betReceiptService: betReceiptService,
		jwtSecret:         jwtSecret,
	}
}

// CreateBetReceipt xử lý tạo đơn hàng mới
func (h *BetReceiptHandler) CreateBetReceipt(c *gin.Context) {
	var req models.CreateBetReceiptRequest

	log.Println("=== BẮT ĐẦU XỬ LÝ TẠO ĐƠN HÀNG ===")

	// Parse request body
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	log.Printf("📝 Thông tin đơn hàng - Tên người dùng: %s, Nhiệm vụ: %s, Loại kèo: %s", req.UserName, req.TaskCode, req.BetType)

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

	// TODO: Kiểm tra role là admin (có thể cần thêm middleware)
	log.Printf("🔍 Người tạo đơn hàng - User ID: %s", claims.UserID)

	// Gọi service để xử lý logic
	betReceipt, err := h.betReceiptService.CreateBetReceipt(&req)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ TẠO ĐƠN HÀNG THẤT BẠI: %s", errorMsg)

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ TẠO ĐƠN HÀNG THÀNH CÔNG - ID: %s, STT: %d", betReceipt.ID, betReceipt.STT)
	log.Println("=== KẾT THÚC XỬ LÝ TẠO ĐƠN HÀNG ===\n")

	// Trả response thành công
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    betReceipt,
	})
}

// GetAllBetReceipts lấy danh sách tất cả đơn hàng
func (h *BetReceiptHandler) GetAllBetReceipts(c *gin.Context) {
	log.Println("=== BẮT ĐẦU LẤY DANH SÁCH ĐƠN HÀNG ===")

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

	// Gọi service
	betReceipts, err := h.betReceiptService.GetAllBetReceipts(limit, offset)
	if err != nil {
		log.Printf("❌ LỖI LẤY DANH SÁCH ĐƠN HÀNG: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi lấy danh sách đơn hàng",
		})
		return
	}

	log.Printf("✅ LẤY DANH SÁCH ĐƠN HÀNG THÀNH CÔNG - Số lượng: %d", len(betReceipts))
	if len(betReceipts) > 0 {
		log.Printf("🔍 Mẫu dữ liệu đầu tiên - ID: %s, STT: %d, UserID: %s, UserName: %s", 
			betReceipts[0].ID, betReceipts[0].STT, betReceipts[0].UserID, betReceipts[0].UserName)
	}
	log.Println("=== KẾT THÚC LẤY DANH SÁCH ĐƠN HÀNG ===\n")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    betReceipts,
	})
}

// GetBetReceiptByID lấy thông tin đơn hàng theo ID
func (h *BetReceiptHandler) GetBetReceiptByID(c *gin.Context) {
	id := c.Param("id")
	log.Printf("=== BẮT ĐẦU LẤY ĐƠN HÀNG THEO ID: %s ===", id)

	betReceipt, err := h.betReceiptService.GetBetReceiptByID(id)
	if err != nil {
		log.Printf("❌ LỖI LẤY ĐƠN HÀNG: %v", err)
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Không tìm thấy đơn hàng",
		})
		return
	}

	log.Printf("✅ LẤY ĐƠN HÀNG THÀNH CÔNG - ID: %s", betReceipt.ID)
	log.Println("=== KẾT THÚC LẤY ĐƠN HÀNG ===\n")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    betReceipt,
	})
}


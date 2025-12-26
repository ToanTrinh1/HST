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

	// Lấy user_id từ JWT token
	var userID *string
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString != authHeader {
			claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
			if err == nil {
				// Nếu role là "admin", không filter (userID = nil) để thấy tất cả
				// Nếu role là "user", filter theo user_id để chỉ thấy của mình
				if claims.Role != "admin" {
					userID = &claims.UserID
					log.Printf("🔍 User role - Filtering by user_id: %s (role: %s)", claims.UserID, claims.Role)
				} else {
					log.Printf("🔍 Admin role - Showing all receipts (user_id: %s, role: %s)", claims.UserID, claims.Role)
				}
			} else {
				log.Printf("❌ Lỗi validate JWT token: %v", err)
			}
		} else {
			log.Printf("❌ Token không có prefix 'Bearer '")
		}
	} else {
		log.Printf("❌ Không có Authorization header")
	}

	// Gọi service
	betReceipts, err := h.betReceiptService.GetAllBetReceipts(limit, offset, userID)
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

// UpdateBetReceiptStatus cập nhật status của đơn hàng
// Khi status = "DONE", tự động tính "Công thực nhận" (ActualAmountCNY)
func (h *BetReceiptHandler) UpdateBetReceiptStatus(c *gin.Context) {
	id := c.Param("id")
	log.Printf("=== BẮT ĐẦU CẬP NHẬT STATUS ĐƠN HÀNG ID: %s ===", id)

	var req models.UpdateBetReceiptStatusRequest

	// Parse request body
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	log.Printf("📝 Cập nhật status - ID: %s, Status mới: %s", id, req.Status)

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

	log.Printf("🔍 Người cập nhật status - User ID: %s", claims.UserID)

	// Gọi service để xử lý logic (truyền userID để ghi log)
	betReceipt, err := h.betReceiptService.UpdateBetReceiptStatus(id, &req, &claims.UserID)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ CẬP NHẬT STATUS THẤT BẠI: %s", errorMsg)

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ CẬP NHẬT STATUS THÀNH CÔNG - ID: %s, Status: %s, Công thực nhận: %.2f",
		betReceipt.ID, betReceipt.Status, betReceipt.ActualAmountCNY)
	log.Println("=== KẾT THÚC CẬP NHẬT STATUS ===\n")

	// Trả response thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    betReceipt,
	})
}

// UpdateBetReceipt cập nhật các trường thông thường của đơn hàng (không phải status)
func (h *BetReceiptHandler) UpdateBetReceipt(c *gin.Context) {
	id := c.Param("id")
	log.Printf("=== BẮT ĐẦU CẬP NHẬT ĐƠN HÀNG ID: %s ===", id)

	var req models.UpdateBetReceiptRequest

	// Parse request body
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	log.Printf("📝 Cập nhật đơn hàng - ID: %s", id)

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

	log.Printf("🔍 Người cập nhật đơn hàng - User ID: %s", claims.UserID)

	// Gọi service để xử lý logic (truyền userID để ghi log)
	betReceipt, err := h.betReceiptService.UpdateBetReceipt(id, &req, &claims.UserID)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ CẬP NHẬT ĐƠN HÀNG THẤT BẠI: %s", errorMsg)

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ CẬP NHẬT ĐƠN HÀNG THÀNH CÔNG - ID: %s", betReceipt.ID)
	log.Println("=== KẾT THÚC CẬP NHẬT ĐƠN HÀNG ===\n")

	// Trả response thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    betReceipt,
	})
}

// DeleteBetReceipt xóa đơn hàng
func (h *BetReceiptHandler) DeleteBetReceipt(c *gin.Context) {
	id := c.Param("id")
	log.Printf("=== BẮT ĐẦU XÓA ĐƠN HÀNG ID: %s ===", id)

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

	log.Printf("🔍 Người xóa đơn hàng - User ID: %s", claims.UserID)

	// Gọi service để xử lý logic (truyền userID để ghi log)
	err = h.betReceiptService.DeleteBetReceipt(id, &claims.UserID)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ XÓA ĐƠN HÀNG THẤT BẠI: %s", errorMsg)

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ XÓA ĐƠN HÀNG THÀNH CÔNG - ID: %s", id)
	log.Println("=== KẾT THÚC XÓA ĐƠN HÀNG ===\n")

	// Trả response thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đã xóa đơn hàng thành công",
	})
}

// UpdateExchangeRateForProcessedOrders cập nhật tỷ giá cho tất cả đơn hàng đã xử lí (DONE, HỦY BỎ, ĐỀN)
func (h *BetReceiptHandler) UpdateExchangeRateForProcessedOrders(c *gin.Context) {
	log.Println("=== BẮT ĐẦU CẬP NHẬT TỶ GIÁ CHO ĐƠN HÀNG ĐÃ XỬ LÍ ===")

	// Kiểm tra quyền admin
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

	// TODO: Kiểm tra role là admin
	log.Printf("🔍 Người thực hiện - User ID: %s", claims.UserID)

	// Parse request body
	var req struct {
		ExchangeRate float64 `json:"exchange_rate" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	// Validation: Tỷ giá phải > 0
	if req.ExchangeRate <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Tỷ giá phải lớn hơn 0",
		})
		return
	}

	log.Printf("📝 Tỷ giá mới: %.2f", req.ExchangeRate)

	// Gọi service để cập nhật tỷ giá
	if err := h.betReceiptService.UpdateExchangeRateForProcessedOrders(req.ExchangeRate); err != nil {
		log.Printf("❌ CẬP NHẬT TỶ GIÁ THẤT BẠI: %s", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi cập nhật tỷ giá: " + err.Error(),
		})
		return
	}

	log.Printf("✅ CẬP NHẬT TỶ GIÁ THÀNH CÔNG")
	log.Println("=== KẾT THÚC CẬP NHẬT TỶ GIÁ ===\n")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đã cập nhật tỷ giá thành công. Tỷ giá mới sẽ được áp dụng cho các đơn hàng mới được tạo từ bây giờ.",
	})
}

// GetCurrentExchangeRate lấy tỷ giá hiện tại
func (h *BetReceiptHandler) GetCurrentExchangeRate(c *gin.Context) {
	log.Println("=== BẮT ĐẦU LẤY TỶ GIÁ HIỆN TẠI ===")

	// Kiểm tra quyền admin
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

	log.Printf("🔍 Người yêu cầu - User ID: %s", claims.UserID)

	// Gọi service để lấy tỷ giá hiện tại
	exchangeRate, err := h.betReceiptService.GetCurrentExchangeRate()
	if err != nil {
		log.Printf("❌ LẤY TỶ GIÁ THẤT BẠI: %s", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi lấy tỷ giá hiện tại: " + err.Error(),
		})
		return
	}

	log.Printf("✅ LẤY TỶ GIÁ THÀNH CÔNG: %.2f", exchangeRate)
	log.Println("=== KẾT THÚC LẤY TỶ GIÁ ===\n")

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"exchange_rate": exchangeRate,
	})
}

// RecalculateActualAmountCNY tính lại "Công thực nhận" (ActualAmountCNY) cho một đơn hàng đã xử lý
func (h *BetReceiptHandler) RecalculateActualAmountCNY(c *gin.Context) {
	id := c.Param("id")
	log.Printf("=== BẮT ĐẦU TÍNH LẠI TỆ CHO ĐƠN HÀNG ID: %s ===", id)

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

	log.Printf("🔍 Người tính lại tệ - User ID: %s", claims.UserID)

	// Gọi service để tính lại tệ
	betReceipt, err := h.betReceiptService.RecalculateActualAmountCNY(id)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ TÍNH LẠI TỆ THẤT BẠI: %s", errorMsg)

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ TÍNH LẠI TỆ THÀNH CÔNG - ID: %s, Công thực nhận: %.2f",
		betReceipt.ID, betReceipt.ActualAmountCNY)
	log.Println("=== KẾT THÚC TÍNH LẠI TỆ ===\n")

	// Trả response thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    betReceipt,
		"message": "Đã tính lại tệ thành công",
	})
}

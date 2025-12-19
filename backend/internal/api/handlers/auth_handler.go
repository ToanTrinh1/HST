package handlers

// Xử lí đăng nhập đăng kí  trả về Json response
import (
	"fullstack-backend/internal/models"
	"fullstack-backend/internal/service"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Register xử lý đăng ký user mới
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest

	log.Println("=== BẮT ĐẦU XỬ LÝ ĐĂNG KÝ ===")

	// Parse request body
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	// Log thông tin đăng ký (không log password)
	log.Printf("📝 Thông tin đăng ký - Email: %s, Name: %s", req.Email, req.Name)

	// Gọi service để xử lý logic
	response, err := h.authService.Register(&req)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ ĐĂNG KÝ THẤT BẠI: %s", errorMsg)

		// Phân loại lỗi
		if errorMsg == "Email đã tồn tại trong hệ thống" {
			log.Printf("   → Lý do: Email %s đã được đăng ký trước đó", req.Email)
		}

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ ĐĂNG KÝ THÀNH CÔNG - User ID: %s, Email: %s", response.User.ID, response.User.Email)
	log.Println("=== KẾT THÚC XỬ LÝ ĐĂNG KÝ ===\n")

	// Trả response thành công
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    response,
	})
}

// Login xử lý đăng nhập
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest

	log.Println("=== BẮT ĐẦU XỬ LÝ ĐĂNG NHẬP ===")

	// Parse request body
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	log.Printf("📝 Thông tin đăng nhập - Email: %s", req.Email)

	// Gọi service để xử lý logic
	response, err := h.authService.Login(&req)
	if err != nil {
		log.Printf("❌ ĐĂNG NHẬP THẤT BẠI: %s", err.Error())
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	log.Printf("✅ ĐĂNG NHẬP THÀNH CÔNG - User ID: %s, Email: %s", response.User.ID, response.User.Email)
	log.Println("=== KẾT THÚC XỬ LÝ ĐĂNG NHẬP ===\n")

	// Trả response thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

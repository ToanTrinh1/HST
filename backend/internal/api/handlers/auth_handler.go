package handlers

// Xử lí đăng nhập đăng kí  trả về Json response
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

type AuthHandler struct {
	authService *service.AuthService
	jwtSecret   string
}

func NewAuthHandler(authService *service.AuthService, jwtSecret string) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		jwtSecret:   jwtSecret,
	}
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

	log.Printf("✅ ĐĂNG NHẬP THÀNH CÔNG - User ID: %s, Email: %s, VaiTro: %s", response.User.ID, response.User.Email, response.User.Role)
	log.Printf("🔍 DEBUG - User struct Role field: %s", response.User.Role)
	log.Printf("🔍 DEBUG - User struct fields: ID=%s, Email=%s, Name=%s, Role=%s", response.User.ID, response.User.Email, response.User.Name, response.User.Role)
	log.Println("=== KẾT THÚC XỬ LÝ ĐĂNG NHẬP ===\n")

	// Trả response thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// GetCurrentUser lấy thông tin user hiện tại từ JWT token
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	// Lấy token từ header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Authorization header required",
		})
		return
	}

	// Parse Bearer token
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Invalid authorization format",
		})
		return
	}

	// Validate JWT token
	claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Invalid or expired token",
		})
		return
	}

	// Lấy user từ database (để đảm bảo có thông tin mới nhất, kể cả khi role đã thay đổi)
	user, err := h.authService.GetCurrentUser(claims.UserID)
	if err != nil {
		log.Printf("❌ Lỗi khi lấy user: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get user information",
		})
		return
	}

	log.Printf("✅ GetCurrentUser - User ID: %s, Email: %s, VaiTro: %s", user.ID, user.Email, user.Role)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
	})
}

// GetAllUsers lấy danh sách tất cả users (chỉ role = 'user')
func (h *AuthHandler) GetAllUsers(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "1000")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 1000
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	users, err := h.authService.GetAllUsers(limit, offset)
	if err != nil {
		log.Printf("❌ Lỗi khi lấy danh sách users: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi lấy danh sách users",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    users,
	})
}

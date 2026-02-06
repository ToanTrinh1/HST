package handlers

// Xử lí đăng nhập đăng kí  trả về Json response
import (
	"context"
	"fullstack-backend/internal/models"
	"fullstack-backend/internal/service"
	"fullstack-backend/internal/storage"
	"fullstack-backend/pkg/utils"
	"log"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *service.AuthService
	storage     storage.Storage
	jwtSecret   string
}

func NewAuthHandler(authService *service.AuthService, store storage.Storage, jwtSecret string) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		storage:     store,
		jwtSecret:   jwtSecret,
	}
}

// applyPresignUser: avatar_url trong DB là path proxy (uploads/avatar/xxx), trả nguyên để frontend ghép baseURL.
func (h *AuthHandler) applyPresignUser(user *models.User) *models.User {
	if user == nil {
		return nil
	}
	return user
}

// ServeAvatar phục vụ ảnh avatar qua API (proxy từ MinIO/local) — GET /api/uploads/avatar/:filename
func (h *AuthHandler) ServeAvatar(c *gin.Context) {
	filename := c.Param("filename")
	if filename == "" || strings.Contains(filename, "..") || strings.ContainsAny(filename, "/\\") {
		c.Status(http.StatusBadRequest)
		return
	}
	reader, size, contentType, err := h.storage.GetObject(c.Request.Context(), filename)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	defer reader.Close()
	c.DataFromReader(http.StatusOK, size, contentType, reader, nil)
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
	log.Printf("📝 Thông tin đăng ký - Email: %s, Name: %s, Phone: %s", req.Email, req.Name, req.PhoneNumber)

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

	respCopy := *response
	respCopy.User = h.applyPresignUser(response.User)
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    respCopy,
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

	log.Printf("📝 Thông tin đăng nhập - Email hoặc Số điện thoại: %s", req.EmailOrPhone)

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

	respCopy := *response
	respCopy.User = h.applyPresignUser(response.User)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    respCopy,
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

	out := h.applyPresignUser(user)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
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
	out := make([]*models.User, len(users))
	for i, u := range users {
		out[i] = h.applyPresignUser(u)
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}

// UpdateProfile cập nhật thông tin profile của user hiện tại
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	log.Println("=== BẮT ĐẦU XỬ LÝ CẬP NHẬT PROFILE ===")

	// 1. Lấy token từ header để xác định user
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

	// 2. Parse request body
	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	log.Printf("📝 Thông tin cập nhật - User ID: %s, Name: %s (Email không được phép thay đổi)", claims.UserID, req.Name)

	// 3. Gọi service để cập nhật
	updatedUser, err := h.authService.UpdateProfile(claims.UserID, &req)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ CẬP NHẬT PROFILE THẤT BẠI: %s", errorMsg)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ CẬP NHẬT PROFILE THÀNH CÔNG - User ID: %s, Name: %s, Email: %s", updatedUser.ID, updatedUser.Name, updatedUser.Email)
	log.Println("=== KẾT THÚC XỬ LÝ CẬP NHẬT PROFILE ===\n")

	out := h.applyPresignUser(updatedUser)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}

// ChangePassword đổi mật khẩu của user hiện tại
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	log.Println("=== BẮT ĐẦU XỬ LÝ ĐỔI MẬT KHẨU ===")

	// 1. Lấy token từ header để xác định user
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

	// 2. Parse request body
	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	log.Printf("📝 Đổi mật khẩu - User ID: %s", claims.UserID)

	// 3. Gọi service để đổi mật khẩu
	err = h.authService.ChangePassword(claims.UserID, &req)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ ĐỔI MẬT KHẨU THẤT BẠI: %s", errorMsg)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ ĐỔI MẬT KHẨU THÀNH CÔNG - User ID: %s", claims.UserID)
	log.Println("=== KẾT THÚC XỬ LÝ ĐỔI MẬT KHẨU ===\n")

	// 4. Trả response thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đổi mật khẩu thành công",
	})
}

// UploadAvatar xử lý upload ảnh đại diện
func (h *AuthHandler) UploadAvatar(c *gin.Context) {
	log.Println("=== BẮT ĐẦU XỬ LÝ UPLOAD AVATAR ===")

	// 1. Lấy token từ header để xác định user
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

	// 2. Parse multipart form (file upload)
	file, err := c.FormFile("avatar")
	if err != nil {
		log.Printf("❌ Lỗi khi lấy file: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Không tìm thấy file ảnh. Vui lòng chọn file.",
		})
		return
	}

	// 3. Validate file type
	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/jpg":  true,
		"image/png":  true,
		"image/gif":  true,
	}
	if !allowedTypes[file.Header.Get("Content-Type")] {
		log.Printf("❌ File type không hợp lệ: %s", file.Header.Get("Content-Type"))
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Chỉ chấp nhận file ảnh (JPEG, PNG, GIF)",
		})
		return
	}

	// 4. Validate file size (max 5MB)
	maxSize := int64(5 * 1024 * 1024) // 5MB
	if file.Size > maxSize {
		log.Printf("❌ File quá lớn: %d bytes", file.Size)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "File ảnh không được vượt quá 5MB",
		})
		return
	}

	// 5. Tạo tên file unique (userID_timestamp.extension) — bucket avatar riêng nên không cần prefix
	ext := filepath.Ext(file.Filename)
	filename := claims.UserID + "_" + strconv.FormatInt(time.Now().Unix(), 10) + ext
	objectKey := filename

	// 6. Mở file và upload qua storage (MinIO hoặc local)
	opened, err := file.Open()
	if err != nil {
		log.Printf("❌ Lỗi mở file: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Lỗi khi đọc file"})
		return
	}
	defer opened.Close()

	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}
	_, err = h.storage.Upload(context.Background(), objectKey, opened, file.Size, contentType)
	if err != nil {
		log.Printf("❌ Lỗi upload avatar: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi lưu ảnh",
		})
		return
	}

	// 7. Lưu path proxy vào DB — frontend truy cập qua GET /api/uploads/avatar/:filename
	proxyPath := "uploads/avatar/" + filename
	updatedUser, err := h.authService.UpdateAvatar(claims.UserID, proxyPath)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ CẬP NHẬT AVATAR THẤT BẠI: %s", errorMsg)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ UPLOAD AVATAR THÀNH CÔNG - User ID: %s, Avatar path: %s", claims.UserID, proxyPath)
	log.Println("=== KẾT THÚC XỬ LÝ UPLOAD AVATAR ===\n")

	out := h.applyPresignUser(updatedUser)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
		"message": "Cập nhật ảnh đại diện thành công",
	})
}

// SendVerificationCode xử lý gửi mã xác thực email
func (h *AuthHandler) SendVerificationCode(c *gin.Context) {
	var req models.SendVerificationCodeRequest

	log.Println("=== BẮT ĐẦU XỬ LÝ GỬI MÃ XÁC THỰC ===")

	// Parse request body
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	log.Printf("📝 Gửi mã xác thực cho email: %s", req.Email)

	// Gọi service để xử lý logic
	err := h.authService.SendVerificationCode(req.Email)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ GỬI MÃ XÁC THỰC THẤT BẠI: %s", errorMsg)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ GỬI MÃ XÁC THỰC THÀNH CÔNG - Email: %s", req.Email)
	log.Println("=== KẾT THÚC XỬ LÝ GỬI MÃ XÁC THỰC ===\n")

	// Trả response thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Mã xác thực đã được gửi đến email của bạn",
	})
}

// VerifyEmailCode xử lý xác thực mã OTP
func (h *AuthHandler) VerifyEmailCode(c *gin.Context) {
	var req models.VerifyEmailCodeRequest

	log.Println("=== BẮT ĐẦU XỬ LÝ XÁC THỰC MÃ OTP ===")

	// Parse request body
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	log.Printf("📝 Xác thực mã OTP cho email: %s", req.Email)

	// Gọi service để xử lý logic
	err := h.authService.VerifyEmailCode(req.Email, req.Code)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ XÁC THỰC MÃ OTP THẤT BẠI: %s", errorMsg)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ XÁC THỰC MÃ OTP THÀNH CÔNG - Email: %s", req.Email)
	log.Println("=== KẾT THÚC XỬ LÝ XÁC THỰC MÃ OTP ===\n")

	// Trả response thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Email đã được xác thực thành công",
	})
}

// ForgotPassword xử lý quên mật khẩu
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req models.ForgotPasswordRequest

	log.Println("=== BẮT ĐẦU XỬ LÝ QUÊN MẬT KHẨU ===")

	// Parse request body
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	log.Printf("📝 Xử lý quên mật khẩu cho email: %s", req.Email)

	// Gọi service để xử lý logic
	err := h.authService.ForgotPassword(req.Email)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ QUÊN MẬT KHẨU THẤT BẠI: %s", errorMsg)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ QUÊN MẬT KHẨU THÀNH CÔNG - Email: %s", req.Email)
	log.Println("=== KẾT THÚC XỬ LÝ QUÊN MẬT KHẨU ===\n")

	// Trả response thành công (luôn trả success để tránh email enumeration)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Nếu email tồn tại, link đặt lại mật khẩu đã được gửi đến email của bạn",
	})
}

// ResetPassword xử lý đặt lại mật khẩu
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req models.ResetPasswordRequest

	log.Println("=== BẮT ĐẦU XỬ LÝ ĐẶT LẠI MẬT KHẨU ===")

	// Parse request body
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	log.Printf("📝 Xử lý đặt lại mật khẩu cho email: %s", req.Email)

	// Gọi service để xử lý logic
	err := h.authService.ResetPassword(req.Email, req.Token, req.NewPassword)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ ĐẶT LẠI MẬT KHẨU THẤT BẠI: %s", errorMsg)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ ĐẶT LẠI MẬT KHẨU THÀNH CÔNG - Email: %s", req.Email)
	log.Println("=== KẾT THÚC XỬ LÝ ĐẶT LẠI MẬT KHẨU ===\n")

	// Trả response thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.",
	})
}

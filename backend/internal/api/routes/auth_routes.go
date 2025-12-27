package routes

import (
	"fullstack-backend/internal/api/handlers"

	"github.com/gin-gonic/gin"
)

// setupAuthRoutes thiết lập các routes liên quan đến authentication
func setupAuthRoutes(api *gin.RouterGroup, handler *handlers.AuthHandler) {
	auth := api.Group("/auth")
	{
		// Public routes - không cần authentication
		auth.POST("/register", handler.Register)
		auth.POST("/login", handler.Login)
		auth.POST("/send-verification-code", handler.SendVerificationCode)
		auth.POST("/verify-email-code", handler.VerifyEmailCode)
		auth.POST("/forgot-password", handler.ForgotPassword)

		// Protected routes - cần JWT token
		auth.GET("/me", handler.GetCurrentUser)        // Lấy thông tin user hiện tại
		auth.PUT("/me", handler.UpdateProfile)        // Cập nhật thông tin profile
		auth.PUT("/change-password", handler.ChangePassword) // Đổi mật khẩu
		auth.POST("/upload-avatar", handler.UploadAvatar) // Upload ảnh đại diện
		auth.GET("/users", handler.GetAllUsers)        // Lấy danh sách tất cả users (role = 'user')

		// TODO: Thêm các auth endpoints khác khi cần
		// auth.POST("/logout", handler.Logout)
		// auth.POST("/refresh-token", handler.RefreshToken)
		// auth.POST("/forgot-password", handler.ForgotPassword)
		// auth.POST("/reset-password", handler.ResetPassword)
		// auth.POST("/verify-email", handler.VerifyEmail)
	}
}

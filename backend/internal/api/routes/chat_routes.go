package routes

import (
	"fullstack-backend/internal/api/handlers"

	"github.com/gin-gonic/gin"
)

func setupChatRoutes(api *gin.RouterGroup, handler *handlers.ChatHandler) {
	chat := api.Group("/chat")
	{
		chat.GET("/admins", handler.ListAdmins)
		chat.GET("/threads", handler.ListThreads)
		chat.GET("/messages", handler.ListMessages)
		chat.POST("/upload-image", handler.UploadChatImage) // Upload ảnh chat (lưu MinIO khi đã cấu hình)
		chat.POST("/messages", handler.SendMessage)
		chat.POST("/messages/read", handler.MarkRead)
	}
}

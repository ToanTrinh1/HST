package routes

import (
	"fullstack-backend/internal/api/handlers"

	"github.com/gin-gonic/gin"
)

func setupNotificationRoutes(api *gin.RouterGroup, handler *handlers.NotificationHandler) {
	notifications := api.Group("/notifications")
	{
		notifications.GET("", handler.ListNotifications)
		notifications.POST("/:id/read", handler.MarkRead)
		notifications.POST("/read-all", handler.MarkAllRead)
	}
}

package routes

import (
	"fullstack-backend/internal/api/handlers"

	"github.com/gin-gonic/gin"
)

func setupWebSocketRoutes(api *gin.RouterGroup, wsHandler *handlers.WebSocketHandler) {
	api.GET("/ws", wsHandler.HandleWebSocket)
}

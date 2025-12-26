package routes

import (
	"fullstack-backend/internal/api/handlers"
	"github.com/gin-gonic/gin"
)

func SetupBetReceiptHistoryRoutes(router *gin.RouterGroup, historyHandler *handlers.BetReceiptHistoryHandler) {
	history := router.Group("/bet-receipt-history")
	{
		history.GET("", historyHandler.GetAllHistories)
		history.GET("/:id", historyHandler.GetHistoriesByBetReceiptID)
	}
}





package handlers

import (
	"fullstack-backend/internal/service"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type BetReceiptHistoryHandler struct {
	historyService *service.BetReceiptHistoryService
}

func NewBetReceiptHistoryHandler(historyService *service.BetReceiptHistoryService) *BetReceiptHistoryHandler {
	return &BetReceiptHistoryHandler{
		historyService: historyService,
	}
}

// GetAllHistories lấy tất cả lịch sử
func (h *BetReceiptHistoryHandler) GetAllHistories(c *gin.Context) {
	// Parse pagination parameters
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

	histories, err := h.historyService.GetAllHistories(limit, offset)
	if err != nil {
		log.Printf("Handler - ❌ Lỗi lấy danh sách lịch sử: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi lấy danh sách lịch sử: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    histories,
	})
}

// GetHistoriesByBetReceiptID lấy lịch sử theo bet_receipt_id
func (h *BetReceiptHistoryHandler) GetHistoriesByBetReceiptID(c *gin.Context) {
	betReceiptID := c.Param("id")
	if betReceiptID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Thiếu bet_receipt_id",
		})
		return
	}

	histories, err := h.historyService.GetHistoriesByBetReceiptID(betReceiptID)
	if err != nil {
		log.Printf("Handler - ❌ Lỗi lấy lịch sử theo bet_receipt_id: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi lấy lịch sử: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    histories,
	})
}


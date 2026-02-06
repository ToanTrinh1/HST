package handlers

import (
	"fullstack-backend/internal/service"
	"fullstack-backend/pkg/utils"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	notificationService *service.NotificationService
	jwtSecret           string
}

func NewNotificationHandler(notificationService *service.NotificationService, jwtSecret string) *NotificationHandler {
	return &NotificationHandler{
		notificationService: notificationService,
		jwtSecret:           jwtSecret,
	}
}

func (h *NotificationHandler) ListNotifications(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Yêu cầu xác thực"})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Token không hợp lệ hoặc đã hết hạn"})
		return
	}

	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")
	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)
	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	items, err := h.notificationService.ListByUser(claims.UserID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Lỗi khi lấy thông báo"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": items})
}

func (h *NotificationHandler) MarkRead(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Yêu cầu xác thực"})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Token không hợp lệ hoặc đã hết hạn"})
		return
	}

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Thiếu id"})
		return
	}

	if err := h.notificationService.MarkRead(claims.UserID, id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Không thể cập nhật thông báo"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Yêu cầu xác thực"})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Token không hợp lệ hoặc đã hết hạn"})
		return
	}

	if err := h.notificationService.MarkAllRead(claims.UserID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Không thể cập nhật thông báo"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

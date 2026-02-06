package handlers

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

type ChatHandler struct {
	chatService    *service.ChatService
	storage        storage.Storage   // chat images (upload + presign image_url)
	avatarStorage  storage.Storage   // presign avatar_url trong threads
	jwtSecret      string
}

func NewChatHandler(chatService *service.ChatService, chatStore, avatarStore storage.Storage, jwtSecret string) *ChatHandler {
	return &ChatHandler{
		chatService:   chatService,
		storage:      chatStore,
		avatarStorage: avatarStore,
		jwtSecret:   jwtSecret,
	}
}

func (h *ChatHandler) ListThreads(c *gin.Context) {
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
	if claims.Role != "admin" && claims.Role != "user" {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "Không có quyền truy cập"})
		return
	}

	var raw interface{}
	if claims.Role == "admin" {
		raw, err = h.chatService.ListThreadsForAdmin(claims.UserID)
	} else {
		raw, err = h.chatService.ListThreadsForUser(claims.UserID)
	}
	if err != nil {
		log.Printf("Chat ListThreads error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Lỗi khi lấy danh sách chat"})
		return
	}
	threads, _ := raw.([]*models.ChatThread)
	if threads == nil {
		threads = []*models.ChatThread{}
	}
	// avatar_url và image_url là path proxy (uploads/avatar/xxx, uploads/chat-images/xxx), frontend ghép baseURL
	c.JSON(http.StatusOK, gin.H{"success": true, "data": threads})
}

func (h *ChatHandler) ListAdmins(c *gin.Context) {
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
	if claims.Role != "user" && claims.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "Không có quyền truy cập"})
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

	admins, err := h.chatService.ListAdmins(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Lỗi khi lấy danh sách admin"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": admins})
}

func (h *ChatHandler) ListMessages(c *gin.Context) {
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

	userID := c.Query("user_id")
	var targetUserID *string
	if userID != "" {
		targetUserID = &userID
	}

	limitStr := c.DefaultQuery("limit", "20")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	// Check if using cursor-based pagination (before parameter)
	beforeStr := c.Query("before")
	var beforeTime *time.Time
	if beforeStr != "" {
		parsedTime, err := time.Parse(time.RFC3339, beforeStr)
		if err != nil {
			// Try parsing as Unix timestamp
			if unixTime, err2 := strconv.ParseInt(beforeStr, 10, 64); err2 == nil {
				parsedTime = time.Unix(unixTime, 0)
			} else {
				c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Định dạng thời gian không hợp lệ"})
				return
			}
		}
		beforeTime = &parsedTime
	}

	// Always use reverse order pagination (newest first)
	messages, otherID, err := h.chatService.ListMessagesReverse(claims.UserID, claims.Role, targetUserID, limit, beforeTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": messages, "other_user_id": otherID})
}

func (h *ChatHandler) SendMessage(c *gin.Context) {
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

	var req models.CreateChatMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Dữ liệu không hợp lệ"})
		return
	}
	if req.Content == "" && (req.ImageURL == nil || *req.ImageURL == "") {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Nội dung hoặc ảnh không được để trống"})
		return
	}

	msg, err := h.chatService.SendMessage(claims.UserID, claims.Role, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": msg})
}

// UploadChatImage upload ảnh chat, trả về URL để gửi kèm tin nhắn
func (h *ChatHandler) UploadChatImage(c *gin.Context) {
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

	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Không tìm thấy file ảnh. Vui lòng chọn ảnh."})
		return
	}
	allowedTypes := map[string]bool{
		"image/jpeg": true, "image/jpg": true, "image/png": true, "image/gif": true,
	}
	if !allowedTypes[file.Header.Get("Content-Type")] {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Chỉ chấp nhận ảnh (JPEG, PNG, GIF)"})
		return
	}
	maxSize := int64(5 * 1024 * 1024) // 5MB
	if file.Size > maxSize {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Ảnh không được vượt quá 5MB"})
		return
	}

	ext := filepath.Ext(file.Filename)
	filename := claims.UserID + "_" + strconv.FormatInt(time.Now().UnixNano(), 10) + ext
	objectKey := filename

	opened, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Lỗi khi đọc ảnh"})
		return
	}
	defer opened.Close()

	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}
	_, err = h.storage.Upload(context.Background(), objectKey, opened, file.Size, contentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Lỗi khi lưu ảnh"})
		return
	}
	// Trả path proxy — frontend truy cập qua GET /api/uploads/chat-images/:filename
	proxyPath := "uploads/chat-images/" + filename
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"url": proxyPath}})
}

// ServeChatImage phục vụ ảnh chat qua API (proxy từ MinIO/local) — GET /api/uploads/chat-images/:filename
func (h *ChatHandler) ServeChatImage(c *gin.Context) {
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

func (h *ChatHandler) MarkRead(c *gin.Context) {
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

	var body struct {
		UserID string `json:"user_id"`
	}
	_ = c.ShouldBindJSON(&body)

	var target *string
	if body.UserID != "" {
		target = &body.UserID
	}

	if err := h.chatService.MarkRead(claims.UserID, claims.Role, target); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

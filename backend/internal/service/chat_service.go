package service

import (
	"encoding/json"
	"errors"
	"fullstack-backend/internal/models"
	"fullstack-backend/internal/repository"
	"fullstack-backend/internal/websocket"
	"time"
)

type ChatService struct {
	chatRepo            *repository.ChatRepository
	userRepo            *repository.UserRepository
	notificationService *NotificationService
	hub                 *websocket.Hub
}

func NewChatService(chatRepo *repository.ChatRepository, userRepo *repository.UserRepository, notificationService *NotificationService, hub *websocket.Hub) *ChatService {
	return &ChatService{
		chatRepo:            chatRepo,
		userRepo:            userRepo,
		notificationService: notificationService,
		hub:                 hub,
	}
}

func (s *ChatService) getAdminID() (string, error) {
	admin, err := s.userRepo.GetFirstAdmin()
	if err != nil {
		return "", err
	}
	if admin == nil || admin.ID == "" {
		return "", errors.New("Không tìm thấy admin")
	}
	return admin.ID, nil
}

func (s *ChatService) ListThreadsForAdmin(adminID string) ([]*models.ChatThread, error) {
	return s.chatRepo.ListThreadsForAdmin(adminID)
}

func (s *ChatService) ListThreadsForUser(userID string) ([]*models.ChatThread, error) {
	return s.chatRepo.ListThreadsForUser(userID)
}

func (s *ChatService) ListAdmins(limit, offset int) ([]*models.User, error) {
	return s.userRepo.GetAdmins(limit, offset)
}

func (s *ChatService) ListMessages(currentUserID string, role string, targetUserID *string, limit, offset int) ([]*models.ChatMessage, string, error) {
	var otherID string
	if role == "admin" {
		adminID, err := s.getAdminID()
		if err != nil {
			return nil, "", err
		}
		currentUserID = adminID
		if targetUserID == nil || *targetUserID == "" {
			return nil, "", errors.New("Thiếu user_id")
		}
		otherID = *targetUserID
	} else {
		if targetUserID != nil && *targetUserID != "" {
			otherID = *targetUserID
		} else {
			adminID, err := s.getAdminID()
			if err != nil {
				return nil, "", err
			}
			otherID = adminID
		}
	}

	messages, err := s.chatRepo.ListMessages(currentUserID, otherID, limit, offset)
	if err != nil {
		return nil, "", err
	}
	return messages, otherID, nil
}

// ListMessagesReverse returns messages in reverse chronological order (newest first)
// beforeTime: if provided, returns messages before this timestamp
func (s *ChatService) ListMessagesReverse(currentUserID string, role string, targetUserID *string, limit int, beforeTime *time.Time) ([]*models.ChatMessage, string, error) {
	var otherID string
	if role == "admin" {
		// Use the actual admin ID who is logged in, not the first admin
		if targetUserID == nil || *targetUserID == "" {
			return nil, "", errors.New("Thiếu user_id")
		}
		otherID = *targetUserID
	} else {
		if targetUserID != nil && *targetUserID != "" {
			otherID = *targetUserID
		} else {
			adminID, err := s.getAdminID()
			if err != nil {
				return nil, "", err
			}
			otherID = adminID
		}
	}

	messages, err := s.chatRepo.ListMessagesReverse(currentUserID, otherID, limit, beforeTime)
	if err != nil {
		return nil, "", err
	}
	return messages, otherID, nil
}

func (s *ChatService) SendMessage(senderID string, role string, req *models.CreateChatMessageRequest) (*models.ChatMessage, error) {
	receiverID := ""
	if role == "admin" {
		// Use the actual admin ID who is logged in, not the first admin
		if req.ReceiverID == nil || *req.ReceiverID == "" {
			return nil, errors.New("Thiếu receiver_id")
		}
		receiverID = *req.ReceiverID
	} else {
		if req.ReceiverID != nil && *req.ReceiverID != "" {
			receiverID = *req.ReceiverID
		} else {
			adminID, err := s.getAdminID()
			if err != nil {
				return nil, err
			}
			receiverID = adminID
		}
	}

	content := req.Content
	if content == "" && (req.ImageURL == nil || *req.ImageURL == "") {
		return nil, errors.New("Nội dung hoặc ảnh không được để trống")
	}
	msg := &models.ChatMessage{
		SenderID:   senderID,
		ReceiverID: receiverID,
		Content:    content,
		ImageURL:   req.ImageURL,
	}
	createdMsg, err := s.chatRepo.CreateMessage(msg)
	if err != nil {
		return nil, err
	}

	// Thông báo chat đã tắt (tab chat và đơn hàng user đã tắt)

	// Emit WebSocket event for real-time chat message
	if s.hub != nil {
		s.hub.BroadcastChatMessage(createdMsg.ReceiverID, createdMsg)
	}

	return createdMsg, nil
}

func (s *ChatService) MarkRead(currentUserID string, role string, otherUserID *string) error {
	var senderID string
	if role == "admin" {
		// Use the actual admin ID who is logged in, not the first admin
		if otherUserID == nil || *otherUserID == "" {
			return errors.New("Thiếu user_id")
		}
		senderID = *otherUserID
	} else {
		if otherUserID != nil && *otherUserID != "" {
			senderID = *otherUserID
		} else {
			adminID, err := s.getAdminID()
			if err != nil {
				return err
			}
			senderID = adminID
		}
	}

	err := s.chatRepo.MarkRead(currentUserID, senderID)
	if err != nil {
		return err
	}

	// Real-time: thông báo cho người gửi (sender) rằng tin nhắn của họ đã được đọc bởi currentUserID
	if s.hub != nil {
		payload := map[string]string{
			"reader_id": currentUserID,
		}
		s.hub.BroadcastChatMessagesRead(senderID, payload)
	}

	// Tự động đánh dấu notification về chat message là đã đọc
	if s.notificationService != nil {
		go func() {
			// Lấy tất cả notifications chưa đọc về chat_message với sender_id này
			notifications, err := s.notificationService.ListByUser(currentUserID, 100, 0)
			if err == nil {
				for _, notif := range notifications {
					if !notif.IsRead && notif.Type == "chat_message" && notif.Data != nil {
						// Parse data để lấy sender_id
						var dataMap map[string]interface{}
						if err := json.Unmarshal([]byte(*notif.Data), &dataMap); err == nil {
							if msgSenderID, ok := dataMap["sender_id"].(string); ok && msgSenderID == senderID {
								// Mark notification as read
								_ = s.notificationService.MarkRead(currentUserID, notif.ID)
							}
						}
					}
				}
			}
		}()
	}

	return nil
}

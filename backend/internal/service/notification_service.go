package service

import (
	"errors"
	"fullstack-backend/internal/models"
	"fullstack-backend/internal/repository"
	"fullstack-backend/internal/websocket"
)

type NotificationService struct {
	notificationRepo *repository.NotificationRepository
	hub              *websocket.Hub
}

func NewNotificationService(notificationRepo *repository.NotificationRepository, hub *websocket.Hub) *NotificationService {
	return &NotificationService{
		notificationRepo: notificationRepo,
		hub:              hub,
	}
}

func (s *NotificationService) Create(req *models.CreateNotificationRequest) (*models.Notification, error) {
	if req.UserID == "" {
		return nil, errors.New("Thiếu user_id")
	}
	if req.Title == "" || req.Message == "" || req.Type == "" {
		return nil, errors.New("Thiếu thông tin thông báo")
	}

	notification, err := s.notificationRepo.Create(req)
	if err != nil {
		return nil, err
	}

	// Emit WebSocket event to user
	if s.hub != nil {
		s.hub.BroadcastNotification(req.UserID, notification)
	}

	return notification, nil
}

func (s *NotificationService) ListByUser(userID string, limit, offset int) ([]*models.Notification, error) {
	return s.notificationRepo.ListByUser(userID, limit, offset)
}

func (s *NotificationService) MarkRead(userID, id string) error {
	return s.notificationRepo.MarkRead(userID, id)
}

func (s *NotificationService) MarkAllRead(userID string) error {
	return s.notificationRepo.MarkAllRead(userID)
}

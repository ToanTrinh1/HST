package models

import "time"

type Notification struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Type      string    `json:"type" db:"type"`
	Title     string    `json:"title" db:"title"`
	Message   string    `json:"message" db:"message"`
	Data      *string   `json:"data,omitempty" db:"data"`
	IsRead    bool      `json:"is_read" db:"is_read"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type CreateNotificationRequest struct {
	UserID  string  `json:"user_id" binding:"required"`
	Type    string  `json:"type" binding:"required"`
	Title   string  `json:"title" binding:"required"`
	Message string  `json:"message" binding:"required"`
	Data    *string `json:"data"`
}

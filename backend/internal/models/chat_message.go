package models

import "time"

type ChatMessage struct {
	ID         string    `json:"id" db:"id"`
	SenderID   string    `json:"sender_id" db:"sender_id"`
	ReceiverID string    `json:"receiver_id" db:"receiver_id"`
	Content    string    `json:"content" db:"content"`
	ImageURL   *string   `json:"image_url,omitempty" db:"image_url"`
	IsRead     bool      `json:"is_read" db:"is_read"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

type CreateChatMessageRequest struct {
	ReceiverID *string `json:"receiver_id"`
	Content    string  `json:"content"`
	ImageURL   *string `json:"image_url,omitempty"`
}

type ChatThread struct {
	UserID              string     `json:"user_id" db:"user_id"`
	UserName            string     `json:"user_name" db:"user_name"`
	AvatarURL           *string    `json:"avatar_url,omitempty" db:"avatar_url"`
	LastMessage         *string    `json:"last_message,omitempty" db:"last_message"`
	LastMessageImageURL *string    `json:"last_message_image_url,omitempty" db:"last_message_image_url"`
	LastMessageSenderID *string    `json:"last_message_sender_id,omitempty" db:"last_message_sender_id"`
	LastAt              *time.Time `json:"last_at,omitempty" db:"last_at"`
	UnreadCount         int        `json:"unread_count" db:"unread_count"`
}

package repository

import (
	"database/sql"
	"fullstack-backend/internal/models"
	"time"
)

type ChatRepository struct {
	db *sql.DB
}

func NewChatRepository(db *sql.DB) *ChatRepository {
	return &ChatRepository{db: db}
}

func (r *ChatRepository) CreateMessage(msg *models.ChatMessage) (*models.ChatMessage, error) {
	query := `
		INSERT INTO chat_messages (sender_id, receiver_id, content, image_url)
		VALUES ($1, $2, $3, $4)
		RETURNING id, sender_id, receiver_id, content, image_url, is_read, created_at
	`

	created := &models.ChatMessage{}
	var imageURL sql.NullString
	err := r.db.QueryRow(
		query,
		msg.SenderID,
		msg.ReceiverID,
		msg.Content,
		msg.ImageURL,
	).Scan(
		&created.ID,
		&created.SenderID,
		&created.ReceiverID,
		&created.Content,
		&imageURL,
		&created.IsRead,
		&created.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	if imageURL.Valid {
		created.ImageURL = &imageURL.String
	}

	return created, nil
}

func (r *ChatRepository) ListMessages(userA, userB string, limit, offset int) ([]*models.ChatMessage, error) {
	query := `
		SELECT id, sender_id, receiver_id, content, image_url, is_read, created_at
		FROM chat_messages
		WHERE (sender_id = $1 AND receiver_id = $2)
		   OR (sender_id = $2 AND receiver_id = $1)
		ORDER BY created_at ASC
		LIMIT $3 OFFSET $4
	`

	rows, err := r.db.Query(query, userA, userB, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	messages := []*models.ChatMessage{}
	for rows.Next() {
		item := &models.ChatMessage{}
		var imageURL sql.NullString
		if err := rows.Scan(
			&item.ID,
			&item.SenderID,
			&item.ReceiverID,
			&item.Content,
			&imageURL,
			&item.IsRead,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		if imageURL.Valid {
			item.ImageURL = &imageURL.String
		}
		messages = append(messages, item)
	}

	return messages, nil
}

// ListMessagesReverse returns messages in reverse chronological order (newest first)
// beforeTime: if provided, returns messages before this timestamp
func (r *ChatRepository) ListMessagesReverse(userA, userB string, limit int, beforeTime *time.Time) ([]*models.ChatMessage, error) {
	var query string
	var rows *sql.Rows
	var err error

	if beforeTime != nil {
		query = `
			SELECT id, sender_id, receiver_id, content, image_url, is_read, created_at
			FROM chat_messages
			WHERE ((sender_id = $1 AND receiver_id = $2)
			   OR (sender_id = $2 AND receiver_id = $1))
			   AND created_at < $3
			ORDER BY created_at DESC
			LIMIT $4
		`
		rows, err = r.db.Query(query, userA, userB, *beforeTime, limit)
	} else {
		query = `
			SELECT id, sender_id, receiver_id, content, image_url, is_read, created_at
			FROM chat_messages
			WHERE (sender_id = $1 AND receiver_id = $2)
			   OR (sender_id = $2 AND receiver_id = $1)
			ORDER BY created_at DESC
			LIMIT $3
		`
		rows, err = r.db.Query(query, userA, userB, limit)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	messages := []*models.ChatMessage{}
	for rows.Next() {
		item := &models.ChatMessage{}
		var imageURL sql.NullString
		if err := rows.Scan(
			&item.ID,
			&item.SenderID,
			&item.ReceiverID,
			&item.Content,
			&imageURL,
			&item.IsRead,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		if imageURL.Valid {
			item.ImageURL = &imageURL.String
		}
		messages = append(messages, item)
	}

	return messages, nil
}

func (r *ChatRepository) MarkRead(receiverID, senderID string) error {
	query := `
		UPDATE chat_messages
		SET is_read = TRUE
		WHERE receiver_id = $1 AND sender_id = $2 AND is_read = FALSE
	`
	_, err := r.db.Exec(query, receiverID, senderID)
	return err
}

// ListThreadsForAdmin trả về tất cả user + tất cả admin khác (trừ chính mình), sắp xếp theo tin nhắn gần nhất trước
func (r *ChatRepository) ListThreadsForAdmin(adminID string) ([]*models.ChatThread, error) {
	query := `
		SELECT 
			u.id as user_id,
			u.ten as user_name,
			u.avatar_url,
			m.content as last_message,
			m.image_url as last_message_image_url,
			m.sender_id as last_message_sender_id,
			m.created_at as last_at,
			COALESCE(unread.unread_count, 0) as unread_count
		FROM nguoi_dung u
		LEFT JOIN LATERAL (
			SELECT content, image_url, sender_id, created_at
			FROM chat_messages
			WHERE (sender_id = u.id AND receiver_id = $1)
			   OR (sender_id = $1 AND receiver_id = u.id)
			ORDER BY created_at DESC
			LIMIT 1
		) m ON true
		LEFT JOIN LATERAL (
			SELECT COUNT(*) as unread_count
			FROM chat_messages
			WHERE sender_id = u.id AND receiver_id = $1 AND is_read = FALSE
		) unread ON true
		WHERE (u.vai_tro = 'user') OR ((u.vai_tro = 'admin' OR u.vai_tro = 'admin_tong') AND u.id <> $2)
		ORDER BY m.created_at DESC NULLS LAST, u.ten ASC
	`

	rows, err := r.db.Query(query, adminID, adminID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	threads := []*models.ChatThread{}
	for rows.Next() {
		item := &models.ChatThread{}
		var lastMessage sql.NullString
		var lastMessageImageURL sql.NullString
		var lastMessageSenderID sql.NullString
		var lastAt sql.NullTime
		var avatarURL sql.NullString
		if err := rows.Scan(
			&item.UserID,
			&item.UserName,
			&avatarURL,
			&lastMessage,
			&lastMessageImageURL,
			&lastMessageSenderID,
			&lastAt,
			&item.UnreadCount,
		); err != nil {
			return nil, err
		}
		if avatarURL.Valid {
			item.AvatarURL = &avatarURL.String
		}
		if lastMessage.Valid {
			item.LastMessage = &lastMessage.String
		}
		if lastMessageImageURL.Valid {
			item.LastMessageImageURL = &lastMessageImageURL.String
		}
		if lastMessageSenderID.Valid {
			item.LastMessageSenderID = &lastMessageSenderID.String
		}
		if lastAt.Valid {
			t := lastAt.Time
			item.LastAt = &t
		}
		threads = append(threads, item)
	}

	return threads, nil
}

func (r *ChatRepository) ListThreadsForUser(userID string) ([]*models.ChatThread, error) {
	query := `
		SELECT 
			u.id as user_id,
			u.ten as user_name,
			u.avatar_url,
			m.content as last_message,
			m.image_url as last_message_image_url,
			m.sender_id as last_message_sender_id,
			m.created_at as last_at,
			COALESCE(unread.unread_count, 0) as unread_count
		FROM nguoi_dung u
		LEFT JOIN LATERAL (
			SELECT content, image_url, sender_id, created_at
			FROM chat_messages
			WHERE (sender_id = u.id AND receiver_id = $1)
			   OR (sender_id = $1 AND receiver_id = u.id)
			ORDER BY created_at DESC
			LIMIT 1
		) m ON true
		LEFT JOIN LATERAL (
			SELECT COUNT(*) as unread_count
			FROM chat_messages
			WHERE sender_id = u.id AND receiver_id = $1 AND is_read = FALSE
		) unread ON true
		WHERE u.vai_tro IN ('admin', 'admin_tong')
		ORDER BY m.created_at DESC NULLS LAST, u.ten ASC
	`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	threads := []*models.ChatThread{}
	for rows.Next() {
		item := &models.ChatThread{}
		var lastMessage sql.NullString
		var lastMessageImageURL sql.NullString
		var lastMessageSenderID sql.NullString
		var lastAt sql.NullTime
		var avatarURL sql.NullString
		if err := rows.Scan(
			&item.UserID,
			&item.UserName,
			&avatarURL,
			&lastMessage,
			&lastMessageImageURL,
			&lastMessageSenderID,
			&lastAt,
			&item.UnreadCount,
		); err != nil {
			return nil, err
		}
		if avatarURL.Valid {
			item.AvatarURL = &avatarURL.String
		}
		if lastMessage.Valid {
			item.LastMessage = &lastMessage.String
		}
		if lastMessageImageURL.Valid {
			item.LastMessageImageURL = &lastMessageImageURL.String
		}
		if lastMessageSenderID.Valid {
			item.LastMessageSenderID = &lastMessageSenderID.String
		}
		if lastAt.Valid {
			t := lastAt.Time
			item.LastAt = &t
		}
		threads = append(threads, item)
	}
	return threads, nil
}

func (r *ChatRepository) CountUnread(receiverID string) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM chat_messages
		WHERE receiver_id = $1 AND is_read = FALSE
	`
	var count int
	if err := r.db.QueryRow(query, receiverID).Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

func (r *ChatRepository) GetLatestMessageBetween(userA, userB string) (*models.ChatMessage, error) {
	query := `
		SELECT id, sender_id, receiver_id, content, image_url, is_read, created_at
		FROM chat_messages
		WHERE (sender_id = $1 AND receiver_id = $2)
		   OR (sender_id = $2 AND receiver_id = $1)
		ORDER BY created_at DESC
		LIMIT 1
	`

	item := &models.ChatMessage{}
	var imageURL sql.NullString
	err := r.db.QueryRow(query, userA, userB).Scan(
		&item.ID,
		&item.SenderID,
		&item.ReceiverID,
		&item.Content,
		&imageURL,
		&item.IsRead,
		&item.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if imageURL.Valid {
		item.ImageURL = &imageURL.String
	}

	return item, nil
}

func (r *ChatRepository) GetLastMessageTimeForUser(userID, adminID string) (*time.Time, error) {
	query := `
		SELECT created_at
		FROM chat_messages
		WHERE (sender_id = $1 AND receiver_id = $2)
		   OR (sender_id = $2 AND receiver_id = $1)
		ORDER BY created_at DESC
		LIMIT 1
	`
	var lastAt sql.NullTime
	if err := r.db.QueryRow(query, userID, adminID).Scan(&lastAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if lastAt.Valid {
		return &lastAt.Time, nil
	}
	return nil, nil
}

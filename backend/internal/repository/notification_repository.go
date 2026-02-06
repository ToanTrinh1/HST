package repository

import (
	"database/sql"
	"fullstack-backend/internal/models"
)

type NotificationRepository struct {
	db *sql.DB
}

func NewNotificationRepository(db *sql.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) Create(req *models.CreateNotificationRequest) (*models.Notification, error) {
	query := `
		INSERT INTO notifications (user_id, type, title, message, data)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, type, title, message, data, is_read, created_at
	`

	notification := &models.Notification{}
	err := r.db.QueryRow(
		query,
		req.UserID,
		req.Type,
		req.Title,
		req.Message,
		req.Data,
	).Scan(
		&notification.ID,
		&notification.UserID,
		&notification.Type,
		&notification.Title,
		&notification.Message,
		&notification.Data,
		&notification.IsRead,
		&notification.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return notification, nil
}

func (r *NotificationRepository) ListByUser(userID string, limit, offset int) ([]*models.Notification, error) {
	query := `
		SELECT id, user_id, type, title, message, data, is_read, created_at
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notifications := []*models.Notification{}
	for rows.Next() {
		item := &models.Notification{}
		var data sql.NullString
		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.Type,
			&item.Title,
			&item.Message,
			&data,
			&item.IsRead,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		if data.Valid {
			item.Data = &data.String
		}
		notifications = append(notifications, item)
	}

	return notifications, nil
}

func (r *NotificationRepository) MarkRead(userID, id string) error {
	query := `
		UPDATE notifications
		SET is_read = TRUE
		WHERE id = $1 AND user_id = $2
	`
	_, err := r.db.Exec(query, id, userID)
	return err
}

func (r *NotificationRepository) MarkAllRead(userID string) error {
	query := `
		UPDATE notifications
		SET is_read = TRUE
		WHERE user_id = $1 AND is_read = FALSE
	`
	_, err := r.db.Exec(query, userID)
	return err
}

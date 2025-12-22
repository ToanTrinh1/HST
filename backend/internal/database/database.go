package database

import (
	"database/sql"
	"fmt"
	"time"

	"fullstack-backend/internal/config"

	_ "github.com/lib/pq" // PostgreSQL driver
)

// NewPostgresDB tạo kết nối đến PostgreSQL database
func NewPostgresDB(cfg *config.Config) (*sql.DB, error) {
	// Tạo connection string
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBName,
	)

	// Mở kết nối
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	// Cấu hình connection pool để tránh lỗi "connection closed"
	// SetMaxOpenConns: Số lượng kết nối tối đa có thể mở cùng lúc
	db.SetMaxOpenConns(25)
	// SetMaxIdleConns: Số lượng kết nối idle tối đa trong pool
	db.SetMaxIdleConns(5)
	// SetConnMaxLifetime: Thời gian tối đa một connection có thể được sử dụng (sau đó sẽ được đóng và tạo mới)
	db.SetConnMaxLifetime(5 * time.Minute)
	// SetConnMaxIdleTime: Thời gian tối đa một connection có thể idle (sau đó sẽ bị đóng)
	db.SetConnMaxIdleTime(10 * time.Minute)

	// Kiểm tra kết nối
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

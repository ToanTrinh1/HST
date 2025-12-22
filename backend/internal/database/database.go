package database

import (
	"database/sql"
	"fmt"

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

	// Kiểm tra kết nối
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

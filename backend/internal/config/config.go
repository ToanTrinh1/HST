package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port         string
	DBHost       string
	DBPort       string
	DBUser       string
	DBPassword   string
	DBName       string
	JWTSecret    string
	ExchangeRate float64 // Tỷ giá VND/CNY mặc định

	// MinIO (S3-compatible) - avatar và chat images tách 2 bucket
	MinIOEndpoint     string // e.g. localhost:9000
	MinIOAccessKey    string
	MinIOSecretKey    string
	MinIOBucketAvatar string // bucket avatar, default "hst-avatars"
	MinIOBucketChat   string // bucket ảnh chat, default "hst-chat-images"
	MinIOUseSSL       bool   // true for https
	MinIOPublicURL    string // Base URL để browser tải ảnh (không slash cuối), e.g. http://localhost:9000
	// Email configuration
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string // Email address để gửi từ
}

func Load() *Config {
	exchangeRateStr := getEnv("EXCHANGE_RATE", "3550.0")
	exchangeRate := 3550.0
	if rate, err := strconv.ParseFloat(exchangeRateStr, 64); err == nil {
		exchangeRate = rate
	}

	useSSL := getEnv("MINIO_USE_SSL", "false") == "true" || getEnv("MINIO_USE_SSL", "false") == "1"
	return &Config{
		Port:         getEnv("PORT", "8080"),
		DBHost:       getEnv("DB_HOST", "localhost"),
		DBPort:       getEnv("DB_PORT", "5432"),
		DBUser:       getEnv("DB_USER", "postgres"),
		DBPassword:   getEnv("DB_PASSWORD", "postgres"),
		DBName:       getEnv("DB_NAME", "hst_db"),
		JWTSecret:    getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		ExchangeRate: exchangeRate,

		MinIOEndpoint:     getEnv("MINIO_ENDPOINT", ""),
		MinIOAccessKey:    getEnv("MINIO_ACCESS_KEY", ""),
		MinIOSecretKey:    getEnv("MINIO_SECRET_KEY", ""),
		MinIOBucketAvatar: getEnv("MINIO_BUCKET_AVATAR", "hst-avatars"),
		MinIOBucketChat:   getEnv("MINIO_BUCKET_CHAT", "hst-chat-images"),
		MinIOUseSSL:       useSSL,
		MinIOPublicURL:    getEnv("MINIO_PUBLIC_URL", ""), // e.g. http://localhost:9000

		// Email configuration
		SMTPHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:     getEnv("SMTP_PORT", "587"),
		SMTPUser:     getEnv("SMTP_USER", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:     getEnv("SMTP_FROM", ""),
	}
}

// MinIOConfigured returns true if MinIO is enabled (endpoint and credentials set)
func (c *Config) MinIOConfigured() bool {
	return c.MinIOEndpoint != "" && c.MinIOAccessKey != "" && c.MinIOSecretKey != ""
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

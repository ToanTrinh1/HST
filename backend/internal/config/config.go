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
}

func Load() *Config {
	exchangeRateStr := getEnv("EXCHANGE_RATE", "3550.0")
	exchangeRate := 3550.0
	if rate, err := strconv.ParseFloat(exchangeRateStr, 64); err == nil {
		exchangeRate = rate
	}

	return &Config{
		Port:         getEnv("PORT", "8080"),
		DBHost:       getEnv("DB_HOST", "localhost"),
		DBPort:       getEnv("DB_PORT", "5432"),
		DBUser:       getEnv("DB_USER", "postgres"),
		DBPassword:   getEnv("DB_PASSWORD", "postgres"),
		DBName:       getEnv("DB_NAME", "hst_db"),
		JWTSecret:    getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		ExchangeRate: exchangeRate,
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

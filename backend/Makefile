# Makefile cho Backend (Go)

# Colors for output
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RED    := \033[0;31m
NC     := \033[0m # No Color

# Variables
APP_NAME := fullstack-backend
MAIN_PATH := cmd/api/main.go
BUILD_DIR := bin

.PHONY: help run build test clean deps tidy migrate-up migrate-down docker-db

# Default target - hiển thị help
help:
	@echo "$(GREEN)Available commands:$(NC)"
	@echo "  $(YELLOW)make run$(NC)          - Chạy server (development mode)"
	@echo "  $(YELLOW)make build$(NC)        - Build binary"
	@echo "  $(YELLOW)make test$(NC)         - Chạy tests"
	@echo "  $(YELLOW)make clean$(NC)        - Xóa build files"
	@echo "  $(YELLOW)make deps$(NC)         - Cài đặt dependencies"
	@echo "  $(YELLOW)make tidy$(NC)         - Tidy go modules"
	@echo "  $(YELLOW)make docker-db$(NC)    - Chạy PostgreSQL trong Docker"
	@echo "  $(YELLOW)make migrate-up$(NC)   - Chạy database migrations"
	@echo "  $(YELLOW)make set-admin$(NC)    - Set user thành admin (EMAIL=user@example.com)"

# Chạy server
run:
	@echo "$(GREEN)🚀 Starting server...$(NC)"
	@go run $(MAIN_PATH)

# Build binary
build:
	@echo "$(GREEN)🔨 Building $(APP_NAME)...$(NC)"
	@mkdir -p $(BUILD_DIR)
	@go build -o $(BUILD_DIR)/$(APP_NAME) $(MAIN_PATH)
	@echo "$(GREEN)✅ Build complete: $(BUILD_DIR)/$(APP_NAME)$(NC)"

# Chạy binary đã build
start:
	@echo "$(GREEN)🚀 Starting $(APP_NAME)...$(NC)"
	@./$(BUILD_DIR)/$(APP_NAME)

# Chạy tests
test:
	@echo "$(GREEN)🧪 Running tests...$(NC)"
	@go test -v ./...

# Chạy tests với coverage
test-coverage:
	@echo "$(GREEN)🧪 Running tests with coverage...$(NC)"
	@go test -v -cover ./...

# Clean build files
clean:
	@echo "$(YELLOW)🧹 Cleaning...$(NC)"
	@rm -rf $(BUILD_DIR)
	@go clean
	@echo "$(GREEN)✅ Clean complete$(NC)"

# Cài đặt dependencies
deps:
	@echo "$(GREEN)📦 Installing dependencies...$(NC)"
	@go get github.com/gin-gonic/gin
	@go get github.com/lib/pq
	@go get github.com/golang-jwt/jwt/v5
	@go get golang.org/x/crypto/bcrypt
	@echo "$(GREEN)✅ Dependencies installed$(NC)"

# Tidy modules
tidy:
	@echo "$(GREEN)📦 Tidying modules...$(NC)"
	@go mod tidy
	@echo "$(GREEN)✅ Modules tidied$(NC)"

# Chạy PostgreSQL trong Docker
docker-db:
	@echo "$(GREEN)🐘 Starting PostgreSQL...$(NC)"
	@cd .. && docker-compose up -d postgres
	@echo "$(GREEN)✅ PostgreSQL started$(NC)"

# Dừng PostgreSQL
docker-db-stop:
	@echo "$(YELLOW)🛑 Stopping PostgreSQL...$(NC)"
	@cd .. && docker-compose stop postgres

# Migrate up - Chạy migrations
migrate-up:
	@echo "$(GREEN)⬆️  Running migrations...$(NC)"
	@if [ -f migrations/001_create_bet_tables.sql ]; then \
		echo "$(GREEN)Running migration: 001_create_bet_tables.sql$(NC)"; \
		cat migrations/001_create_bet_tables.sql | docker exec -i fullstack-postgres psql -U postgres -d hst_db; \
		echo "$(GREEN)✅ Migration completed$(NC)"; \
	else \
		echo "$(RED)❌ Migration file not found$(NC)"; \
	fi

# Migrate với DBeaver (hướng dẫn)
migrate-guide:
	@echo "$(YELLOW)📖 Hướng dẫn chạy migrations:$(NC)"
	@echo "  1. Mở DBeaver và kết nối đến database hst_db"
	@echo "  2. Mở SQL Editor (Ctrl+\`)"
	@echo "  3. Mở file: backend/migrations/001_create_bet_tables.sql"
	@echo "  4. Copy toàn bộ nội dung và paste vào SQL Editor"
	@echo "  5. Chạy script (F5 hoặc Ctrl+Enter)"
	@echo ""
	@echo "$(YELLOW)Hoặc dùng command line:$(NC)"
	@echo "  cat backend/migrations/001_create_bet_tables.sql | docker exec -i fullstack-postgres psql -U postgres -d hst_db"

# Format code
fmt:
	@echo "$(GREEN)🎨 Formatting code...$(NC)"
	@go fmt ./...
	@echo "$(GREEN)✅ Code formatted$(NC)"

# Lint code (cần cài golangci-lint)
lint:
	@echo "$(GREEN)🔍 Linting code...$(NC)"
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run ./...; \
	else \
		echo "$(YELLOW)⚠️  golangci-lint not installed. Run: brew install golangci-lint$(NC)"; \
	fi

# Watch mode - auto restart khi code thay đổi (cần cài air)
dev:
	@echo "$(GREEN)👀 Starting in watch mode...$(NC)"
	@if command -v air >/dev/null 2>&1; then \
		air; \
	else \
		echo "$(YELLOW)⚠️  air not installed. Installing...$(NC)"; \
		go install github.com/cosmtrek/air@latest; \
		air; \
	fi

# Kiểm tra Go environment
check:
	@echo "$(GREEN)🔍 Checking Go environment...$(NC)"
	@echo "Go version: $$(go version)"
	@echo "GOPATH: $$(go env GOPATH)"
	@echo "GOROOT: $$(go env GOROOT)"

# Chạy database và server cùng lúc
all: docker-db run

# Quick start
quick: tidy docker-db
	@sleep 2
	@make run

# Set user thành admin
set-admin:
	@if [ -z "$(EMAIL)" ]; then \
		echo "$(RED)❌ Vui lòng cung cấp email: make set-admin EMAIL=user@example.com$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)🔧 Setting user $(EMAIL) as admin...$(NC)"
	@POSTGRES_CONTAINER=$$(docker ps --format "{{.Names}}" | grep -E "postgres|fullstack.*postgres" | head -n 1); \
	if [ -z "$$POSTGRES_CONTAINER" ]; then \
		echo "$(RED)❌ Không tìm thấy PostgreSQL container!$(NC)"; \
		exit 1; \
	fi; \
	echo "$(YELLOW)📦 Sử dụng container: $$POSTGRES_CONTAINER$(NC)"; \
	docker exec -i $$POSTGRES_CONTAINER psql -U postgres -d hst_db -c "UPDATE nguoi_dung SET vai_tro = 'admin', thoi_gian_cap_nhat = NOW() WHERE email = '$(EMAIL)';"; \
	docker exec -i $$POSTGRES_CONTAINER psql -U postgres -d hst_db -c "SELECT id, email, ten, vai_tro FROM nguoi_dung WHERE email = '$(EMAIL)';"; \
	echo "$(GREEN)✅ User đã được set thành admin$(NC)"

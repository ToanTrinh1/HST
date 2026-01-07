# Makefile cho Full-Stack Project

# Colors
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RED    := \033[0;31m
NC     := \033[0m

.PHONY: help dev up down logs rebuild clean backend-up backend-down backend-logs backend-rebuild db-up

# Default - Show help
help:
	@echo "$(GREEN)🚀 Full-Stack Project Commands:$(NC)"
	@echo ""
	@echo "$(YELLOW)All Services:$(NC)"
	@echo "  make dev              - Start all services (frontend + backend + db)"
	@echo "  make up               - Start all services in background"
	@echo "  make down             - Stop all services"
	@echo "  make logs             - View logs (all services)"
	@echo "  make rebuild          - Rebuild and restart all services"
	@echo ""
	@echo "$(YELLOW)Backend Only:$(NC)"
	@echo "  make backend-up       - Start backend + database"
	@echo "  make backend-down     - Stop backend"
	@echo "  make backend-logs     - View backend logs"
	@echo "  make backend-rebuild  - Rebuild backend"
	@echo ""
	@echo "$(YELLOW)Frontend Only:$(NC)"
	@echo "  make frontend-up      - Start frontend"
	@echo "  make frontend-down    - Stop frontend"
	@echo "  make frontend-logs    - View frontend logs"
	@echo "  make frontend-rebuild - Rebuild frontend"
	@echo ""
	@echo "$(YELLOW)Database Only:$(NC)"
	@echo "  make db-up            - Start PostgreSQL"
	@echo "  make db-down          - Stop PostgreSQL"
	@echo "  make db-logs          - View database logs"
	@echo ""
	@echo "$(YELLOW)Production Deployment:$(NC)"
	@echo "  make prod-up          - Start all services for production"
	@echo "  make prod-down        - Stop production services"
	@echo "  make prod-logs        - View production logs"
	@echo "  make prod-rebuild     - Rebuild production services"
	@echo ""
	@echo "$(YELLOW)Utilities:$(NC)"
	@echo "  make clean            - Clean all containers and volumes"
	@echo "  make ps               - Show running containers"

# Start all services (dev mode with logs)
dev:
	@echo "$(GREEN)🚀 Starting all services...$(NC)"
	docker-compose up --build

# Start all services in background
up:
	@echo "$(GREEN)🚀 Starting services in background...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✅ Services started!$(NC)"
	@echo "Backend: http://localhost:8080"
	@echo "Frontend: http://localhost:3000"

# Stop all services
down:
	@echo "$(YELLOW)🛑 Stopping all services...$(NC)"
	docker-compose down

# View logs
logs:
	docker-compose logs -f

# Rebuild all services
rebuild:
	@echo "$(YELLOW)🔨 Rebuilding all services...$(NC)"
	docker-compose down
	docker-compose up --build

# Backend only commands
backend-up:
	@echo "$(GREEN)🚀 Starting backend + database...$(NC)"
	docker-compose up -d postgres backend
	@echo "$(GREEN)✅ Backend started at http://localhost:8080$(NC)"

backend-down:
	@echo "$(YELLOW)🛑 Stopping backend...$(NC)"
	docker-compose stop backend

backend-logs:
	@echo "$(GREEN)📋 Backend logs:$(NC)"
	docker-compose logs -f backend

backend-rebuild:
	@echo "$(YELLOW)🔨 Rebuilding backend...$(NC)"
	docker-compose stop backend
	docker-compose build backend
	docker-compose up -d backend
	@echo "$(GREEN)✅ Backend rebuilt!$(NC)"

# Frontend only commands
frontend-up:
	@echo "$(GREEN)🚀 Starting frontend...$(NC)"
	docker-compose up -d frontend
	@echo "$(GREEN)✅ Frontend started at http://localhost:3000$(NC)"

frontend-down:
	@echo "$(YELLOW)🛑 Stopping frontend...$(NC)"
	docker-compose stop frontend

frontend-logs:
	@echo "$(GREEN)📋 Frontend logs:$(NC)"
	docker-compose logs -f frontend

frontend-rebuild:
	@echo "$(YELLOW)🔨 Rebuilding frontend...$(NC)"
	docker-compose stop frontend
	docker-compose build --no-cache frontend
	docker-compose up -d frontend
	@echo "$(GREEN)✅ Frontend rebuilt!$(NC)"

frontend-rebuild-clean:
	@echo "$(YELLOW)🔨 Rebuilding frontend with clean node_modules...$(NC)"
	docker-compose stop frontend
	docker volume rm hst_frontend_node_modules 2>/dev/null || true
	docker-compose build --no-cache frontend
	docker-compose up -d frontend
	@echo "$(GREEN)✅ Frontend rebuilt with clean dependencies!$(NC)"

# Database only commands
db-up:
	@echo "$(GREEN)🐘 Starting PostgreSQL...$(NC)"
	docker-compose up -d postgres
	@echo "$(GREEN)✅ Database started at localhost:5432$(NC)"

db-down:
	@echo "$(YELLOW)🛑 Stopping PostgreSQL...$(NC)"
	docker-compose stop postgres

db-logs:
	@echo "$(GREEN)📋 Database logs:$(NC)"
	docker-compose logs -f postgres

# Show running containers
ps:
	@echo "$(GREEN)📊 Running containers:$(NC)"
	docker-compose ps

# Production deployment commands
prod-up:
	@echo "$(GREEN)🚀 Starting production services...$(NC)"
	docker-compose -f docker-compose.prod.yml up -d --build
	@echo "$(GREEN)✅ Production services started!$(NC)"
	@echo "Backend: http://150.95.111.119:8080"
	@echo "Frontend: http://150.95.111.119:3000"

prod-down:
	@echo "$(YELLOW)🛑 Stopping production services...$(NC)"
	docker-compose -f docker-compose.prod.yml down

prod-logs:
	@echo "$(GREEN)📋 Production logs:$(NC)"
	docker-compose -f docker-compose.prod.yml logs -f

prod-rebuild:
	@echo "$(YELLOW)🔨 Rebuilding production services...$(NC)"
	docker-compose -f docker-compose.prod.yml down
	docker-compose -f docker-compose.prod.yml up -d --build
	@echo "$(GREEN)✅ Production services rebuilt!$(NC)"

# Clean everything
clean:
	@echo "$(RED)🧹 Cleaning all containers and volumes...$(NC)"
	docker-compose down -v
	docker system prune -f
	@echo "$(GREEN)✅ Cleaned!$(NC)"

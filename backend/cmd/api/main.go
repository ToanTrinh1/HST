package main

import (
	"log"

	"fullstack-backend/internal/api/handlers"
	"fullstack-backend/internal/api/routes"
	"fullstack-backend/internal/config"
	"fullstack-backend/internal/database"
	"fullstack-backend/internal/repository"
	"fullstack-backend/internal/service"
	"fullstack-backend/pkg/email"

	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Load config
	cfg := config.Load()
	log.Println("✅ Config loaded")

	// 2. Connect database
	db, err := database.NewPostgresDB(cfg)
	if err != nil {
		log.Fatal("❌ Failed to connect database:", err)
	}
	defer db.Close()
	log.Println("✅ Database connected")

	// 2.1. Run migrations tự động
	log.Println("🔄 Running database migrations...")
	// Khi chạy từ backend/ bằng "go run cmd/api/main.go", working directory là backend/
	// nên path migrations là "migrations"
	migrationsPath := "migrations"
	if err := database.RunMigrations(db, migrationsPath); err != nil {
		log.Printf("❌ Failed to run migrations: %v\n", err)
		log.Fatal("Migration failed, please check the error above")
	}
	log.Println("✅ Migrations completed")

	// 3. Initialize layers (Dependency Injection)
	userRepo := repository.NewUserRepository(db)
	passwordResetRepo := repository.NewPasswordResetRepository(db)
	betReceiptRepo := repository.NewBetReceiptRepository(db)
	walletRepo := repository.NewWalletRepository(db)
	depositRepo := repository.NewDepositRepository(db)
	withdrawalRepo := repository.NewWithdrawalRepository(db)
	historyRepo := repository.NewBetReceiptHistoryRepository(db)

	// Initialize email service
	emailService := email.NewEmailService(
		cfg.SMTPHost,
		cfg.SMTPPort,
		cfg.SMTPUser,
		cfg.SMTPPassword,
		cfg.SMTPFrom,
	)
	if emailService.IsConfigured() {
		log.Println("✅ Email service configured")
	} else {
		log.Println("⚠️  Email service not configured - emails will be logged to console only")
	}

	authService := service.NewAuthService(userRepo, passwordResetRepo, cfg.JWTSecret, emailService)
	betReceiptService := service.NewBetReceiptService(betReceiptRepo, userRepo, walletRepo, historyRepo)
	walletService := service.NewWalletService(walletRepo)
	depositService := service.NewDepositService(depositRepo, userRepo, walletRepo)
	withdrawalService := service.NewWithdrawalService(withdrawalRepo, userRepo, walletRepo)
	historyService := service.NewBetReceiptHistoryService(historyRepo)

	authHandler := handlers.NewAuthHandler(authService, cfg.JWTSecret)
	betReceiptHandler := handlers.NewBetReceiptHandler(betReceiptService, cfg.JWTSecret)
	walletHandler := handlers.NewWalletHandler(walletService)
	depositHandler := handlers.NewDepositHandler(depositService, cfg.JWTSecret)
	withdrawalHandler := handlers.NewWithdrawalHandler(withdrawalService, cfg.JWTSecret)
	historyHandler := handlers.NewBetReceiptHistoryHandler(historyService)
	log.Println("✅ Layers initialized")

	// 4. Setup router
	router := gin.Default()

	// Configure trusted proxies to fix the warning
	// Trust localhost and Docker network ranges (172.x.x.x)
	router.SetTrustedProxies([]string{"127.0.0.1", "::1", "172.16.0.0/12"})
	log.Println("✅ Proxy trust configured")

	// Health check endpoints
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "HST API",
		})
	})

	// Root endpoint
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "HST API Server",
			"version": "1.0.0",
			"endpoints": gin.H{
				"health": "/health",
				"api":    "/api",
			},
		})
	})

	// Add CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})
	log.Println("✅ CORS middleware enabled")

	// Serve static files (avatars)
	router.Static("/uploads", "./uploads")
	log.Println("✅ Static file serving enabled for /uploads")

	routes.SetupRoutes(router, authHandler, betReceiptHandler, walletHandler, depositHandler, withdrawalHandler, historyHandler)
	log.Println("✅ Routes configured")

	// 5. Start server
	log.Printf("🚀 Server running on port %s", cfg.Port)
	log.Println("📝 Available endpoints:")
	log.Println("   POST http://localhost:" + cfg.Port + "/api/auth/register")
	log.Println("   POST http://localhost:" + cfg.Port + "/api/auth/login")
	log.Println("   GET  http://localhost:" + cfg.Port + "/api/auth/me")
	log.Println("   GET  http://localhost:" + cfg.Port + "/api/auth/users")
	log.Println("   POST   http://localhost:" + cfg.Port + "/api/bet-receipts")
	log.Println("   GET    http://localhost:" + cfg.Port + "/api/bet-receipts")
	log.Println("   GET    http://localhost:" + cfg.Port + "/api/bet-receipts/:id")
	log.Println("   PUT    http://localhost:" + cfg.Port + "/api/bet-receipts/:id")
	log.Println("   DELETE http://localhost:" + cfg.Port + "/api/bet-receipts/:id")
	log.Println("   PATCH  http://localhost:" + cfg.Port + "/api/bet-receipts/:id/status")
	log.Println("   GET  http://localhost:" + cfg.Port + "/api/wallets")
	log.Println("   POST http://localhost:" + cfg.Port + "/api/wallets/recalculate-all")
	log.Println("   POST http://localhost:" + cfg.Port + "/api/wallets/:user_id/recalculate")
	log.Println("   POST http://localhost:" + cfg.Port + "/api/deposits")
	log.Println("   POST http://localhost:" + cfg.Port + "/api/withdrawals")
	log.Println("   GET  http://localhost:" + cfg.Port + "/api/bet-receipt-history")
	log.Println("   GET  http://localhost:" + cfg.Port + "/api/bet-receipt-history/:id")

	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal("❌ Failed to start server:", err)
	}
}

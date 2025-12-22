# Database Package

Package này chứa logic kết nối đến PostgreSQL database.

## Chức năng

- `NewPostgresDB(cfg *config.Config)`: Tạo và kiểm tra kết nối đến PostgreSQL database

## Cấu hình

Database connection được cấu hình thông qua environment variables:
- `DB_HOST`: Host của database (mặc định: localhost)
- `DB_PORT`: Port của database (mặc định: 5432)
- `DB_USER`: Username để kết nối (mặc định: postgres)
- `DB_PASSWORD`: Password để kết nối (mặc định: postgres)
- `DB_NAME`: Tên database (mặc định: fullstack_db)

## Sử dụng

```go
cfg := config.Load()
db, err := database.NewPostgresDB(cfg)
if err != nil {
    log.Fatal("Failed to connect database:", err)
}
defer db.Close()
```









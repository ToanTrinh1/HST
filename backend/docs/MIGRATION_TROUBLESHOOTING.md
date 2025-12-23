# 🔧 Troubleshooting Migrations

## Vấn đề: Database chỉ có bảng `users`, không có các bảng mới

### Nguyên nhân có thể:

1. **App chưa được start lại** sau khi thêm migration code
2. **Migration path không đúng** - không tìm thấy file migrations
3. **Migration bị lỗi** khi chạy nhưng không thấy error
4. **Database đã có dữ liệu** và migration bị conflict

---

## ✅ Cách kiểm tra và fix:

### Bước 1: Kiểm tra migration file có tồn tại không

```bash
cd backend
ls -la migrations/
```

Nên thấy:
- `001_create_bet_tables.sql`
- `README.md`

### Bước 2: Kiểm tra xem app có chạy migration không

**Cách 1: Chạy app và xem log**

```bash
cd backend
go run cmd/api/main.go
```

Nên thấy trong log:
```
✅ Database connected
🔄 Running database migrations...
📁 Migrations directory: /path/to/backend/migrations
✅ Migration 001_create_bet_tables.sql applied successfully
✅ Migrations completed
```

**Cách 2: Kiểm tra database có bảng `schema_migrations` không**

Nếu có bảng `schema_migrations` → migration runner đã chạy
Nếu KHÔNG có → migration runner chưa chạy

```sql
-- Kết nối vào database bằng DBeaver hoặc psql
SELECT * FROM schema_migrations;
```

### Bước 3: Kiểm tra tables trong database

```sql
-- Liệt kê tất cả tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Nên thấy:
- `schema_migrations` (nếu migration runner đã chạy)
- `users`
- `bet_receipts` ← Bảng mới
- `wallets` ← Bảng mới
- `withdrawals` ← Bảng mới
- `deposits` ← Bảng mới

---

## 🔧 Các cách fix:

### Fix 1: Chạy migration thủ công (Nhanh nhất)

Nếu bạn muốn chạy ngay không cần start app:

**Cách A: Dùng psql**

```bash
cat backend/migrations/001_create_bet_tables.sql | docker exec -i fullstack-postgres psql -U postgres -d hst_db
```

**Cách B: Dùng DBeaver**

1. Mở DBeaver
2. Kết nối đến database `hst_db`
3. Mở SQL Editor
4. Mở file `backend/migrations/001_create_bet_tables.sql`
5. Copy toàn bộ nội dung
6. Paste vào SQL Editor
7. Chạy (F5 hoặc Ctrl+Enter)

**Cách C: Dùng Makefile**

```bash
cd backend
make migrate-up
```

### Fix 2: Sửa migration path (Nếu path không đúng)

Nếu app không tìm thấy migrations folder, sửa trong `cmd/api/main.go`:

```go
// Thử các đường dẫn này:
migrationsPath := "migrations"              // Nếu chạy từ backend/
migrationsPath := "../../migrations"        // Nếu chạy từ cmd/api/ (mặc định)
migrationsPath := "./backend/migrations"    // Nếu chạy từ root project
```

### Fix 3: Kiểm tra lỗi khi migration chạy

Nếu migration bị lỗi, sẽ thấy trong log:

```
❌ Failed to run migrations: failed to execute migration 001_create_bet_tables.sql: ...
```

**Lỗi thường gặp:**

1. **Foreign key constraint**: Bảng `users` chưa tồn tại
   ```sql
   -- Kiểm tra bảng users có tồn tại không
   SELECT * FROM users LIMIT 1;
   ```

2. **Syntax error trong SQL**: Kiểm tra lại file SQL có đúng syntax không

3. **Permission denied**: Database user không có quyền tạo table

---

## 🔍 Debug migration runner

Nếu muốn debug chi tiết, thêm log vào `migrate.go`:

```go
func RunMigrations(db *sql.DB, relativePath string) error {
    migrationsPath, err := findMigrationsPath(relativePath)
    if err != nil {
        return fmt.Errorf("failed to find migrations path: %w", err)
    }

    fmt.Printf("📁 Migrations directory: %s\n", migrationsPath)  // ← Xem path này
    
    files, err := getMigrationFiles(migrationsPath)
    if err != nil {
        return fmt.Errorf("failed to get migration files: %w", err)
    }

    fmt.Printf("📄 Found %d migration files: %v\n", len(files), files)  // ← Xem có file nào không
    
    // ... rest of code
}
```

---

## ✅ Checklist

- [ ] Migration file `001_create_bet_tables.sql` tồn tại trong `backend/migrations/`
- [ ] Database `hst_db` đã tồn tại
- [ ] Bảng `users` đã tồn tại (vì bet_receipts có foreign key đến users)
- [ ] App đã được start lại với code mới (có `RunMigrations()`)
- [ ] Không có lỗi trong log khi start app
- [ ] Bảng `schema_migrations` đã được tạo (kiểm tra bằng SQL)

---

## 🚀 Quick Fix (Recommended)

Nếu bạn muốn chạy ngay bây giờ:

```bash
# Chạy migration thủ công
cd backend
make migrate-up

# Hoặc
cat migrations/001_create_bet_tables.sql | docker exec -i fullstack-postgres psql -U postgres -d hst_db
```

Sau đó kiểm tra:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Nên thấy đủ các bảng!


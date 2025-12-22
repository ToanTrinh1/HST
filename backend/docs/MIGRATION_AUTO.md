# 🔄 Auto Migration Tool

## Tổng quan

Project đã được tích hợp **Migration Runner tự động** - sẽ tự động chạy migrations khi app start.

## ✨ Tính năng

- ✅ **Tự động chạy migrations** khi app khởi động
- ✅ **Track migrations đã chạy** - không chạy lại migration đã apply
- ✅ **Chạy theo thứ tự** - migrations được sắp xếp và chạy theo tên file
- ✅ **Transaction safe** - mỗi migration chạy trong transaction, rollback nếu lỗi
- ✅ **Không cần tool bên ngoài** - tích hợp sẵn trong code

## 📁 Cấu trúc

```
backend/
├── migrations/
│   ├── 001_create_bet_tables.sql  # Migration files
│   └── README.md
├── internal/
│   └── database/
│       ├── database.go            # DB connection
│       └── migrate.go             # Migration runner ✨
└── cmd/
    └── api/
        └── main.go                # Tích hợp RunMigrations()
```

## 🚀 Cách sử dụng

### 1. Tự động chạy khi start app

Migration sẽ **tự động chạy** mỗi khi bạn start server:

```bash
cd backend
go run cmd/api/main.go
```

Bạn sẽ thấy output:
```
✅ Database connected
🔄 Running database migrations...
📁 Migrations directory: /path/to/backend/migrations
✅ Migration 001_create_bet_tables.sql applied successfully
✅ Migrations completed
✅ Layers initialized
...
```

### 2. Migration chỉ chạy 1 lần

Mỗi migration file chỉ được chạy **1 lần duy nhất**. Khi chạy lại app:

```
⏭️  Migration 001_create_bet_tables.sql already applied, skipping...
✅ Migrations completed
```

### 3. Thêm migration mới

Để thêm migration mới:

1. Tạo file mới trong `backend/migrations/`:
   ```bash
   backend/migrations/002_add_new_table.sql
   ```

2. Viết SQL migration:
   ```sql
   -- Migration: Add new table
   CREATE TABLE IF NOT EXISTS new_table (
       id VARCHAR(36) PRIMARY KEY,
       ...
   );
   ```

3. Start app - migration sẽ tự động chạy:
   ```bash
   go run cmd/api/main.go
   ```

## 📊 Tracking Migrations

Migrations được track trong bảng `schema_migrations`:

```sql
SELECT * FROM schema_migrations;
```

| id | filename                      | applied_at          |
|----|-------------------------------|---------------------|
| 1  | 001_create_bet_tables.sql    | 2024-12-01 10:00:00 |
| 2  | 002_add_new_table.sql        | 2024-12-02 15:30:00 |

## 🔧 Cấu hình

### Thay đổi đường dẫn migrations

Mặc định: `../../migrations` (từ `cmd/api/main.go`)

Nếu cần thay đổi, sửa trong `cmd/api/main.go`:

```go
migrationsPath := "custom/path/to/migrations"
database.RunMigrations(db, migrationsPath)
```

### Tắt auto migration

Nếu không muốn tự động chạy migrations khi start app, comment trong `main.go`:

```go
// Comment dòng này
// database.RunMigrations(db, migrationsPath)
```

## ⚠️ Lưu ý quan trọng

1. **Đặt tên file có thứ tự**: 
   - Dùng prefix số: `001_`, `002_`, `003_`
   - Để đảm bảo chạy đúng thứ tự

2. **Migration files phải idempotent**:
   - Dùng `CREATE TABLE IF NOT EXISTS`
   - Dùng `CREATE INDEX IF NOT EXISTS`
   - Để có thể chạy lại an toàn

3. **Không sửa migration đã chạy**:
   - Nếu migration đã được apply, không nên sửa file đó
   - Thay vào đó, tạo migration mới để thay đổi

4. **Backup trước khi migrate**:
   - Nếu có dữ liệu quan trọng, backup trước khi chạy migration

## 🆚 So sánh với cách thủ công

| Tính năng | Auto Migration | Manual (DBeaver/psql) |
|-----------|----------------|----------------------|
| Tự động chạy | ✅ Có | ❌ Phải chạy thủ công |
| Track đã chạy | ✅ Có | ❌ Phải tự track |
| Dễ deploy | ✅ Rất dễ | ⚠️ Phải SSH vào server |
| Phù hợp production | ✅ Rất phù hợp | ❌ Dễ quên |

## 🐛 Troubleshooting

### Lỗi: "migrations directory not found"

**Nguyên nhân**: Đường dẫn migrations không đúng

**Giải pháp**: 
- Kiểm tra bạn đang chạy từ đâu
- Đảm bảo file `migrations/001_create_bet_tables.sql` tồn tại
- Hoặc sửa `migrationsPath` trong `main.go`

### Lỗi: "migration already applied but table not exists"

**Nguyên nhân**: Migration được mark là đã chạy nhưng SQL thực tế fail

**Giải pháp**: 
- Xóa record trong `schema_migrations`:
  ```sql
  DELETE FROM schema_migrations WHERE filename = '001_create_bet_tables.sql';
  ```
- Hoặc xóa toàn bộ bảng và chạy lại:
  ```sql
  DROP TABLE IF EXISTS schema_migrations;
  ```

### Migration chạy quá chậm

**Nguyên nhân**: Migration có nhiều dữ liệu lớn

**Giải pháp**: 
- Chạy migration thủ công trước khi deploy
- Hoặc tách migration thành nhiều file nhỏ

## 📚 Tài liệu tham khảo

- Xem file migration mẫu: `backend/migrations/001_create_bet_tables.sql`
- Code migration runner: `backend/internal/database/migrate.go`

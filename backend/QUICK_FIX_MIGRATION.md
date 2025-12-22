# 🚀 Quick Fix: Chạy Migration Ngay

## Tại sao database chỉ có bảng `users`?

**Lý do**: Migration code mới vừa được thêm vào, nhưng app chưa được start lại hoặc migration chưa chạy.

## ✅ Cách nhanh nhất: Chạy migration thủ công

### Cách 1: Dùng DBeaver (Khuyến nghị - Dễ nhất)

1. **Mở DBeaver** và kết nối đến database `hst_db`

2. **Mở SQL Editor** (Ctrl+` hoặc icon SQL ở trên cùng)

3. **Mở file migration**:
   - File: `backend/migrations/001_create_bet_tables.sql`
   - Copy TOÀN BỘ nội dung (Ctrl+A, Ctrl+C)

4. **Paste vào SQL Editor** và chạy (F5 hoặc Ctrl+Enter)

5. **Kiểm tra kết quả**:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```
   
   Nên thấy các bảng:
   - `users`
   - `bet_receipts` ✅
   - `wallets` ✅
   - `withdrawals` ✅
   - `deposits` ✅

### Cách 2: Dùng Command Line

```bash
# Đảm bảo PostgreSQL container đang chạy
docker ps | grep postgres

# Chạy migration
cat backend/migrations/001_create_bet_tables.sql | docker exec -i fullstack-postgres psql -U postgres -d hst_db
```

### Cách 3: Dùng Makefile

```bash
cd backend
make migrate-up
```

---

## 🔄 Sau khi chạy migration thủ công

### Option A: Tiếp tục dùng auto migration (Khuyến nghị)

Sau khi chạy migration thủ công, lần sau khi start app:

1. Migration runner sẽ kiểm tra bảng `schema_migrations`
2. Nếu chưa có record, sẽ tạo bảng `schema_migrations` và chạy migration
3. Nếu đã có record (từ lần chạy thủ công), sẽ skip

**⚠️ Lưu ý**: Nếu bạn đã chạy migration thủ công, migration runner sẽ không chạy lại vì nó check bảng `schema_migrations`. Nếu muốn migration runner tự chạy, hãy:

```sql
-- Xóa bảng schema_migrations để migration runner chạy lại (CHỈ KHI CẦN)
DROP TABLE IF EXISTS schema_migrations;
```

### Option B: Chỉ dùng migration thủ công

Nếu bạn muốn tắt auto migration, comment trong `cmd/api/main.go`:

```go
// Comment dòng này
// database.RunMigrations(db, migrationsPath)
```

---

## ✅ Kiểm tra đã chạy thành công

Sau khi chạy migration, kiểm tra:

```sql
-- Xem tất cả tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Kiểm tra cấu trúc bảng bet_receipts
\d bet_receipts

-- Kiểm tra foreign keys
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('bet_receipts', 'wallets', 'withdrawals', 'deposits');
```

---

## 🎯 Tóm tắt

**Ngay bây giờ**: Chạy migration thủ công bằng DBeaver (Cách 1) - nhanh nhất!

**Lần sau**: Khi start app, migration sẽ tự động chạy (nếu chưa chạy rồi).

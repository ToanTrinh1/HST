# Database Migrations

## 📋 Cách chạy migrations

Hiện tại project **chưa có migration tool tự động**, bạn cần chạy SQL file **thủ công** bằng một trong các cách sau:

---

## 🎯 Cách 1: Dùng DBeaver (GUI - Dễ nhất)

### Bước 1: Đảm bảo PostgreSQL đang chạy

```bash
# Kiểm tra container
docker ps

# Nếu chưa chạy, start database
docker-compose up -d postgres
# Hoặc
cd backend && make docker-db
```

### Bước 2: Kết nối DBeaver

1. Mở DBeaver
2. Tạo connection mới đến PostgreSQL:
   - **Host:** `localhost`
   - **Port:** `5432`
   - **Database:** `hst_db` ⚠️ (theo docker-compose.yml)
   - **Username:** `postgres`
   - **Password:** `postgres`
3. Test connection và Finish

### Bước 3: Chạy migration files

**Lưu ý:** Chạy theo thứ tự từ file số nhỏ đến lớn:

1. **Chạy migration cho users table** (nếu chưa có):
   - File: `backend/migrations/000_create_users_table.sql` (nếu có)
   - Hoặc bảng users đã được tạo sẵn từ trước

2. **Chạy migration cho bet tables**:
   - Mở SQL Editor trong DBeaver (Ctrl+` hoặc icon SQL)
   - Mở file: `backend/migrations/001_create_bet_tables.sql`
   - Copy toàn bộ nội dung
   - Paste vào SQL Editor
   - Chạy script: **F5** hoặc **Ctrl+Enter**
   - Kiểm tra kết quả: Nên thấy "Query executed successfully"

3. **Kiểm tra tables đã được tạo**:
   - Refresh database (F5)
   - Expand: `hst_db` → Schemas → public → Tables
   - Nên thấy các bảng:
     - `users` (nếu chưa có)
     - `bet_receipts`
     - `wallets`
     - `withdrawals`
     - `deposits`

---

## 🎯 Cách 2: Dùng psql (Command Line)

### Bước 1: Đảm bảo PostgreSQL đang chạy

```bash
docker ps | grep postgres
```

### Bước 2: Chạy migration file

```bash
# Chạy migration từ file SQL
cat backend/migrations/001_create_bet_tables.sql | docker exec -i fullstack-postgres psql -U postgres -d hst_db

# Hoặc nếu đã có psql client cài đặt:
psql -h localhost -p 5432 -U postgres -d hst_db -f backend/migrations/001_create_bet_tables.sql
```

### Bước 3: Kiểm tra

```bash
# Kết nối vào database
docker exec -it fullstack-postgres psql -U postgres -d hst_db

# Liệt kê tables
\dt

# Xem cấu trúc một table
\d bet_receipts

# Thoát
\q
```

---

## 🎯 Cách 3: Tự động với script (Khuyến nghị cho tương lai)

Bạn có thể cải thiện Makefile để tự động chạy migrations:

```makefile
# Trong backend/Makefile
migrate-up:
	@echo "$(GREEN)⬆️  Running migrations...$(NC)"
	@cat migrations/001_create_bet_tables.sql | docker exec -i fullstack-postgres psql -U postgres -d hst_db
	@echo "$(GREEN)✅ Migrations completed$(NC)"
```

Sau đó chỉ cần chạy:
```bash
cd backend && make migrate-up
```

---

## ⚠️ Lưu ý quan trọng

1. **Database name**: Phải là `hst_db` (theo docker-compose.yml), không phải `HST_db` hay `postgres`

2. **Thứ tự chạy migrations**: 
   - Phải chạy bảng `users` trước (nếu chưa có)
   - Sau đó mới chạy `001_create_bet_tables.sql` (vì có foreign key đến users)

3. **CREATE TABLE IF NOT EXISTS**: 
   - Migration file đã dùng `CREATE TABLE IF NOT EXISTS`, nên chạy lại sẽ không lỗi
   - Nhưng nếu cần update schema, nên tạo migration mới thay vì sửa file cũ

4. **Backup trước khi chạy**: 
   - Nếu database đã có dữ liệu, nên backup trước khi chạy migration

---

## 📁 Cấu trúc migration files

```
backend/migrations/
├── README.md                          # File này
├── 000_create_users_table.sql         # Tạo bảng users (nếu có)
└── 001_create_bet_tables.sql          # Tạo các bảng bet, wallet, withdrawal, deposit
```

---

## ✅ Checklist sau khi chạy migration

- [ ] Database `hst_db` đã tồn tại
- [ ] Bảng `users` đã tồn tại (nếu cần)
- [ ] Bảng `bet_receipts` đã được tạo
- [ ] Bảng `wallets` đã được tạo
- [ ] Bảng `withdrawals` đã được tạo
- [ ] Bảng `deposits` đã được tạo
- [ ] Các indexes đã được tạo
- [ ] Foreign keys đã được tạo đúng
- [ ] Test connection từ application thành công

---

## 🔄 Nếu muốn reset database

```bash
# CẢNH BÁO: Xóa toàn bộ dữ liệu!
docker exec -it fullstack-postgres psql -U postgres -d hst_db -c "DROP TABLE IF EXISTS deposits, withdrawals, wallets, bet_receipts CASCADE;"

# Sau đó chạy lại migration
cat backend/migrations/001_create_bet_tables.sql | docker exec -i fullstack-postgres psql -U postgres -d hst_db
```


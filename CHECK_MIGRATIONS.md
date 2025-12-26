# 🔍 Kiểm tra và chạy Database Migrations

## Vấn đề: Database chưa có migrations

Nếu bạn gặp lỗi kết nối database hoặc lỗi "table does not exist", có thể database chưa được migrate.

## ✅ Giải pháp

### Cách 1: Backend tự động chạy migrations (Khuyến nghị)

Backend sẽ tự động chạy migrations khi khởi động. Chỉ cần:

1. **Đảm bảo database container đang chạy:**
```bash
docker-compose up -d postgres
```

2. **Khởi động backend:**
```bash
# Nếu chạy trong Docker
docker-compose up -d backend

# Nếu chạy ngoài Docker
cd backend
go run cmd/api/main.go
```

Backend sẽ tự động:
- Tạo bảng `schema_migrations` để track migrations
- Chạy tất cả migration files chưa được apply
- Log ra console các migrations đã chạy

### Cách 2: Kiểm tra migrations thủ công

Sử dụng script kiểm tra:

```bash
cd backend
./scripts/check_migrations.sh
```

Script này sẽ:
- ✅ Kiểm tra database container có chạy không
- ✅ Kiểm tra database có tồn tại không
- ✅ Liệt kê các migrations đã chạy
- ✅ Kiểm tra các bảng chính đã được tạo chưa

### Cách 3: Chạy migrations thủ công (nếu cần)

Nếu backend không tự động chạy migrations, bạn có thể chạy thủ công:

```bash
# Chạy từng migration file
cd backend
./scripts/migrate.sh migrations/000_create_users_table.sql
./scripts/migrate.sh migrations/001_create_bet_tables.sql
./scripts/migrate.sh migrations/002_add_new_status_values.sql
./scripts/migrate.sh migrations/003_add_don_hang_moi_status.sql
./scripts/migrate.sh migrations/004_create_bet_receipt_history.sql
```

## 📋 Danh sách Migration Files

1. **000_create_users_table.sql** - Tạo bảng `nguoi_dung`
2. **001_create_bet_tables.sql** - Tạo các bảng:
   - `thong_tin_nhan_keo` (bet receipts)
   - `tien_keo` (wallets)
   - `lich_su_nop_tien` (deposits)
   - `lich_su_rut_tien` (withdrawals)
3. **002_add_new_status_values.sql** - Thêm các giá trị status mới
4. **003_add_don_hang_moi_status.sql** - Thêm status "Đơn hàng mới"
5. **004_create_bet_receipt_history.sql** - Tạo bảng lịch sử chỉnh sửa

## 🔍 Kiểm tra migrations đã chạy

### Xem trong database:
```bash
docker exec -it fullstack-postgres psql -U postgres -d hst_db -c "SELECT * FROM schema_migrations ORDER BY applied_at;"
```

### Xem logs backend:
```bash
docker-compose logs backend | grep -i migration
```

## ⚠️ Lưu ý

- Migrations chỉ chạy một lần (tracked trong `schema_migrations`)
- Nếu migration đã chạy, backend sẽ skip và log "already applied"
- Migrations chạy theo thứ tự tên file (000, 001, 002, ...)
- Nếu migration fail, backend sẽ không start (fail fast)

## 🚀 Quick Fix

Nếu vẫn lỗi, thử reset và chạy lại:

```bash
# Dừng tất cả
docker-compose down

# Xóa volumes (⚠️ Mất dữ liệu!)
docker-compose down -v

# Khởi động lại
docker-compose up -d postgres
sleep 5  # Đợi database sẵn sàng
docker-compose up -d backend

# Xem logs
docker-compose logs -f backend
```





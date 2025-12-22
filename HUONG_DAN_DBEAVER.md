# Hướng dẫn kết nối Database bằng DBeaver

## Bước 1: Đảm bảo PostgreSQL container đang chạy

1. Mở terminal
2. Chạy lệnh: `docker ps`
3. Kiểm tra xem container `fullstack-postgres` có đang chạy không
4. Nếu chưa chạy, chạy: `docker-compose up -d postgres`
5. Đợi vài giây để PostgreSQL khởi động hoàn toàn

## Bước 2: Tạo database HST_db (nếu chưa có)

### Cách 1: Dùng DBeaver

1. Mở DBeaver
2. Click chuột phải vào "Databases" → "New" → "Database Connection"
3. Chọn "PostgreSQL"
4. Điền thông tin:
   - **Host:** `localhost` (hoặc `127.0.0.1`)
   - **Port:** `5432`
   - **Database:** `postgres` (database mặc định)
   - **Username:** `postgres`
   - **Password:** `postgres`
5. Click "Test Connection" để kiểm tra
6. Click "Finish" để lưu connection
7. Kết nối đến database `postgres`
8. Mở SQL Editor (Ctrl+` hoặc click icon SQL)
9. Chạy lệnh:
   ```sql
   CREATE DATABASE HST_db;
   ```
10. Refresh database list (F5) để thấy database `HST_db` mới

### Cách 2: Dùng Terminal

```bash
docker exec -it fullstack-postgres psql -U postgres -c "CREATE DATABASE HST_db;"
```

## Bước 3: Tạo connection mới đến database HST_db trong DBeaver

1. Click chuột phải vào "Databases" → "New" → "Database Connection"
2. Chọn "PostgreSQL"
3. Điền thông tin kết nối:
   - **Host:** `localhost` (hoặc `127.0.0.1`)
   - **Port:** `5432`
   - **Database:** `HST_db` ⚠️ (QUAN TRỌNG: phải là HST_db, không phải postgres)
   - **Username:** `postgres`
   - **Password:** `postgres`
   - **Show all databases:** Bỏ chọn (không cần)
4. Click "Test Connection"
   - Nếu thành công: sẽ hiện "Connected"
   - Nếu lỗi: kiểm tra lại thông tin
5. Click "Finish" để lưu connection

## Bước 4: Chạy migrations để tạo tables

1. Trong DBeaver, kết nối đến database `HST_db` (connection vừa tạo)
2. Mở SQL Editor (Ctrl+` hoặc icon SQL)
3. Mở file: `backend/migrations/001_create_users_table.up.sql`
4. Copy toàn bộ nội dung SQL
5. Paste vào SQL Editor trong DBeaver
6. Chạy script (F5 hoặc Ctrl+Enter)
7. Kiểm tra xem table `users` đã được tạo chưa:
   - Expand database `HST_db` → Schemas → public → Tables
   - Nên thấy table `users`

## Bước 5: Kiểm tra kết nối

1. Trong DBeaver, click chuột phải vào table `users`
2. Chọn "View Data" hoặc "Read Data"
3. Nếu hiện được (dù không có dữ liệu) là thành công!

## Thông tin kết nối tóm tắt:

- **Host:** `localhost` (nếu chạy local) hoặc `hst_db` (nếu trong Docker network)
- **Port:** `5432`
- **Database:** `HST_db` (không phải `postgres`)
- **Username:** `postgres`
- **Password:** `postgres`

## Lưu ý quan trọng:

⚠️ **Database name phải là `HST_db`, không phải `postgres`!**

Nếu bạn kết nối với database `postgres`, bạn sẽ không thấy tables của ứng dụng vì chúng được tạo trong database `HST_db`.


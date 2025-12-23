# 🔧 Khắc phục lỗi kết nối Database

## ❌ Lỗi: `dial tcp 172.18.0.2:5432: connect: connection refused`

### Nguyên nhân
Backend không thể kết nối đến PostgreSQL database. Có thể do:
1. Database container chưa chạy
2. Backend đang chạy ngoài Docker nhưng cố kết nối vào container
3. Cấu hình DB_HOST không đúng

## ✅ Giải pháp

### Cách 1: Chạy tất cả trong Docker (Khuyến nghị)

```bash
# Khởi động database và backend
make backend-up

# Hoặc khởi động tất cả services
make up
```

### Cách 2: Chạy backend ngoài Docker, database trong Docker

1. **Khởi động database container:**
```bash
make db-up
# hoặc
docker-compose up -d postgres
```

2. **Chạy backend với DB_HOST=localhost:**
```bash
cd backend
DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_PASSWORD=postgres DB_NAME=hst_db go run cmd/api/main.go
```

### Cách 3: Kiểm tra và khởi động lại

1. **Kiểm tra containers đang chạy:**
```bash
docker-compose ps
```

2. **Nếu database chưa chạy, khởi động:**
```bash
docker-compose up -d postgres
```

3. **Đợi database sẵn sàng (khoảng 5-10 giây), sau đó khởi động backend:**
```bash
docker-compose up -d backend
```

4. **Xem logs để kiểm tra:**
```bash
docker-compose logs backend
docker-compose logs postgres
```

## 🔍 Kiểm tra kết nối

### Kiểm tra database có chạy không:
```bash
docker-compose ps postgres
```

### Kiểm tra logs database:
```bash
docker-compose logs postgres
```

### Test kết nối từ terminal:
```bash
# Nếu database chạy trong Docker
docker exec -it fullstack-postgres psql -U postgres -d hst_db

# Hoặc từ máy host (nếu đã cài psql)
psql -h localhost -p 5432 -U postgres -d hst_db
```

## 📝 Lưu ý

- **Khi chạy trong Docker:** DB_HOST phải là `postgres` (tên service trong docker-compose.yml)
- **Khi chạy ngoài Docker:** DB_HOST phải là `localhost` hoặc `127.0.0.1`
- Database cần thời gian khởi động (5-10 giây) sau khi container start

## 🚀 Quick Fix

Nếu vẫn lỗi, thử:
```bash
# Dừng tất cả
docker-compose down

# Khởi động lại từ đầu
docker-compose up -d postgres
sleep 5  # Đợi database sẵn sàng
docker-compose up -d backend

# Xem logs
docker-compose logs -f backend
```



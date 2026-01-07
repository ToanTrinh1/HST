# Hướng dẫn Deploy lên Server

## Thông tin Server
- **IP Server**: 150.95.111.119
- **Backend Port**: 8080
- **Frontend Port**: 3000
- **Database Port**: 5432

## Các bước Deploy

### 1. Chuẩn bị Server

Đảm bảo server đã cài đặt:
- Docker
- Docker Compose
- Git

### 2. Clone hoặc Upload code lên server

```bash
# Nếu dùng Git
git clone <repository-url>
cd HST

# Hoặc upload code qua SCP/SFTP
```

### 3. Cấu hình cho Production

#### Option 1: Sử dụng docker-compose.prod.yml (Khuyến nghị)

```bash
# Sử dụng file docker-compose cho production
docker-compose -f docker-compose.prod.yml up -d --build
```

#### Option 2: Sử dụng docker-compose.yml với biến môi trường

File `docker-compose.yml` đã được cấu hình với IP server. Chỉ cần chạy:

```bash
docker-compose up -d --build
```

### 4. Kiểm tra Services

```bash
# Xem logs
docker-compose logs -f

# Hoặc với production file
docker-compose -f docker-compose.prod.yml logs -f

# Kiểm tra containers đang chạy
docker-compose ps
```

### 5. Truy cập ứng dụng

- **Frontend**: http://150.95.111.119:3000
- **Backend API**: http://150.95.111.119:8080/api
- **Database**: localhost:5432 (chỉ truy cập từ trong server)

### 6. Cấu hình Firewall

Đảm bảo các port sau đã được mở trên server:

```bash
# Ubuntu/Debian
sudo ufw allow 3000/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 5432/tcp  # Chỉ nếu cần truy cập từ bên ngoài (không khuyến nghị)

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

### 7. Cập nhật IP Server (nếu thay đổi)

Nếu IP server thay đổi, cần cập nhật:

1. **docker-compose.yml** - Dòng 50:
   ```yaml
   - REACT_APP_API_URL=http://<IP_MỚI>:8080
   ```

2. **docker-compose.prod.yml** - Dòng 50:
   ```yaml
   - REACT_APP_API_URL=http://<IP_MỚI>:8080
   ```

3. Sau đó rebuild frontend:
   ```bash
   docker-compose up -d --build frontend
   ```

## Lưu ý Bảo mật

1. **Đổi JWT_SECRET** trong docker-compose.prod.yml thành một giá trị mạnh và bảo mật
2. **Đổi Database Password** trong production
3. **Cấu hình HTTPS** nếu có thể (sử dụng Nginx reverse proxy)
4. **Giới hạn truy cập Database** - không mở port 5432 ra ngoài
5. **Backup Database** định kỳ

## Troubleshooting

### Frontend không kết nối được Backend

1. Kiểm tra REACT_APP_API_URL trong docker-compose.yml
2. Rebuild frontend container:
   ```bash
   docker-compose up -d --build frontend
   ```

### Backend không kết nối được Database

1. Kiểm tra DB_HOST trong docker-compose.yml (phải là `postgres`)
2. Kiểm tra postgres container đã chạy:
   ```bash
   docker-compose ps postgres
   ```

### CORS Errors

Backend đã được cấu hình CORS cho phép tất cả origins. Nếu vẫn gặp lỗi, kiểm tra:
- Backend đang chạy đúng port
- Frontend đang gọi đúng API URL

## Commands hữu ích

```bash
# Xem logs của tất cả services
docker-compose logs -f

# Xem logs của một service cụ thể
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart một service
docker-compose restart backend

# Stop tất cả services
docker-compose down

# Stop và xóa volumes (cẩn thận - sẽ mất data)
docker-compose down -v
```


#!/bin/bash

echo "🔐 Tạo/Cập nhật tài khoản admin..."

# Kiểm tra xem container có đang chạy không
if ! docker ps | grep -q "fullstack-postgres"; then
    echo "❌ PostgreSQL container chưa chạy. Đang khởi động..."
    docker-compose up -d postgres
    sleep 5
fi

# Chạy migration để thêm cột role (nếu chưa có)
echo "📋 Chạy migration để thêm cột role..."
docker exec -i fullstack-postgres psql -U postgres -d HST_db < backend/migrations/002_add_role_to_users.up.sql 2>/dev/null || echo "Cột role có thể đã tồn tại"

# Cập nhật user hiện có thành admin
echo "👤 Cập nhật user thành admin..."
echo ""
echo "Nhập email của user bạn muốn set thành admin:"
read -r email

if [ -z "$email" ]; then
    echo "❌ Email không được để trống!"
    exit 1
fi

echo "🔄 Đang cập nhật user $email thành admin..."
docker exec fullstack-postgres psql -U postgres -d HST_db -c "UPDATE users SET role = 'admin' WHERE email = '$email';"

if [ $? -eq 0 ]; then
    echo "✅ Đã cập nhật user $email thành admin!"
    echo ""
    echo "📊 Kiểm tra user admin:"
    docker exec fullstack-postgres psql -U postgres -d HST_db -c "SELECT id, email, name, role FROM users WHERE email = '$email';"
else
    echo "❌ Có lỗi xảy ra khi cập nhật"
fi


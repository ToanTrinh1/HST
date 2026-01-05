#!/bin/bash

# Script để fix lỗi Docker build cache

echo "🔧 Đang xóa Docker build cache..."

# Xóa build cache
docker builder prune -af

echo "✅ Đã xóa build cache"

echo "🔧 Đang rebuild Docker images..."

# Rebuild với --no-cache để đảm bảo build từ đầu
docker-compose build --no-cache backend

echo "✅ Rebuild hoàn tất!"

echo ""
echo "📝 Bây giờ bạn có thể chạy:"
echo "   docker-compose up -d"









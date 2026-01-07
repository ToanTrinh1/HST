#!/bin/bash

# Script để kiểm tra kết nối API từ frontend đến backend

echo "🔍 Kiểm tra cấu hình API..."
echo ""

# Lấy IP từ docker-compose.yml
API_URL=$(grep -A 1 "REACT_APP_API_URL" docker-compose.yml | grep -v "REACT_APP_API_URL" | head -1 | sed 's/.*REACT_APP_API_URL=//' | tr -d ' ')

if [ -z "$API_URL" ]; then
    API_URL="http://150.95.111.119:8080"
    echo "⚠️  Không tìm thấy REACT_APP_API_URL trong docker-compose.yml, sử dụng mặc định: $API_URL"
else
    echo "✅ Tìm thấy REACT_APP_API_URL: $API_URL"
fi

echo ""
echo "📡 Kiểm tra kết nối đến backend..."
echo ""

# Test backend health
echo "1. Kiểm tra backend có đang chạy không..."
BACKEND_URL="${API_URL}/api"
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/health" 2>/dev/null || echo "000")

if [ "$HEALTH_CHECK" = "200" ] || [ "$HEALTH_CHECK" = "404" ]; then
    echo "   ✅ Backend đang chạy (HTTP $HEALTH_CHECK)"
else
    echo "   ❌ Backend không phản hồi (HTTP $HEALTH_CHECK)"
    echo "   ⚠️  Kiểm tra xem backend container có đang chạy không:"
    echo "      docker ps | grep backend"
fi

echo ""
echo "2. Kiểm tra từ container frontend..."
echo ""

# Kiểm tra từ trong frontend container
FRONTEND_CONTAINER=$(docker ps --format "{{.Names}}" | grep frontend | head -1)

if [ -z "$FRONTEND_CONTAINER" ]; then
    echo "   ⚠️  Không tìm thấy frontend container đang chạy"
else
    echo "   ✅ Tìm thấy frontend container: $FRONTEND_CONTAINER"
    echo ""
    echo "   Kiểm tra biến môi trường trong container:"
    docker exec $FRONTEND_CONTAINER printenv | grep REACT_APP_API_URL || echo "   ⚠️  REACT_APP_API_URL không được set trong container"
    echo ""
    echo "   Test kết nối từ container đến backend:"
    BACKEND_HOST=$(echo $API_URL | sed 's|http://||' | sed 's|:.*||')
    BACKEND_PORT=$(echo $API_URL | sed 's|.*:||')
    docker exec $FRONTEND_CONTAINER sh -c "nc -zv $BACKEND_HOST $BACKEND_PORT 2>&1 || echo '   ❌ Không thể kết nối đến $BACKEND_HOST:$BACKEND_PORT'"
fi

echo ""
echo "3. Thông tin containers đang chạy:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAMES|frontend|backend"

echo ""
echo "📝 Hướng dẫn kiểm tra thêm:"
echo "   1. Mở browser và vào http://<IP_SERVER>:3000"
echo "   2. Mở Developer Console (F12)"
echo "   3. Xem tab Console để kiểm tra log '🔧 API Configuration'"
echo "   4. Xem tab Network để kiểm tra các request API có đúng URL không"
echo ""
echo "   Nếu API URL sai, cần rebuild frontend container:"
echo "   docker-compose down frontend"
echo "   docker-compose up -d --build frontend"


#!/bin/bash

echo "🔍 Kiểm tra kết nối API cho chức năng đổi mật khẩu..."
echo ""

# Lấy API URL từ docker-compose.yml
API_URL=$(grep -A 1 "REACT_APP_API_URL" docker-compose.yml | grep -v "REACT_APP_API_URL" | head -1 | sed 's/.*REACT_APP_API_URL=//' | tr -d ' ')

if [ -z "$API_URL" ]; then
    API_URL="http://localhost:8080"
    echo "⚠️  Không tìm thấy REACT_APP_API_URL trong docker-compose.yml, sử dụng mặc định: $API_URL"
else
    echo "✅ Tìm thấy REACT_APP_API_URL: $API_URL"
fi

echo ""
echo "1. Kiểm tra backend có đang chạy không..."
BACKEND_CONTAINER="fullstack-backend"
if docker ps | grep -q "$BACKEND_CONTAINER"; then
    echo "   ✅ Backend container đang chạy: $BACKEND_CONTAINER"
else
    echo "   ❌ Backend container KHÔNG chạy: $BACKEND_CONTAINER"
    echo "   → Chạy: docker-compose up -d backend"
    exit 1
fi

echo ""
echo "2. Kiểm tra frontend có đang chạy không..."
FRONTEND_CONTAINER="fullstack-frontend"
if docker ps | grep -q "$FRONTEND_CONTAINER"; then
    echo "   ✅ Frontend container đang chạy: $FRONTEND_CONTAINER"
else
    echo "   ❌ Frontend container KHÔNG chạy: $FRONTEND_CONTAINER"
    echo "   → Chạy: docker-compose up -d frontend"
    exit 1
fi

echo ""
echo "3. Kiểm tra biến môi trường REACT_APP_API_URL trong frontend container..."
FRONTEND_ENV=$(docker exec $FRONTEND_CONTAINER printenv | grep REACT_APP_API_URL || echo "")
if [ -z "$FRONTEND_ENV" ]; then
    echo "   ⚠️  REACT_APP_API_URL không được set trong container"
    echo "   → Cần rebuild frontend: docker-compose up -d --build frontend"
else
    echo "   ✅ REACT_APP_API_URL trong container: $FRONTEND_ENV"
fi

echo ""
echo "4. Kiểm tra backend API endpoint..."
API_ENDPOINT="$API_URL/api/auth/change-password"
echo "   Testing: PUT $API_ENDPOINT"

# Test với curl (không cần token để test connection)
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$API_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{"old_password":"test","new_password":"test"}' 2>&1)

if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "400" ]; then
    echo "   ✅ Backend đang phản hồi (HTTP $RESPONSE - cần token/mật khẩu hợp lệ)"
elif [ "$RESPONSE" = "000" ] || [ -z "$RESPONSE" ]; then
    echo "   ❌ Không thể kết nối đến backend (HTTP $RESPONSE)"
    echo "   → Kiểm tra:"
    echo "     - Backend có đang chạy không?"
    echo "     - IP/Port có đúng không? ($API_URL)"
    echo "     - Firewall có chặn không?"
else
    echo "   ⚠️  Backend trả về: HTTP $RESPONSE"
fi

echo ""
echo "5. Kiểm tra logs frontend (10 dòng cuối)..."
echo "   (Kiểm tra console.log về API URL)"
docker logs --tail 10 $FRONTEND_CONTAINER 2>&1 | grep -i "api\|axios\|baseurl" || echo "   Không tìm thấy log liên quan"

echo ""
echo "6. Kiểm tra logs backend (10 dòng cuối)..."
docker logs --tail 10 $BACKEND_CONTAINER 2>&1 | grep -i "change.*password\|đổi.*mật" || echo "   Không tìm thấy log liên quan"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 HƯỚNG DẪN DEBUG:"
echo ""
echo "1. Mở browser console (F12) và thử đổi mật khẩu"
echo "2. Kiểm tra các log sau:"
echo "   - '🔧 Axios Config' - xem API_BASE_URL có đúng không"
echo "   - '📤 PUT .../auth/change-password' - xem request có được gửi không"
echo "   - '📥 Response Error' - xem lỗi cụ thể là gì"
echo ""
echo "3. Nếu API_BASE_URL sai hoặc là localhost:"
echo "   → Rebuild frontend: docker-compose up -d --build frontend"
echo ""
echo "4. Nếu không nhận được response:"
echo "   → Kiểm tra backend có đang chạy: docker ps | grep backend"
echo "   → Kiểm tra backend logs: docker logs fullstack-backend"
echo ""
echo "5. Nếu vẫn không được, kiểm tra network:"
echo "   → Từ frontend container: docker exec fullstack-frontend wget -O- $API_URL/api/health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


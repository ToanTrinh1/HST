1. BUILD CẢ CLIENT & SERVER:
make up          # Chạy ngầm (dùng hằng ngày)
make dev         # Chạy + xem logs (dùng khi debug)
make rebuild     # Build lại từ đầu (sau khi cài package mới)
2. TẮT DOCKER:

make down        # Tắt tất cả (giữ data)
make clean       # Tắt + xóa volumes (mất data)

3. RESTART SERVER (Backend):
docker-compose restart backend    # Restart nhanh
make backend-rebuild             # Rebuild + restart

4. RESTART CLIENT (Frontend):
docker-compose restart frontend   # Restart nhanh
make frontend-rebuild            # Rebuild + restart

make frontend-up        # Start frontend
make frontend-down      # Stop frontend
make frontend-logs      # Xem logs frontend
make frontend-rebuild   # Rebuild frontend
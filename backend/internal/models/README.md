# Models

Data structures/entities

## Files:
- `user.go` - User model
- `bet_receipt.go` - Bet Receipt model (Bảng thông tin nhận kèo)
- `wallet.go` - Wallet model (Bảng tiền kèo - tổng hợp tài chính)
- `withdrawal.go` - Withdrawal model (Lịch sử rút tiền)
- `deposit.go` - Deposit model (Lịch sử nộp tiền/cọc)

## Database Schema Overview

### Bảng 1: bet_receipts (Thông tin nhận kèo)
Lưu thông tin các kèo/nhiệm vụ được giao cho user.
- Khi status chuyển sang "DONE" → cần cập nhật wallet

### Bảng 2: wallets (Tiền kèo - Tổng hợp tài chính)
Lưu tổng hợp tài chính theo user.
- Được cập nhật khi:
  - Bet receipt chuyển sang DONE
  - User rút tiền (withdrawal)
  - User nộp cọc (deposit)

### Bảng 3: withdrawals (Lịch sử rút tiền)
Lưu lại các lần rút tiền, có thể query theo tháng.

### Bảng 4: deposits (Lịch sử nộp tiền/Cọc)
Lưu lại các lần nộp cọc, có thể query theo tháng.

## TODO: Công thức tính toán

### 1. actual_amount_cny (trong bet_receipts)
- **Vị trí**: `bet_receipt.go` - field `ActualAmountCNY`
- **Khi nào tính**: Khi bet receipt chuyển sang status "DONE"
- **Công thức**: Cần xác định công thức cụ thể
  - Có thể là: `actual_received_cny - compensation_cny`
  - Hoặc công thức phức tạp hơn dựa trên business logic

### 2. current_balance_vnd (trong wallets)
- **Vị trí**: `wallet.go` - field `CurrentBalanceVND`
- **Khi nào tính**: Sau mỗi thay đổi trong wallet (receive, withdraw, deposit)
- **Công thức**: `current_balance_vnd = total_received_vnd + total_deposit_vnd - total_withdrawn_vnd`

### 3. Exchange Rate (Tỷ giá)
- **Vấn đề**: Cần quyết định cách lưu tỷ giá (3550 VND = 1 CNY)
- **Options**:
  1. Lưu trong config/env variable (nếu tỷ giá cố định)
  2. Lưu trong bảng `exchange_rates` (nếu tỷ giá thay đổi theo thời gian)
  3. Lưu trong từng transaction (nếu mỗi transaction có tỷ giá riêng)
- **Khi tính**: Khi chuyển đổi từ CNY sang VND
  - `total_received_vnd = total_received_cny * exchange_rate`

## Flow hoạt động

### Khi tạo bet receipt mới:
1. Insert vào `bet_receipts` với status = "ĐANG THỰC HIỆN"

### Khi bet receipt chuyển sang "DONE":
1. Update `bet_receipts.status = "DONE"` và set `completed_at`
2. **TODO**: Tính `actual_amount_cny` (công thức chưa xác định)
3. **TODO**: Lấy exchange_rate (chưa quyết định cách lưu)
4. Update `wallets`:
   - `total_received_cny += actual_amount_cny`
   - `total_received_vnd += actual_amount_cny * exchange_rate`
   - **TODO**: Tính lại `current_balance_vnd = total_received_vnd + total_deposit_vnd - total_withdrawn_vnd`

### Khi user rút tiền:
1. **TODO**: Validation - Kiểm tra `current_balance_vnd >= amount_vnd`
2. Insert vào `withdrawals`
3. Update `wallets`:
   - `total_withdrawn_cny += amount_cny` (nếu có)
   - `total_withdrawn_vnd += amount_vnd`
   - **TODO**: Tính lại `current_balance_vnd -= amount_vnd`

### Khi user nộp cọc:
1. Insert vào `deposits`
2. Update `wallets`:
   - `total_deposit_vnd += amount_vnd`
   - **TODO**: Tính lại `current_balance_vnd += amount_vnd`

## Notes

- Tất cả các phần tính toán được comment với TODO
- Cần implement logic tính toán trong service layer
- Có thể dùng database trigger hoặc tính trong code (recommend: tính trong code để dễ test và maintain)
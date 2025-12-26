# 🗄️ Database Design - Hệ thống Quản lý Kèo

## 📋 Tổng quan

Hệ thống gồm 4 bảng chính để quản lý thông tin nhận kèo và tài chính:

1. **bet_receipts** - Thông tin nhận kèo (Bảng 1)
2. **wallets** - Tổng hợp tài chính (Bảng 2)
3. **withdrawals** - Lịch sử rút tiền
4. **deposits** - Lịch sử nộp tiền/Cọc

## 📊 Sơ đồ quan hệ

```
users
  ├── bet_receipts (1:N) - Một user có nhiều bet receipt
  ├── wallets (1:1) - Một user có một wallet
  ├── withdrawals (1:N) - Một user có nhiều lần rút tiền
  └── deposits (1:N) - Một user có nhiều lần nộp cọc
```

## 📁 Cấu trúc Files

### Models (Go structs)
- `backend/internal/models/bet_receipt.go` - Model cho bet receipts
- `backend/internal/models/wallet.go` - Model cho wallets
- `backend/internal/models/withdrawal.go` - Model cho withdrawals
- `backend/internal/models/deposit.go` - Model cho deposits

### Migration
- `backend/migrations/001_create_bet_tables.sql` - SQL script để tạo các bảng

## 🔑 Các bảng chi tiết

### 1. bet_receipts (Thông tin nhận kèo)

**Mục đích**: Lưu thông tin các kèo/nhiệm vụ được giao cho user.

**Các trường quan trọng**:
- `user_id` - FK đến users
- `task_code` - Mã nhiệm vụ (vd: "lb3-kc1", "kc4-96-ct")
- `bet_type` - Loại kèo: "web" hoặc "Kèo ngoài"
- `status` - Tiến độ: "ĐANG THỰC HIỆN", "DONE", "CHỜ CHẤP NHẬN", "HỦY BỎ", "ĐỀN"
- `actual_amount_cny` - ⚠️ **TODO: Cần tính toán** (Công thực nhận)

**Status Flow**:
```
ĐANG THỰC HIỆN → DONE (khi hoàn thành)
                → CHỜ CHẤP NHẬN
                → HỦY BỎ
                → ĐỀN
```

### 2. wallets (Tổng hợp tài chính)

**Mục đích**: Lưu tổng hợp tài chính theo user (tương đương với Bảng 2 trong Excel).

**Các trường quan trọng**:
- `user_id` - FK đến users (UNIQUE)
- `total_received_cny` - Tổng công thực nhận (tệ)
- `total_withdrawn_cny` - Tổng đã rút (tệ)
- `total_received_vnd` - Tổng công thực nhận (VND)
- `total_deposit_vnd` - Tổng cọc (VND)
- `total_withdrawn_vnd` - Tổng đã rút (VND)
- `current_balance_vnd` - ⚠️ **TODO: Cần tính toán** (Số dư hiện tại)

**Công thức tính** (TODO):
```
current_balance_vnd = total_received_vnd + total_deposit_vnd - total_withdrawn_vnd
```

### 3. withdrawals (Lịch sử rút tiền)

**Mục đích**: Lưu lịch sử các lần rút tiền để có thể query theo tháng (T9, T10, T11, T12, ...).

**Các trường quan trọng**:
- `user_id` - FK đến users
- `amount_cny` - Số tiền rút (tệ) - nullable
- `amount_vnd` - Số tiền rút (VND)
- `withdrawal_month` - Tháng rút (format: "YYYY-MM")

### 4. deposits (Lịch sử nộp tiền/Cọc)

**Mục đích**: Lưu lịch sử các lần nộp cọc để có thể query theo tháng.

**Các trường quan trọng**:
- `user_id` - FK đến users
- `amount_vnd` - Số tiền cọc (VND)
- `deposit_month` - Tháng nộp (format: "YYYY-MM")

## 🔄 Flow hoạt động

### Flow 1: Tạo bet receipt mới

```
1. User/admin tạo bet receipt mới
2. Insert vào bet_receipts với status = "ĐANG THỰC HIỆN"
3. Wallet chưa thay đổi
```

### Flow 2: Bet receipt chuyển sang DONE

```
1. Update bet_receipts:
   - status = "DONE"
   - completed_at = NOW()
   - ⚠️ actual_amount_cny = [TÍNH TOÁN] (cần công thức)

2. Lấy exchange_rate (TODO: chưa quyết định cách lưu)

3. Update wallets:
   - total_received_cny += actual_amount_cny
   - total_received_vnd += actual_amount_cny * exchange_rate
   - ⚠️ current_balance_vnd = [TÍNH LẠI] (total_received_vnd + total_deposit_vnd - total_withdrawn_vnd)
```

### Flow 3: User rút tiền

```
1. ⚠️ Validation: Kiểm tra current_balance_vnd >= amount_vnd

2. Insert vào withdrawals:
   - user_id, amount_vnd, withdrawal_month = NOW().Format("YYYY-MM")

3. Update wallets:
   - total_withdrawn_vnd += amount_vnd
   - total_withdrawn_cny += amount_cny (nếu có)
   - ⚠️ current_balance_vnd = [TÍNH LẠI] (current_balance_vnd - amount_vnd)
```

### Flow 4: User nộp cọc

```
1. Insert vào deposits:
   - user_id, amount_vnd, deposit_month = NOW().Format("YYYY-MM")

2. Update wallets:
   - total_deposit_vnd += amount_vnd
   - ⚠️ current_balance_vnd = [TÍNH LẠI] (current_balance_vnd + amount_vnd)
```

## ⚠️ TODO: Các phần cần implement

### 1. Công thức tính actual_amount_cny

**Vị trí**: `bet_receipt.go` - field `ActualAmountCNY`

**Khi nào tính**: Khi bet receipt chuyển sang status "DONE"

**Công thức**: ⚠️ **CHƯA XÁC ĐỊNH**
- Có thể là: `actual_received_cny - compensation_cny`
- Hoặc công thức phức tạp hơn dựa trên business logic
- **Cần hỏi business để xác định công thức chính xác**

### 2. Công thức tính current_balance_vnd

**Vị trí**: `wallet.go` - field `CurrentBalanceVND`

**Khi nào tính**: Sau mỗi thay đổi trong wallet (receive, withdraw, deposit)

**Công thức**: 
```
current_balance_vnd = total_received_vnd + total_deposit_vnd - total_withdrawn_vnd
```

**Implement**: Có thể tính trong code (service layer) hoặc dùng database trigger

### 3. Exchange Rate (Tỷ giá)

**Vấn đề**: Tỷ giá hiện tại trong hình là **3550 VND = 1 CNY**

**Cần quyết định cách lưu**:
1. **Option 1**: Lưu trong config/env variable (nếu tỷ giá cố định)
2. **Option 2**: Lưu trong bảng `exchange_rates` (nếu tỷ giá thay đổi theo thời gian)
3. **Option 3**: Lưu trong từng transaction (nếu mỗi transaction có tỷ giá riêng)

**Khi tính**: 
```go
total_received_vnd = total_received_cny * exchange_rate
```

### 4. Validation khi rút tiền

**Vị trí**: `withdrawal.go` - `CreateWithdrawalRequest`

**Logic**: 
```go
if amount_vnd > current_balance_vnd {
    return error("Số dư không đủ")
}
```

## 📝 Notes

- Tất cả các phần tính toán được comment với `// TODO:` trong code
- Các trường cần tính toán đã được đánh dấu trong SQL migration
- Recommend: Implement logic tính toán trong **service layer** thay vì dùng database trigger (dễ test và maintain hơn)
- Cần implement transactions để đảm bảo tính nhất quán khi update nhiều bảng cùng lúc

## 🚀 Next Steps

1. ✅ Thiết kế database schema (DONE)
2. ⏳ Chạy migration để tạo tables
3. ⏳ Implement repository layer (CRUD operations)
4. ⏳ Implement service layer (business logic + tính toán)
5. ⏳ Implement API handlers
6. ⏳ Test các flows




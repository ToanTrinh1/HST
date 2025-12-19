# Models

Data structures/entities

## Files:
- `user.go` - User model
- `order.go` - Order model
- `wallet.go` - Wallet model
- `transaction.go` - Transaction model

## Example:
```go
type User struct {
    ID        string
    Email     string
    Name      string
    CreatedAt time.Time
}
```

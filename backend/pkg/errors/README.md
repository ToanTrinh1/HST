# Errors

Custom error types

## Files:
- `errors.go` - Define custom errors
- `codes.go` - Error codes

## Example:
```go
var (
    ErrUserNotFound     = errors.New("user not found")
    ErrInvalidPassword  = errors.New("invalid password")
    ErrUnauthorized     = errors.New("unauthorized")
)
```

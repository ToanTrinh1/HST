# Config

Configuration management

## Files:
- `config.go` - Load config from env
- `database.go` - Database config
- `jwt.go` - JWT config

## Example:
```go
type Config struct {
    Port       string
    DBHost     string
    DBPort     string
    JWTSecret  string
}
```

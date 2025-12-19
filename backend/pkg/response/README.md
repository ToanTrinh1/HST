# Response

Response helpers - Format API responses

## Files:
- `response.go` - Success/Error response helpers

## Example:
```go
// Success response
Success(c *gin.Context, data interface{})

// Error response
Error(c *gin.Context, code int, message string)
```

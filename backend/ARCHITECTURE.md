# 🏗️ Backend Architecture

## 📁 Cấu trúc theo Clean Architecture / Layered Architecture

```
backend/
│
├── cmd/                         ← Entry points
│   └── api/
│       └── main.go              → Start server, dependency injection
│
├── internal/                    ← Private code (không export ra ngoài)
│   │
│   ├── api/                     ← API Layer (Presentation Layer)
│   │   ├── handlers/            → HTTP handlers (controllers)
│   │   │   ├── auth_handler.go
│   │   │   ├── user_handler.go
│   │   │   └── order_handler.go
│   │   │
│   │   └── routes/              → Route definitions
│   │       └── routes.go
│   │
│   ├── service/                 ← Service Layer (Business Logic)
│   │   ├── auth_service.go      → Auth logic, validation
│   │   ├── user_service.go      → User business logic
│   │   └── order_service.go     → Order business logic
│   │
│   ├── repository/              ← Repository Layer (Data Access)
│   │   ├── user_repository.go   → User database operations
│   │   └── order_repository.go  → Order database operations
│   │
│   ├── models/                  ← Data Models (Entities)
│   │   ├── user.go              → User struct
│   │   └── order.go             → Order struct
│   │
│   ├── middleware/              ← HTTP Middlewares
│   │   ├── auth_middleware.go   → JWT authentication
│   │   └── logger_middleware.go → Request logging
│   │
│   └── config/                  ← Configuration
│       └── config.go            → Load config from env
│
├── pkg/                         ← Public libraries (có thể reuse)
│   ├── utils/                   → Utility functions
│   ├── errors/                  → Custom errors
│   ├── response/                → Response helpers
│   └── validator/               → Validation helpers
│
├── migrations/                  ← Database migrations
│   ├── 001_create_users.up.sql
│   └── 001_create_users.down.sql
│
├── docs/                        ← Documentation
│   └── swagger.yaml
│
├── Dockerfile
├── go.mod
└── go.sum
```

---

## 🔄 Flow hoạt động

```
HTTP Request
    ↓
Handler (API Layer)
    ↓
Service (Business Logic)
    ↓
Repository (Data Access)
    ↓
Database
```

---

## 📊 Phân tầng chi tiết

### 1️⃣ **API Layer** (`internal/api/`)

**Trách nhiệm:**
- Nhận HTTP requests
- Parse request body
- Call Service layer
- Trả HTTP response
- **KHÔNG** chứa business logic

**Example:**
```go
// handlers/auth_handler.go
func (h *AuthHandler) Login(c *gin.Context) {
    var req LoginRequest
    c.BindJSON(&req)
    
    // Gọi service
    token, err := h.authService.Login(req.Email, req.Password)
    
    // Trả response
    c.JSON(200, gin.H{"token": token})
}
```

---

### 2️⃣ **Service Layer** (`internal/service/`)

**Trách nhiệm:**
- Business logic
- Validation
- Transform data
- Orchestrate nhiều repositories
- **KHÔNG** biết về HTTP

**Example:**
```go
// service/auth_service.go
func (s *AuthService) Login(email, password string) (string, error) {
    // Validation
    if !isValidEmail(email) {
        return "", errors.New("invalid email")
    }
    
    // Gọi repository
    user, err := s.userRepo.FindByEmail(email)
    
    // Business logic
    if !checkPassword(password, user.Password) {
        return "", errors.New("wrong password")
    }
    
    // Generate token
    token := generateJWT(user)
    return token, nil
}
```

---

### 3️⃣ **Repository Layer** (`internal/repository/`)

**Trách nhiệm:**
- Database operations (CRUD)
- SQL queries
- Transaction management
- **KHÔNG** chứa business logic

**Example:**
```go
// repository/user_repository.go
func (r *UserRepository) FindByEmail(email string) (*User, error) {
    var user User
    err := r.db.QueryRow(
        "SELECT id, email, name FROM users WHERE email = $1",
        email,
    ).Scan(&user.ID, &user.Email, &user.Name)
    
    return &user, err
}
```

---

### 4️⃣ **Models** (`internal/models/`)

**Trách nhiệm:**
- Định nghĩa data structures

**Example:**
```go
// models/user.go
type User struct {
    ID        string    `json:"id"`
    Email     string    `json:"email"`
    Name      string    `json:"name"`
    Password  string    `json:"-"`
    CreatedAt time.Time `json:"created_at"`
}
```

---

### 5️⃣ **Middleware** (`internal/middleware/`)

**Trách nhiệm:**
- Authentication
- Logging
- CORS
- Rate limiting

**Example:**
```go
// middleware/auth_middleware.go
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        
        if !validateJWT(token) {
            c.JSON(401, gin.H{"error": "unauthorized"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

---

### 6️⃣ **Config** (`internal/config/`)

**Trách nhiệm:**
- Load config từ environment variables

**Example:**
```go
// config/config.go
type Config struct {
    Port      string
    DBHost    string
    DBPort    string
    JWTSecret string
}

func Load() *Config {
    return &Config{
        Port:      os.Getenv("PORT"),
        DBHost:    os.Getenv("DB_HOST"),
        JWTSecret: os.Getenv("JWT_SECRET"),
    }
}
```

---

### 7️⃣ **Pkg** (`pkg/`)

**Trách nhiệm:**
- Public utilities (có thể dùng ở nhiều project)

**Example:**
```go
// pkg/utils/hash.go
func HashPassword(password string) (string, error) {
    return bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
}

// pkg/response/response.go
func Success(c *gin.Context, data interface{}) {
    c.JSON(200, gin.H{
        "success": true,
        "data":    data,
    })
}
```

---

## 🎯 Nguyên tắc quan trọng

### ✅ **DO:**

1. **Dependency Injection**
   - Handler nhận Service qua constructor
   - Service nhận Repository qua constructor

2. **Tách biệt rõ ràng**
   - Handler chỉ handle HTTP
   - Service chứa business logic
   - Repository chỉ access database

3. **Error handling**
   - Mỗi layer return error rõ ràng
   - Handler convert error thành HTTP status code

### ❌ **DON'T:**

1. **KHÔNG** viết business logic trong Handler
2. **KHÔNG** viết SQL queries trong Service
3. **KHÔNG** access HTTP request/response trong Service
4. **KHÔNG** có business logic trong Repository

---

## 📝 Example: Authentication Flow

```
1. POST /api/login
   ↓
2. Handler.Login()
   - Parse request body
   - Call Service.Login()
   ↓
3. Service.Login()
   - Validate email/password
   - Call Repository.FindByEmail()
   - Check password
   - Generate JWT token
   - Return token
   ↓
4. Repository.FindByEmail()
   - Query database
   - Return user
   ↓
5. Handler trả response:
   {
     "success": true,
     "token": "eyJhbGc..."
   }
```

---

## 🔥 Ưu điểm kiến trúc này

| Ưu điểm | Mô tả |
|---------|-------|
| ✅ **Testable** | Dễ test từng layer độc lập |
| ✅ **Maintainable** | Dễ maintain, sửa bug |
| ✅ **Scalable** | Dễ thêm features mới |
| ✅ **Clear separation** | Mỗi layer có trách nhiệm rõ ràng |
| ✅ **Reusable** | Service có thể dùng cho HTTP, gRPC, CLI... |

---

## 📚 Next Steps

1. ✅ Structure đã có (DONE)
2. 📝 Code từng layer theo thứ tự:
   - Models
   - Repository
   - Service
   - Handler
   - Middleware
   - Config

---

**Sẵn sàng code theo kiến trúc chuẩn! 🚀**

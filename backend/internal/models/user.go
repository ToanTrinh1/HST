package models

import "time"

// json Map JSON <-> struct
// db : để map xuống db
// binding:"required" Bắt buộc phải có trường này
// Password string `json:"password" binding:"required,min=6"` : Bắt buộc phải có trường này và ít nhất 6 ký tự ( nghĩa là pass phải có 6 kí tự)
// binding:"email" Validate đúng định dạng email

type User struct {
	ID        string    `json:"id" db:"id"`
	Email     string    `json:"email" db:"email"`
	Password  string    `json:"-" db:"password"`
	Name      string    `json:"name" db:"name"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// Request DTOs
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// Response DTOs
type AuthResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}

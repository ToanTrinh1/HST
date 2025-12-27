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
	Password  string    `json:"-" db:"mat_khau"`
	Name      string    `json:"name" db:"ten"`
	Role      string    `json:"vai_tro" db:"vai_tro"`
	AvatarURL *string   `json:"avatar_url" db:"avatar_url"` // Nullable
	CreatedAt time.Time `json:"created_at" db:"thoi_gian_tao"`
	UpdatedAt time.Time `json:"updated_at" db:"thoi_gian_cap_nhat"`
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

type UpdateProfileRequest struct {
	Name  string `json:"name" binding:"required"`
	Email string `json:"email" binding:"required,email"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

type SendVerificationCodeRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type VerifyEmailCodeRequest struct {
	Email string `json:"email" binding:"required,email"`
	Code  string `json:"code" binding:"required"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// Response DTOs
type AuthResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}

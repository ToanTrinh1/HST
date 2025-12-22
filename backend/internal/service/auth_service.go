package service

// chứa logic đăng nhập và đăng kí

import (
	"database/sql"
	"errors"
	"fullstack-backend/internal/models"
	"fullstack-backend/internal/repository"
	"fullstack-backend/pkg/utils"
	"log"
)

type AuthService struct {
	userRepo  *repository.UserRepository
	jwtSecret string
}

func NewAuthService(userRepo *repository.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
	}
}

// Register - Đăng ký user mới
func (s *AuthService) Register(req *models.RegisterRequest) (*models.AuthResponse, error) {
	log.Printf("Service - Kiểm tra email: %s", req.Email)

	// 1. Kiểm tra email đã tồn tại chưa
	existingUser, _ := s.userRepo.FindByEmail(req.Email)
	if existingUser != nil {
		log.Printf("Service - ❌ Email đã tồn tại: %s", req.Email)
		return nil, errors.New("Email đã tồn tại trong hệ thống")
	}
	log.Println("Service - ✅ Email chưa tồn tại, tiếp tục đăng ký")

	// 2. Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		log.Printf("Service - ❌ Lỗi hash password: %v", err)
		return nil, errors.New("Lỗi khi mã hóa mật khẩu")
	}
	log.Println("Service - ✅ Password đã được mã hóa")

	// 3. Tạo user mới (mặc định role là "user")
	user := &models.User{
		Email:    req.Email,
		Password: hashedPassword,
		Name:     req.Name,
		Role:     "user", // Mặc định là user
	}

	if err := s.userRepo.Create(user); err != nil {
		log.Printf("Service - ❌ Lỗi tạo user trong DB: %v", err)
		return nil, errors.New("Lỗi khi tạo tài khoản: " + err.Error())
	}
	log.Printf("Service - ✅ User đã được tạo với ID: %s", user.ID)

	// 4. Generate JWT token
	token, err := utils.GenerateJWT(user.ID, user.Email, user.Role, s.jwtSecret)
	if err != nil {
		log.Printf("Service - ❌ Lỗi tạo JWT token: %v", err)
		return nil, errors.New("Lỗi khi tạo token xác thực")
	}
	log.Println("Service - ✅ JWT token đã được tạo")

	// 5. Trả về response (không trả password)
	user.Password = ""
	return &models.AuthResponse{
		Token: token,
		User:  user,
	}, nil
}

// Login - Đăng nhập
func (s *AuthService) Login(req *models.LoginRequest) (*models.AuthResponse, error) {
	// 1. Tìm user theo email
	user, err := s.userRepo.FindByEmail(req.Email)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("invalid credentials")
		}
		return nil, err
	}

	// 2. Kiểm tra password
	if !utils.CheckPassword(user.Password, req.Password) {
		return nil, errors.New("invalid credentials")
	}

	// 3. Generate JWT token
	token, err := utils.GenerateJWT(user.ID, user.Email, user.Role, s.jwtSecret)
	if err != nil {
		return nil, err
	}

	// 4. Trả về response (không trả password)
	user.Password = ""
	return &models.AuthResponse{
		Token: token,
		User:  user,
	}, nil
}

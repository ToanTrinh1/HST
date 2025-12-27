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

// GetCurrentUser - Lấy thông tin user hiện tại theo userID (dùng cho GetCurrentUser endpoint)
func (s *AuthService) GetCurrentUser(userID string) (*models.User, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}
	// Không trả password
	user.Password = ""
	return user, nil
}

// GetAllUsers - Lấy tất cả users (chỉ role = 'user', có phân trang)
func (s *AuthService) GetAllUsers(limit, offset int) ([]*models.User, error) {
	users, err := s.userRepo.GetAllUsers(limit, offset)
	if err != nil {
		return nil, err
	}
	// Không trả password
	for _, user := range users {
		user.Password = ""
	}
	return users, nil
}

// UpdateProfile - Cập nhật thông tin profile của user (tên và email)
func (s *AuthService) UpdateProfile(userID string, req *models.UpdateProfileRequest) (*models.User, error) {
	log.Printf("Service - Cập nhật profile cho user ID: %s", userID)

	// 1. Kiểm tra user có tồn tại không
	existingUser, err := s.userRepo.FindByID(userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("User không tồn tại")
		}
		return nil, err
	}

	// 2. Kiểm tra email mới có bị trùng với user khác không (nếu email thay đổi)
	if req.Email != existingUser.Email {
		userWithEmail, _ := s.userRepo.FindByEmail(req.Email)
		if userWithEmail != nil && userWithEmail.ID != userID {
			log.Printf("Service - ❌ Email đã được sử dụng bởi user khác: %s", req.Email)
			return nil, errors.New("Email đã được sử dụng bởi tài khoản khác")
		}
	}

	// 3. Cập nhật thông tin trong database
	err = s.userRepo.UpdateUser(userID, req.Name, req.Email)
	if err != nil {
		log.Printf("Service - ❌ Lỗi cập nhật user trong DB: %v", err)
		return nil, errors.New("Lỗi khi cập nhật thông tin: " + err.Error())
	}

	// 4. Lấy lại thông tin user đã cập nhật
	updatedUser, err := s.userRepo.FindByID(userID)
	if err != nil {
		log.Printf("Service - ❌ Lỗi lấy lại thông tin user: %v", err)
		return nil, errors.New("Lỗi khi lấy thông tin user đã cập nhật")
	}

	// 5. Không trả password
	updatedUser.Password = ""
	log.Printf("Service - ✅ Cập nhật profile thành công - User ID: %s, Name: %s, Email: %s", updatedUser.ID, updatedUser.Name, updatedUser.Email)

	return updatedUser, nil
}

// ChangePassword - Đổi mật khẩu của user
func (s *AuthService) ChangePassword(userID string, req *models.ChangePasswordRequest) error {
	log.Printf("Service - Đổi mật khẩu cho user ID: %s", userID)

	// 1. Kiểm tra user có tồn tại không
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return errors.New("User không tồn tại")
		}
		return err
	}

	// 2. Kiểm tra mật khẩu cũ có đúng không
	if !utils.CheckPassword(user.Password, req.OldPassword) {
		log.Printf("Service - ❌ Mật khẩu cũ không đúng")
		return errors.New("Mật khẩu cũ không đúng")
	}

	// 3. Kiểm tra mật khẩu mới có khác mật khẩu cũ không
	if req.OldPassword == req.NewPassword {
		log.Printf("Service - ❌ Mật khẩu mới phải khác mật khẩu cũ")
		return errors.New("Mật khẩu mới phải khác mật khẩu cũ")
	}

	// 4. Hash mật khẩu mới
	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		log.Printf("Service - ❌ Lỗi hash password: %v", err)
		return errors.New("Lỗi khi mã hóa mật khẩu")
	}

	// 5. Cập nhật mật khẩu trong database
	err = s.userRepo.UpdatePassword(userID, hashedPassword)
	if err != nil {
		log.Printf("Service - ❌ Lỗi cập nhật mật khẩu trong DB: %v", err)
		return errors.New("Lỗi khi cập nhật mật khẩu: " + err.Error())
	}

	log.Printf("Service - ✅ Đổi mật khẩu thành công - User ID: %s", userID)
	return nil
}

// UpdateAvatar - Cập nhật ảnh đại diện của user
func (s *AuthService) UpdateAvatar(userID string, avatarURL string) (*models.User, error) {
	log.Printf("Service - Cập nhật avatar cho user ID: %s", userID)

	// 1. Kiểm tra user có tồn tại không
	_, err := s.userRepo.FindByID(userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("User không tồn tại")
		}
		return nil, err
	}

	// 2. Cập nhật avatar URL trong database
	err = s.userRepo.UpdateAvatar(userID, avatarURL)
	if err != nil {
		log.Printf("Service - ❌ Lỗi cập nhật avatar trong DB: %v", err)
		return nil, errors.New("Lỗi khi cập nhật avatar: " + err.Error())
	}

	// 3. Lấy lại thông tin user đã cập nhật
	updatedUser, err := s.userRepo.FindByID(userID)
	if err != nil {
		log.Printf("Service - ❌ Lỗi lấy lại thông tin user: %v", err)
		return nil, errors.New("Lỗi khi lấy thông tin user đã cập nhật")
	}

	// 4. Không trả password
	updatedUser.Password = ""
	log.Printf("Service - ✅ Cập nhật avatar thành công - User ID: %s, Avatar URL: %s", updatedUser.ID, avatarURL)

	return updatedUser, nil
}

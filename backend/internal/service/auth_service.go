package service

// chứa logic đăng nhập và đăng kí

import (
	"database/sql"
	"errors"
	"fmt"
	"fullstack-backend/internal/models"
	"fullstack-backend/internal/repository"
	"fullstack-backend/pkg/utils"
	"log"
	"time"
)

type AuthService struct {
	userRepo    *repository.UserRepository
	jwtSecret   string
	otpService  *OTPService
	emailService interface {
		SendVerificationCodeEmail(to, code string) error
		SendPasswordResetEmail(to, resetLink string) error
		IsConfigured() bool
	}
}

func NewAuthService(userRepo *repository.UserRepository, jwtSecret string, emailService interface {
	SendVerificationCodeEmail(to, code string) error
	SendPasswordResetEmail(to, resetLink string) error
	IsConfigured() bool
}) *AuthService {
	return &AuthService{
		userRepo:     userRepo,
		jwtSecret:    jwtSecret,
		otpService:   NewOTPService(),
		emailService: emailService,
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

// UpdateProfile - Cập nhật thông tin profile của user (chỉ cho phép đổi tên, không cho phép đổi email)
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

	// 2. KHÔNG cho phép đổi email
	// Email không được thay đổi, giữ nguyên email hiện tại
	log.Printf("Service - Email không được phép thay đổi, giữ nguyên: %s", existingUser.Email)

	// 3. Kiểm tra thời gian đổi tên (chỉ được đổi 1 tháng 1 lần)
	if existingUser.LastNameChangeTime != nil {
		lastChangeTime := *existingUser.LastNameChangeTime
		oneMonthAgo := time.Now().AddDate(0, -1, 0) // 1 tháng trước
		
		if lastChangeTime.After(oneMonthAgo) {
			daysRemaining := int(time.Until(lastChangeTime.AddDate(0, 1, 0)).Hours() / 24)
			log.Printf("Service - ❌ Chưa đủ 1 tháng kể từ lần đổi tên cuối. Còn lại: %d ngày", daysRemaining)
			return nil, fmt.Errorf("Bạn chỉ có thể đổi tên 1 lần mỗi tháng. Lần đổi tên cuối: %s. Vui lòng thử lại sau %d ngày", 
				lastChangeTime.Format("02/01/2006"), daysRemaining)
		}
	}

	// 4. Kiểm tra tên có thay đổi không
	if req.Name == existingUser.Name {
		log.Printf("Service - Tên không thay đổi, không cần cập nhật")
		return existingUser, nil
	}

	// 5. Cập nhật chỉ tên (không đổi email)
	err = s.userRepo.UpdateUserName(userID, req.Name)
	if err != nil {
		log.Printf("Service - ❌ Lỗi cập nhật tên trong DB: %v", err)
		return nil, errors.New("Lỗi khi cập nhật thông tin: " + err.Error())
	}

	// 6. Lấy lại thông tin user đã cập nhật
	updatedUser, err := s.userRepo.FindByID(userID)
	if err != nil {
		log.Printf("Service - ❌ Lỗi lấy lại thông tin user: %v", err)
		return nil, errors.New("Lỗi khi lấy thông tin user đã cập nhật")
	}

	// 7. Không trả password
	updatedUser.Password = ""
	log.Printf("Service - ✅ Cập nhật tên thành công - User ID: %s, Name: %s (Email giữ nguyên: %s)", 
		updatedUser.ID, updatedUser.Name, updatedUser.Email)

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

// SendVerificationCode - Gửi mã xác thực email
func (s *AuthService) SendVerificationCode(email string) error {
	log.Printf("Service - Gửi mã xác thực cho email: %s", email)
	
	// Kiểm tra email đã tồn tại chưa (để tránh đăng ký email đã có)
	existingUser, _ := s.userRepo.FindByEmail(email)
	if existingUser != nil {
		log.Printf("Service - ❌ Email đã tồn tại: %s", email)
		return errors.New("Email đã tồn tại trong hệ thống")
	}
	
	// Tạo mã OTP
	code := s.otpService.GenerateOTP()
	
	// Lưu OTP
	s.otpService.StoreOTP(email, code)
	
	// Gửi email mã xác thực
	if s.emailService != nil && s.emailService.IsConfigured() {
		err := s.emailService.SendVerificationCodeEmail(email, code)
		if err != nil {
			log.Printf("Service - ❌ Lỗi gửi email: %v", err)
			// Vẫn log mã ra console để test nếu gửi email thất bại
			log.Printf("Service - ✅ Mã xác thực cho email %s: %s", email, code)
			return fmt.Errorf("lỗi gửi email: %v", err)
		}
		log.Printf("Service - ✅ Email mã xác thực đã được gửi đến: %s", email)
	} else {
		// Nếu email service chưa được cấu hình, log ra console
		log.Printf("Service - ✅ Mã xác thực cho email %s: %s", email, code)
		log.Printf("Service - ⚠️  Email service chưa được cấu hình. Mã được log ra console.")
	}
	
	return nil
}

// VerifyEmailCode - Xác thực mã OTP
func (s *AuthService) VerifyEmailCode(email, code string) error {
	log.Printf("Service - Xác thực mã OTP cho email: %s", email)
	
	if !s.otpService.VerifyOTP(email, code) {
		return errors.New("Mã xác thực không đúng hoặc đã hết hạn")
	}
	
	log.Printf("Service - ✅ Email %s đã được xác thực thành công", email)
	return nil
}

// ForgotPassword - Gửi email đặt lại mật khẩu
func (s *AuthService) ForgotPassword(email string) error {
	log.Printf("Service - Xử lý quên mật khẩu cho email: %s", email)
	
	// Kiểm tra email có tồn tại không
	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		if err == sql.ErrNoRows {
			// Không trả lỗi cụ thể để tránh email enumeration
			log.Printf("Service - Email không tồn tại: %s (không trả lỗi để bảo mật)", email)
		} else {
			log.Printf("Service - ❌ Lỗi khi tìm email: %v", err)
			return errors.New("Lỗi khi xử lý yêu cầu")
		}
	} else {
		log.Printf("Service - ✅ Tìm thấy user với email: %s, User ID: %s", email, user.ID)
		
		// Tạo reset link (trong production, nên tạo token và lưu vào DB)
		// Hiện tại tạm thời tạo link đơn giản
		resetLink := fmt.Sprintf("http://localhost:3000/reset-password?email=%s&token=RESET_TOKEN_HERE", email)
		
		// Gửi email reset password
		if s.emailService != nil && s.emailService.IsConfigured() {
			err := s.emailService.SendPasswordResetEmail(email, resetLink)
			if err != nil {
				log.Printf("Service - ❌ Lỗi gửi email reset password: %v", err)
				// Vẫn trả về success để tránh email enumeration
			} else {
				log.Printf("Service - ✅ Email đặt lại mật khẩu đã được gửi đến: %s", email)
			}
		} else {
			log.Printf("Service - ⚠️  Email service chưa được cấu hình. Link reset: %s", resetLink)
		}
	}
	
	// Luôn trả về success để tránh email enumeration
	log.Printf("Service - ✅ Email đặt lại mật khẩu đã được gửi (nếu email tồn tại)")
	return nil
}

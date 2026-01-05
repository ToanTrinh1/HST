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
	"regexp"
	"strings"
	"time"
)

type AuthService struct {
	userRepo     *repository.UserRepository
	jwtSecret    string
	otpService   *OTPService
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
	log.Printf("Service - Kiểm tra email: %s, số điện thoại: %s", req.Email, req.PhoneNumber)

	// 1. Kiểm tra email đã tồn tại chưa
	existingUser, _ := s.userRepo.FindByEmail(req.Email)
	if existingUser != nil {
		log.Printf("Service - ❌ Email đã tồn tại: %s", req.Email)
		return nil, errors.New("Email đã tồn tại trong hệ thống")
	}
	log.Println("Service - ✅ Email chưa tồn tại, tiếp tục đăng ký")

	// 2. Validate số điện thoại (chỉ chứa chữ số)
	if !isValidPhoneNumber(req.PhoneNumber) {
		log.Printf("Service - ❌ Số điện thoại không hợp lệ: %s", req.PhoneNumber)
		return nil, errors.New("Số điện thoại chỉ được chứa chữ số")
	}

	// 3. Kiểm tra số điện thoại đã tồn tại chưa
	existingUserByPhone, _ := s.userRepo.FindByPhoneNumber(req.PhoneNumber)
	if existingUserByPhone != nil {
		log.Printf("Service - ❌ Số điện thoại đã tồn tại: %s", req.PhoneNumber)
		return nil, errors.New("Số điện thoại đã tồn tại trong hệ thống")
	}
	log.Println("Service - ✅ Số điện thoại chưa tồn tại, tiếp tục đăng ký")

	// 4. Kiểm tra tên đã tồn tại chưa (phân biệt hoa/thường)
	usersWithSameName, err := s.userRepo.FindByName(req.Name)
	if err != nil {
		log.Printf("Service - ❌ Lỗi khi kiểm tra trùng lặp tên: %v", err)
		return nil, errors.New("Lỗi khi kiểm tra trùng lặp tên: " + err.Error())
	}

	if len(usersWithSameName) > 0 {
		log.Printf("Service - ❌ Tên '%s' đã tồn tại (phân biệt hoa/thường)", req.Name)
		return nil, fmt.Errorf("Tên '%s' đã được sử dụng bởi người dùng khác. Vui lòng chọn tên khác", req.Name)
	}
	log.Println("Service - ✅ Tên chưa tồn tại, tiếp tục đăng ký")

	// 5. Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		log.Printf("Service - ❌ Lỗi hash password: %v", err)
		return nil, errors.New("Lỗi khi mã hóa mật khẩu")
	}
	log.Println("Service - ✅ Password đã được mã hóa")

	// 6. Tạo user mới (mặc định role là "user")
	phoneNumber := req.PhoneNumber
	user := &models.User{
		Email:       req.Email,
		Password:    hashedPassword,
		Name:        req.Name,
		PhoneNumber: &phoneNumber,
		Role:        "user", // Mặc định là user
	}

	if err := s.userRepo.Create(user); err != nil {
		log.Printf("Service - ❌ Lỗi tạo user trong DB: %v", err)
		return nil, errors.New("Lỗi khi tạo tài khoản: " + err.Error())
	}
	log.Printf("Service - ✅ User đã được tạo với ID: %s", user.ID)

	// 7. Generate JWT token
	token, err := utils.GenerateJWT(user.ID, user.Email, user.Role, s.jwtSecret)
	if err != nil {
		log.Printf("Service - ❌ Lỗi tạo JWT token: %v", err)
		return nil, errors.New("Lỗi khi tạo token xác thực")
	}
	log.Println("Service - ✅ JWT token đã được tạo")

	// 8. Trả về response (không trả password)
	user.Password = ""
	return &models.AuthResponse{
		Token: token,
		User:  user,
	}, nil
}

// isEmail kiểm tra xem string có phải là email không (có chứa @)
func isEmail(s string) bool {
	return strings.Contains(s, "@")
}

// isValidPhoneNumber kiểm tra số điện thoại chỉ chứa chữ số (không giới hạn độ dài)
func isValidPhoneNumber(phone string) bool {
	matched, _ := regexp.MatchString(`^\d+$`, phone)
	return matched
}

// Login - Đăng nhập (hỗ trợ cả email và số điện thoại)
func (s *AuthService) Login(req *models.LoginRequest) (*models.AuthResponse, error) {
	var user *models.User
	var err error

	// 1. Kiểm tra xem email_or_phone là email hay số điện thoại
	if isEmail(req.EmailOrPhone) {
		// Tìm user theo email
		log.Printf("Service - Đăng nhập bằng email: %s", req.EmailOrPhone)
		user, err = s.userRepo.FindByEmail(req.EmailOrPhone)
	} else {
		// Tìm user theo số điện thoại
		log.Printf("Service - Đăng nhập bằng số điện thoại: %s", req.EmailOrPhone)
		user, err = s.userRepo.FindByPhoneNumber(req.EmailOrPhone)
	}

	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("Service - ❌ Không tìm thấy user với: %s", req.EmailOrPhone)
			return nil, errors.New("invalid credentials")
		}
		return nil, err
	}

	// 2. Kiểm tra password
	if !utils.CheckPassword(user.Password, req.Password) {
		log.Printf("Service - ❌ Mật khẩu không đúng cho user: %s", req.EmailOrPhone)
		return nil, errors.New("invalid credentials")
	}

	// 3. Generate JWT token
	token, err := utils.GenerateJWT(user.ID, user.Email, user.Role, s.jwtSecret)
	if err != nil {
		return nil, err
	}

	// 4. Trả về response (không trả password)
	user.Password = ""
	log.Printf("Service - ✅ Đăng nhập thành công - User ID: %s", user.ID)
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
	// CHỈ kiểm tra nếu user đã từng đổi tên (LastNameChangeTime != nil)
	// Nếu LastNameChangeTime == nil, có nghĩa là user chưa từng đổi tên, cho phép đổi
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
	nameChanged := req.Name != existingUser.Name

	// 5. Kiểm tra số điện thoại có thay đổi không
	var phoneChanged bool
	var newPhoneNumber *string
	if req.PhoneNumber != "" {
		// Validate số điện thoại (chỉ chứa chữ số)
		if !isValidPhoneNumber(req.PhoneNumber) {
			log.Printf("Service - ❌ Số điện thoại không hợp lệ: %s", req.PhoneNumber)
			return nil, errors.New("Số điện thoại chỉ được chứa chữ số")
		}

		if existingUser.PhoneNumber == nil || *existingUser.PhoneNumber != req.PhoneNumber {
			phoneChanged = true
			// Kiểm tra số điện thoại mới đã tồn tại chưa (nếu thay đổi)
			existingUserByPhone, _ := s.userRepo.FindByPhoneNumber(req.PhoneNumber)
			if existingUserByPhone != nil && existingUserByPhone.ID != userID {
				log.Printf("Service - ❌ Số điện thoại '%s' đã được sử dụng bởi người dùng khác", req.PhoneNumber)
				return nil, fmt.Errorf("Số điện thoại '%s' đã được sử dụng bởi người dùng khác. Vui lòng chọn số khác", req.PhoneNumber)
			}
			newPhoneNumber = &req.PhoneNumber
		} else {
			newPhoneNumber = existingUser.PhoneNumber
		}
	} else {
		// Nếu không cung cấp phone number, giữ nguyên số cũ
		newPhoneNumber = existingUser.PhoneNumber
	}

	// 6. Nếu không có thay đổi gì, trả về user hiện tại
	if !nameChanged && !phoneChanged {
		log.Printf("Service - Không có thay đổi, không cần cập nhật")
		existingUser.Password = ""
		return existingUser, nil
	}

	// 7. Kiểm tra trùng lặp tên (phân biệt hoa/thường) - chỉ kiểm tra nếu tên thay đổi
	if nameChanged {
		usersWithSameName, err := s.userRepo.FindByName(req.Name)
		if err != nil {
			log.Printf("Service - ❌ Lỗi khi kiểm tra trùng lặp tên: %v", err)
			return nil, errors.New("Lỗi khi kiểm tra trùng lặp tên: " + err.Error())
		}

		// Kiểm tra xem có user khác (ngoài user hiện tại) đã có tên này chưa
		for _, u := range usersWithSameName {
			if u.ID != userID {
				log.Printf("Service - ❌ Tên '%s' đã tồn tại (phân biệt hoa/thường)", req.Name)
				return nil, fmt.Errorf("Tên '%s' đã được sử dụng bởi người dùng khác. Vui lòng chọn tên khác", req.Name)
			}
		}
	}

	// 8. Cập nhật tên và số điện thoại (không đổi email)
	// Chỉ update thời gian đổi tên nếu tên thay đổi
	err = s.userRepo.UpdateUserProfile(userID, req.Name, newPhoneNumber, nameChanged)
	if err != nil {
		log.Printf("Service - ❌ Lỗi cập nhật thông tin trong DB: %v", err)
		return nil, errors.New("Lỗi khi cập nhật thông tin: " + err.Error())
	}

	// 7. Lấy lại thông tin user đã cập nhật
	updatedUser, err := s.userRepo.FindByID(userID)
	if err != nil {
		log.Printf("Service - ❌ Lỗi lấy lại thông tin user: %v", err)
		return nil, errors.New("Lỗi khi lấy thông tin user đã cập nhật")
	}

	// 8. Không trả password
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

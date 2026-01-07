package service

import (
	"crypto/rand"
	"fmt"
	"log"
	"sync"
	"time"
)

// OTPData lưu trữ thông tin OTP
type OTPData struct {
	Code      string
	Email     string
	ExpiresAt time.Time
}

// OTPService quản lý OTP codes
type OTPService struct {
	otps map[string]*OTPData
	mu   sync.RWMutex
}

// NewOTPService tạo OTP service mới
func NewOTPService() *OTPService {
	service := &OTPService{
		otps: make(map[string]*OTPData),
	}
	// Cleanup expired OTPs mỗi 5 phút
	go service.cleanupExpiredOTPs()
	return service
}

// GenerateOTP tạo mã OTP 6 chữ số
func (s *OTPService) GenerateOTP() string {
	// Tạo số ngẫu nhiên từ 100000 đến 999999
	code := make([]byte, 4)
	rand.Read(code)
	num := int(code[0])<<24 | int(code[1])<<16 | int(code[2])<<8 | int(code[3])
	if num < 0 {
		num = -num
	}
	return fmt.Sprintf("%06d", num%900000+100000)
}

// StoreOTP lưu OTP code với thời gian hết hạn (5 phút)
func (s *OTPService) StoreOTP(email, code string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	s.otps[email] = &OTPData{
		Code:      code,
		Email:     email,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	log.Printf("OTP Service - Đã lưu OTP cho email: %s, Code: %s", email, code)
}

// VerifyOTP kiểm tra OTP code có đúng không
func (s *OTPService) VerifyOTP(email, code string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	otpData, exists := s.otps[email]
	if !exists {
		log.Printf("OTP Service - ❌ Không tìm thấy OTP cho email: %s", email)
		return false
	}
	
	if time.Now().After(otpData.ExpiresAt) {
		log.Printf("OTP Service - ❌ OTP đã hết hạn cho email: %s", email)
		delete(s.otps, email)
		return false
	}
	
	if otpData.Code != code {
		log.Printf("OTP Service - ❌ OTP không đúng cho email: %s", email)
		return false
	}
	
	log.Printf("OTP Service - ✅ OTP đúng cho email: %s", email)
	// Xóa OTP sau khi verify thành công
	delete(s.otps, email)
	return true
}

// GenerateResetToken tạo token reset password (32 ký tự ngẫu nhiên)
func (s *OTPService) GenerateResetToken() string {
	token := make([]byte, 16)
	rand.Read(token)
	return fmt.Sprintf("%x", token)
}

// StoreResetToken lưu reset token với thời gian hết hạn (1 giờ)
func (s *OTPService) StoreResetToken(email, token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	s.otps[email+"_reset"] = &OTPData{
		Code:      token,
		Email:     email,
		ExpiresAt: time.Now().Add(1 * time.Hour), // 1 giờ
	}
	log.Printf("OTP Service - Đã lưu reset token cho email: %s", email)
}

// VerifyResetToken kiểm tra reset token có đúng không
func (s *OTPService) VerifyResetToken(email, token string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	key := email + "_reset"
	log.Printf("OTP Service - 🔍 Đang tìm reset token với key: %s", key)
	log.Printf("OTP Service - 📋 Số lượng tokens hiện có: %d", len(s.otps))
	
	// Debug: in ra tất cả keys
	for k := range s.otps {
		log.Printf("OTP Service - 🔑 Key trong map: %s", k)
	}
	
	otpData, exists := s.otps[key]
	if !exists {
		log.Printf("OTP Service - ❌ Không tìm thấy reset token cho email: %s (key: %s)", email, key)
		return false
	}
	
	log.Printf("OTP Service - ✅ Tìm thấy token, đang kiểm tra...")
	log.Printf("OTP Service - 📝 Token trong DB: %s (length: %d)", otpData.Code, len(otpData.Code))
	log.Printf("OTP Service - 📝 Token nhận được: %s (length: %d)", token, len(token))
	log.Printf("OTP Service - ⏰ Expires at: %v, Now: %v", otpData.ExpiresAt, time.Now())
	
	if time.Now().After(otpData.ExpiresAt) {
		log.Printf("OTP Service - ❌ Reset token đã hết hạn cho email: %s", email)
		delete(s.otps, key)
		return false
	}
	
	if otpData.Code != token {
		log.Printf("OTP Service - ❌ Reset token không đúng cho email: %s", email)
		log.Printf("OTP Service - ❌ So sánh: '%s' != '%s'", otpData.Code, token)
		return false
	}
	
	log.Printf("OTP Service - ✅ Reset token đúng cho email: %s", email)
	// Xóa token sau khi verify thành công
	delete(s.otps, key)
	return true
}

// cleanupExpiredOTPs xóa các OTP đã hết hạn
func (s *OTPService) cleanupExpiredOTPs() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	
	for range ticker.C {
		s.mu.Lock()
		now := time.Now()
		for email, otpData := range s.otps {
			if now.After(otpData.ExpiresAt) {
				delete(s.otps, email)
				log.Printf("OTP Service - Đã xóa OTP hết hạn cho email: %s", email)
			}
		}
		s.mu.Unlock()
	}
}


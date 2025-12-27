package email

import (
	"fmt"
	"log"
	"net/smtp"
	"strings"
)

// EmailService quản lý việc gửi email
type EmailService struct {
	smtpHost     string
	smtpPort     string
	smtpUser     string
	smtpPassword string
	smtpFrom     string
}

// NewEmailService tạo email service mới
func NewEmailService(smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom string) *EmailService {
	return &EmailService{
		smtpHost:     smtpHost,
		smtpPort:     smtpPort,
		smtpUser:     smtpUser,
		smtpPassword: smtpPassword,
		smtpFrom:     smtpFrom,
	}
}

// SendEmail gửi email
func (e *EmailService) SendEmail(to, subject, body string) error {
	// Kiểm tra cấu hình
	if e.smtpHost == "" || e.smtpUser == "" || e.smtpPassword == "" {
		log.Printf("⚠️  Email service chưa được cấu hình. Email sẽ không được gửi.")
		log.Printf("   To: %s", to)
		log.Printf("   Subject: %s", subject)
		log.Printf("   Body: %s", body)
		return fmt.Errorf("email service chưa được cấu hình")
	}

	// Tạo message
	from := e.smtpFrom
	if from == "" {
		from = e.smtpUser
	}

	msg := []byte(fmt.Sprintf("From: %s\r\n", from) +
		fmt.Sprintf("To: %s\r\n", to) +
		fmt.Sprintf("Subject: %s\r\n", subject) +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n" +
		"\r\n" +
		body + "\r\n")

	// Kết nối SMTP server
	addr := fmt.Sprintf("%s:%s", e.smtpHost, e.smtpPort)
	
	log.Printf("📧 Đang gửi email đến: %s", to)
	log.Printf("📧 SMTP Server: %s", addr)
	log.Printf("📧 SMTP User: %s", e.smtpUser)
	
	// Tạo auth
	auth := smtp.PlainAuth("", e.smtpUser, e.smtpPassword, e.smtpHost)

	// Gửi email
	err := smtp.SendMail(addr, auth, from, []string{to}, msg)
	if err != nil {
		log.Printf("❌ Lỗi gửi email: %v", err)
		
		// Kiểm tra lỗi cụ thể
		errMsg := err.Error()
		if contains(errMsg, "BadCredentials") || contains(errMsg, "Username and Password not accepted") {
			log.Printf("❌ LỖI XÁC THỰC:")
			log.Printf("   → Có thể bạn đang dùng mật khẩu Gmail thông thường")
			log.Printf("   → Bạn PHẢI dùng App Password (16 ký tự)")
			log.Printf("   → Hướng dẫn: https://myaccount.google.com/apppasswords")
			log.Printf("   → Đảm bảo đã bật 2-Step Verification trước")
			return fmt.Errorf("lỗi xác thực: vui lòng sử dụng App Password thay vì mật khẩu Gmail thông thường. Xem hướng dẫn trong backend/docs/EMAIL_SETUP.md")
		}
		
		return fmt.Errorf("lỗi gửi email: %v", err)
	}

	log.Printf("✅ Email đã được gửi thành công đến: %s", to)
	return nil
}

// SendVerificationCodeEmail gửi email mã xác thực
func (e *EmailService) SendVerificationCodeEmail(to, code string) error {
	subject := "Mã xác thực email - HST"
	body := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.container { max-width: 600px; margin: 0 auto; padding: 20px; }
				.header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
				.content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
				.code { background: white; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; margin: 20px 0; border-radius: 8px; border: 2px dashed #667eea; }
				.footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>Xác thực Email</h1>
				</div>
				<div class="content">
					<p>Xin chào,</p>
					<p>Cảm ơn bạn đã đăng ký tài khoản tại HST. Vui lòng sử dụng mã xác thực sau để hoàn tất đăng ký:</p>
					<div class="code">%s</div>
					<p>Mã xác thực này có hiệu lực trong <strong>5 phút</strong>.</p>
					<p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
				</div>
				<div class="footer">
					<p>© 2024 HST. Tất cả quyền được bảo lưu.</p>
				</div>
			</div>
		</body>
		</html>
	`, code)

	return e.SendEmail(to, subject, body)
}

// SendPasswordResetEmail gửi email đặt lại mật khẩu
func (e *EmailService) SendPasswordResetEmail(to, resetLink string) error {
	subject := "Đặt lại mật khẩu - HST"
	body := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.container { max-width: 600px; margin: 0 auto; padding: 20px; }
				.header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
				.content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
				.button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
				.footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>Đặt lại Mật khẩu</h1>
				</div>
				<div class="content">
					<p>Xin chào,</p>
					<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
					<p style="text-align: center;">
						<a href="%s" class="button">Đặt lại Mật khẩu</a>
					</p>
					<p>Hoặc copy link sau vào trình duyệt:</p>
					<p style="word-break: break-all; color: #667eea;">%s</p>
					<p>Link này có hiệu lực trong <strong>1 giờ</strong>.</p>
					<p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
				</div>
				<div class="footer">
					<p>© 2024 HST. Tất cả quyền được bảo lưu.</p>
				</div>
			</div>
		</body>
		</html>
	`, resetLink, resetLink)

	return e.SendEmail(to, subject, body)
}

// IsConfigured kiểm tra email service đã được cấu hình chưa
func (e *EmailService) IsConfigured() bool {
	return e.smtpHost != "" && e.smtpUser != "" && e.smtpPassword != ""
}

// GetFromEmail trả về email address để gửi từ
func (e *EmailService) GetFromEmail() string {
	if e.smtpFrom != "" {
		return e.smtpFrom
	}
	return e.smtpUser
}

// contains kiểm tra string có chứa substring không (case insensitive)
func contains(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}


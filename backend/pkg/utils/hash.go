package utils

// Hash password và kiểm tra password
import "golang.org/x/crypto/bcrypt"

// HashPassword mã hóa password trước khi lưu vào database
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword so sánh password với hash trong database
func CheckPassword(hashedPassword, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

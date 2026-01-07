package repository

import (
	"database/sql"
	"log"
	"time"
)

type PasswordResetRepository struct {
	db *sql.DB
}

func NewPasswordResetRepository(db *sql.DB) *PasswordResetRepository {
	return &PasswordResetRepository{db: db}
}

// StoreToken lưu reset token vào database
func (r *PasswordResetRepository) StoreToken(email, token string, expiresAt time.Time) error {
	query := `
		INSERT INTO password_reset_tokens (email, token, expires_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (token) DO UPDATE 
		SET email = EXCLUDED.email, expires_at = EXCLUDED.expires_at, created_at = CURRENT_TIMESTAMP, used_at = NULL
	`
	_, err := r.db.Exec(query, email, token, expiresAt)
	if err != nil {
		log.Printf("PasswordResetRepository - ❌ Lỗi lưu token: %v", err)
		return err
	}
	log.Printf("PasswordResetRepository - ✅ Đã lưu reset token cho email: %s", email)
	return nil
}

// VerifyToken kiểm tra và xóa token nếu hợp lệ
func (r *PasswordResetRepository) VerifyToken(email, token string) (bool, error) {
	var storedEmail string
	var expiresAt time.Time
	var usedAt sql.NullTime

	query := `
		SELECT email, expires_at, used_at
		FROM password_reset_tokens
		WHERE token = $1
	`
	err := r.db.QueryRow(query, token).Scan(&storedEmail, &expiresAt, &usedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("PasswordResetRepository - ❌ Không tìm thấy token: %s", token)
			return false, nil
		}
		log.Printf("PasswordResetRepository - ❌ Lỗi khi verify token: %v", err)
		return false, err
	}

	// Kiểm tra email có khớp không
	if storedEmail != email {
		log.Printf("PasswordResetRepository - ❌ Email không khớp: %s != %s", storedEmail, email)
		return false, nil
	}

	// Kiểm tra token đã được sử dụng chưa
	if usedAt.Valid {
		log.Printf("PasswordResetRepository - ❌ Token đã được sử dụng: %s", token)
		return false, nil
	}

	// Kiểm tra token đã hết hạn chưa
	if time.Now().After(expiresAt) {
		log.Printf("PasswordResetRepository - ❌ Token đã hết hạn: %s", token)
		// Xóa token hết hạn
		r.db.Exec("DELETE FROM password_reset_tokens WHERE token = $1", token)
		return false, nil
	}

	// Đánh dấu token đã được sử dụng
	updateQuery := `
		UPDATE password_reset_tokens
		SET used_at = CURRENT_TIMESTAMP
		WHERE token = $1
	`
	_, err = r.db.Exec(updateQuery, token)
	if err != nil {
		log.Printf("PasswordResetRepository - ⚠️ Lỗi khi đánh dấu token đã sử dụng: %v", err)
		// Vẫn trả về true vì token hợp lệ
	}

	log.Printf("PasswordResetRepository - ✅ Token hợp lệ: %s", token)
	return true, nil
}

// CleanupExpiredTokens xóa các token đã hết hạn (có thể gọi định kỳ)
func (r *PasswordResetRepository) CleanupExpiredTokens() error {
	query := `DELETE FROM password_reset_tokens WHERE expires_at < NOW()`
	result, err := r.db.Exec(query)
	if err != nil {
		return err
	}
	rowsAffected, _ := result.RowsAffected()
	log.Printf("PasswordResetRepository - ✅ Đã xóa %d token hết hạn", rowsAffected)
	return nil
}

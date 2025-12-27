package repository

import (
	"database/sql"
	"fullstack-backend/internal/models"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create tạo user mới
func (r *UserRepository) Create(user *models.User) error {
	// Set default role nếu chưa có
	if user.Role == "" {
		user.Role = "user"
	}
	query := `
        INSERT INTO nguoi_dung (email, mat_khau, ten, vai_tro) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id, thoi_gian_tao, thoi_gian_cap_nhat
    `
	return r.db.QueryRow(
		query, user.Email, user.Password, user.Name, user.Role,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

// FindByID tìm user theo ID
func (r *UserRepository) FindByID(id string) (*models.User, error) {
	user := &models.User{}
	var avatarURL sql.NullString
	var lastNameChangeTime sql.NullTime
	query := `
        SELECT id, email, mat_khau, ten, vai_tro, avatar_url, thoi_gian_tao, thoi_gian_cap_nhat, thoi_gian_doi_ten_cuoi
        FROM nguoi_dung 
        WHERE id = $1
    `
	err := r.db.QueryRow(query, id).Scan(
		&user.ID, &user.Email, &user.Password, &user.Name, &user.Role,
		&avatarURL, &user.CreatedAt, &user.UpdatedAt, &lastNameChangeTime,
	)
	if err != nil {
		return nil, err
	}
	if avatarURL.Valid {
		user.AvatarURL = &avatarURL.String
	}
	if lastNameChangeTime.Valid {
		user.LastNameChangeTime = &lastNameChangeTime.Time
	}
	return user, nil
}

// FindByEmail tìm user theo Email (dùng cho login)
func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	user := &models.User{}
	var avatarURL sql.NullString
	query := `
        SELECT id, email, mat_khau, ten, vai_tro, avatar_url, thoi_gian_tao, thoi_gian_cap_nhat 
        FROM nguoi_dung 
        WHERE email = $1
    `
	err := r.db.QueryRow(query, email).Scan(
		&user.ID, &user.Email, &user.Password, &user.Name, &user.Role,
		&avatarURL, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if avatarURL.Valid {
		user.AvatarURL = &avatarURL.String
	}
	return user, nil
}

// FindByName tìm user theo Name (tìm chính xác, phân biệt hoa thường)
func (r *UserRepository) FindByName(name string) ([]*models.User, error) {
	query := `
        SELECT id, email, mat_khau, ten, vai_tro, avatar_url, thoi_gian_tao, thoi_gian_cap_nhat 
        FROM nguoi_dung 
        WHERE ten = $1
    `
	rows, err := r.db.Query(query, name)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []*models.User{}
	for rows.Next() {
		user := &models.User{}
		var avatarURL sql.NullString
		err := rows.Scan(
			&user.ID, &user.Email, &user.Password, &user.Name, &user.Role,
			&avatarURL, &user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		if avatarURL.Valid {
			user.AvatarURL = &avatarURL.String
		}
		users = append(users, user)
	}

	return users, nil
}

// UpdateUser cập nhật user (đổi tên và email) - DEPRECATED: Không cho phép đổi email
func (r *UserRepository) UpdateUser(id string, name string, email string) error {
	query := `
        UPDATE nguoi_dung 
        SET ten = $1, email = $2, thoi_gian_cap_nhat = CURRENT_TIMESTAMP 
        WHERE id = $3
    `
	result, err := r.db.Exec(query, name, email, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// UpdateUserName cập nhật chỉ tên và thời gian đổi tên (giới hạn 1 tháng 1 lần)
func (r *UserRepository) UpdateUserName(id string, name string) error {
	query := `
        UPDATE nguoi_dung 
        SET ten = $1, thoi_gian_cap_nhat = CURRENT_TIMESTAMP, thoi_gian_doi_ten_cuoi = CURRENT_TIMESTAMP
        WHERE id = $2
    `
	result, err := r.db.Exec(query, name, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// UpdatePassword cập nhật password
func (r *UserRepository) UpdatePassword(id string, hashedPassword string) error {
	query := `
        UPDATE nguoi_dung 
        SET mat_khau = $1, thoi_gian_cap_nhat = CURRENT_TIMESTAMP 
        WHERE id = $2
    `
	result, err := r.db.Exec(query, hashedPassword, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// UpdateAvatar cập nhật avatar URL
func (r *UserRepository) UpdateAvatar(id string, avatarURL string) error {
	query := `
        UPDATE nguoi_dung 
        SET avatar_url = $1, thoi_gian_cap_nhat = CURRENT_TIMESTAMP 
        WHERE id = $2
    `
	result, err := r.db.Exec(query, avatarURL, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// DeleteUser xóa user
func (r *UserRepository) DeleteUser(id string) error {
	query := `DELETE FROM nguoi_dung WHERE id = $1`
	result, err := r.db.Exec(query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// GetAll lấy tất cả users (có phân trang)
func (r *UserRepository) GetAll(limit, offset int) ([]*models.User, error) {
	query := `
        SELECT id, email, mat_khau, ten, vai_tro, avatar_url, thoi_gian_tao, thoi_gian_cap_nhat 
        FROM nguoi_dung 
        ORDER BY thoi_gian_tao DESC
        LIMIT $1 OFFSET $2
    `
	rows, err := r.db.Query(query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []*models.User{}
	for rows.Next() {
		user := &models.User{}
		var avatarURL sql.NullString
		err := rows.Scan(
			&user.ID, &user.Email, &user.Password, &user.Name, &user.Role,
			&avatarURL, &user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		if avatarURL.Valid {
			user.AvatarURL = &avatarURL.String
		}
		users = append(users, user)
	}

	return users, nil
}

// GetAllUsers lấy tất cả users có role = 'user' (có phân trang, sắp xếp theo tên)
func (r *UserRepository) GetAllUsers(limit, offset int) ([]*models.User, error) {
	query := `
        SELECT id, email, mat_khau, ten, vai_tro, avatar_url, thoi_gian_tao, thoi_gian_cap_nhat 
        FROM nguoi_dung 
        WHERE vai_tro = 'user'
        ORDER BY ten ASC
        LIMIT $1 OFFSET $2
    `
	rows, err := r.db.Query(query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []*models.User{}
	for rows.Next() {
		user := &models.User{}
		var avatarURL sql.NullString
		err := rows.Scan(
			&user.ID, &user.Email, &user.Password, &user.Name, &user.Role,
			&avatarURL, &user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		if avatarURL.Valid {
			user.AvatarURL = &avatarURL.String
		}
		users = append(users, user)
	}

	return users, nil
}

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
	query := `
        INSERT INTO users (email, password, name) 
        VALUES ($1, $2, $3) 
        RETURNING id, created_at, updated_at
    `
	return r.db.QueryRow(
		query, user.Email, user.Password, user.Name,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

// FindByID tìm user theo ID
func (r *UserRepository) FindByID(id string) (*models.User, error) {
	user := &models.User{}
	query := `
        SELECT id, email, password, name, created_at, updated_at 
        FROM users 
        WHERE id = $1
    `
	err := r.db.QueryRow(query, id).Scan(
		&user.ID, &user.Email, &user.Password, &user.Name,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

// FindByEmail tìm user theo Email (dùng cho login)
func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	user := &models.User{}
	query := `
        SELECT id, email, password, name, created_at, updated_at 
        FROM users 
        WHERE email = $1
    `
	err := r.db.QueryRow(query, email).Scan(
		&user.ID, &user.Email, &user.Password, &user.Name,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

// FindByName tìm user theo Name (tìm kiếm gần đúng)
func (r *UserRepository) FindByName(name string) ([]*models.User, error) {
	query := `
        SELECT id, email, password, name, created_at, updated_at 
        FROM users 
        WHERE name ILIKE $1
    `
	rows, err := r.db.Query(query, "%"+name+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []*models.User{}
	for rows.Next() {
		user := &models.User{}
		err := rows.Scan(
			&user.ID, &user.Email, &user.Password, &user.Name,
			&user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, nil
}

// UpdateUser cập nhật user (đổi tên và email)
func (r *UserRepository) UpdateUser(id string, name string, email string) error {
	query := `
        UPDATE users 
        SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP 
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

// UpdatePassword cập nhật password
func (r *UserRepository) UpdatePassword(id string, hashedPassword string) error {
	query := `
        UPDATE users 
        SET password = $1, updated_at = CURRENT_TIMESTAMP 
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

// DeleteUser xóa user
func (r *UserRepository) DeleteUser(id string) error {
	query := `DELETE FROM users WHERE id = $1`
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
        SELECT id, email, password, name, created_at, updated_at 
        FROM users 
        ORDER BY created_at DESC
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
		err := rows.Scan(
			&user.ID, &user.Email, &user.Password, &user.Name,
			&user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, nil
}

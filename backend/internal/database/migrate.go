package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
)

// findMigrationsPath tìm đường dẫn đến thư mục migrations
// Tìm từ working directory hoặc từ vị trí file source (fallback)
func findMigrationsPath(relativePath string) (string, error) {
	// Lấy working directory hiện tại
	wd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("failed to get working directory: %w", err)
	}

	// Thử các đường dẫn có thể có
	possiblePaths := []string{
		filepath.Join(wd, relativePath),            // Từ working dir: backend/migrations
		filepath.Join(wd, "..", relativePath),      // Từ cmd/api/: ../migrations
		filepath.Join(wd, "backend", relativePath), // Từ root: backend/migrations
	}

	// Thử tìm từ vị trí file source (fallback)
	_, filename, _, ok := runtime.Caller(1)
	if ok {
		sourceDir := filepath.Dir(filename)
		// Từ internal/database/migrate.go -> backend/internal/database
		// -> lên 2 cấp về backend -> migrations
		backendDir := filepath.Join(sourceDir, "..", "..")
		possiblePaths = append(possiblePaths, filepath.Join(backendDir, relativePath))
	}

	// Thử từng path
	for _, path := range possiblePaths {
		absPath, err := filepath.Abs(path)
		if err != nil {
			continue
		}

		if info, err := os.Stat(absPath); err == nil && info.IsDir() {
			return absPath, nil
		}
	}

	// Nếu không tìm thấy, trả về lỗi với thông tin debug
	return "", fmt.Errorf("migrations directory not found. Tried paths: %v (working dir: %s)", possiblePaths, wd)
}

// RunMigrations tự động chạy tất cả migration files khi app start
// relativePath: đường dẫn tương đối đến thư mục migrations (vd: "../../migrations" từ cmd/api/)
func RunMigrations(db *sql.DB, relativePath string) error {
	// Tìm đường dẫn migrations
	migrationsPath, err := findMigrationsPath(relativePath)
	if err != nil {
		return fmt.Errorf("failed to find migrations path: %w", err)
	}

	fmt.Printf("📁 Migrations directory: %s\n", migrationsPath)

	// Lấy danh sách migration files
	files, err := getMigrationFiles(migrationsPath)
	if err != nil {
		return fmt.Errorf("failed to get migration files: %w", err)
	}

	if len(files) == 0 {
		fmt.Printf("⚠️  No migration files found in %s, skipping migrations...\n", migrationsPath)
		return nil
	}

	fmt.Printf("📄 Found %d migration file(s): %v\n", len(files), files)

	// Tạo bảng để track migrations đã chạy
	if err := createMigrationsTable(db); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// Chạy từng migration file
	for _, file := range files {
		filePath := filepath.Join(migrationsPath, file)

		// Kiểm tra xem migration đã chạy chưa
		hasRun, err := hasMigrationRun(db, file)
		if err != nil {
			return fmt.Errorf("failed to check migration status: %w", err)
		}

		if hasRun {
			fmt.Printf("⏭️  Migration %s already applied, skipping...\n", file)
			continue
		}

		// Đọc nội dung migration file
		content, err := os.ReadFile(filePath)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", file, err)
		}

		// Chạy migration trong transaction
		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("failed to begin transaction: %w", err)
		}

		// Thực thi SQL
		if _, err := tx.Exec(string(content)); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to execute migration %s: %w", file, err)
		}

		// Ghi lại migration đã chạy
		if _, err := tx.Exec(
			"INSERT INTO schema_migrations (filename, applied_at) VALUES ($1, NOW())",
			file,
		); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to record migration %s: %w", file, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", file, err)
		}

		fmt.Printf("✅ Migration %s applied successfully\n", file)
	}

	return nil
}

// createMigrationsTable tạo bảng để track migrations đã chạy
func createMigrationsTable(db *sql.DB) error {
	query := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id SERIAL PRIMARY KEY,
			filename VARCHAR(255) NOT NULL UNIQUE,
			applied_at TIMESTAMP NOT NULL DEFAULT NOW()
		);
	`
	_, err := db.Exec(query)
	return err
}

// getMigrationFiles lấy danh sách migration files và sắp xếp theo tên
func getMigrationFiles(migrationsPath string) ([]string, error) {
	var files []string

	// Đọc thư mục migrations
	entries, err := os.ReadDir(migrationsPath)
	if err != nil {
		// Nếu thư mục không tồn tại, trả về empty list (không error)
		if os.IsNotExist(err) {
			return files, nil
		}
		return nil, err
	}

	for _, entry := range entries {
		// Chỉ lấy file .sql
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			filename := entry.Name()
			// Bỏ qua file README nếu có
			if !strings.Contains(strings.ToLower(filename), "readme") {
				files = append(files, filename)
			}
		}
	}

	// Sắp xếp theo tên file (đảm bảo chạy theo thứ tự)
	sort.Strings(files)

	return files, nil
}

// hasMigrationRun kiểm tra xem migration đã chạy chưa
func hasMigrationRun(db *sql.DB, filename string) (bool, error) {
	var count int
	err := db.QueryRow(
		"SELECT COUNT(*) FROM schema_migrations WHERE filename = $1",
		filename,
	).Scan(&count)

	if err != nil {
		return false, err
	}

	return count > 0, nil
}

package storage

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Local implements Storage by saving files to the app server disk (uploads/).
type Local struct {
	baseDir string // e.g. "uploads"
}

// NewLocal creates a local file storage. baseDir is the root (e.g. "uploads").
func NewLocal(baseDir string) *Local {
	return &Local{baseDir: baseDir}
}

// Upload saves the file under baseDir/objectKey and returns URL path like /uploads/avatars/xxx.
func (l *Local) Upload(ctx context.Context, objectKey string, reader io.Reader, size int64, contentType string) (publicURL string, err error) {
	fullPath := filepath.Join(l.baseDir, objectKey)
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	f, err := os.Create(fullPath)
	if err != nil {
		return "", err
	}
	defer f.Close()
	if _, err := io.Copy(f, reader); err != nil {
		os.Remove(fullPath)
		return "", err
	}
	publicURL = "/" + filepath.ToSlash(filepath.Join(l.baseDir, objectKey))
	return publicURL, nil
}

// PresignGet returns urlOrRef unchanged (local paths need no presigning).
func (l *Local) PresignGet(ctx context.Context, urlOrRef string, expiry time.Duration) (string, error) {
	return urlOrRef, nil
}

// GetObject opens the file and returns reader (for proxy).
func (l *Local) GetObject(ctx context.Context, objectKey string) (io.ReadCloser, int64, string, error) {
	fullPath := filepath.Join(l.baseDir, objectKey)
	f, err := os.Open(fullPath)
	if err != nil {
		return nil, 0, "", err
	}
	info, err := f.Stat()
	if err != nil {
		f.Close()
		return nil, 0, "", err
	}
	contentType := "application/octet-stream"
	if ext := filepath.Ext(objectKey); ext != "" {
		switch strings.ToLower(ext) {
		case ".jpg", ".jpeg":
			contentType = "image/jpeg"
		case ".png":
			contentType = "image/png"
		case ".gif":
			contentType = "image/gif"
		}
	}
	return f, info.Size(), contentType, nil
}

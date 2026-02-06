package storage

import (
	"context"
	"io"
	"time"
)

// Storage abstracts file upload (local or MinIO). PublicURL is the URL the frontend uses to display the file.
type Storage interface {
	// Upload saves the file and returns the public URL (e.g. full MinIO URL or path for static serve).
	Upload(ctx context.Context, objectKey string, reader io.Reader, size int64, contentType string) (publicURL string, err error)
	// PresignGet returns a presigned GET URL for the given urlOrRef (full URL or "bucket/key"). For Local, returns input unchanged.
	PresignGet(ctx context.Context, urlOrRef string, expiry time.Duration) (string, error)
	// GetObject returns a reader for the object (for proxy/serve). Caller must Close the reader.
	GetObject(ctx context.Context, objectKey string) (io.ReadCloser, int64, string, error)
}

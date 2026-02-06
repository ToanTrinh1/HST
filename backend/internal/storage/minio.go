package storage

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/url"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// MinIO implements Storage using MinIO (S3-compatible).
type MinIO struct {
	client        *minio.Client // dùng cho Upload, BucketExists (endpoint nội bộ: minio:9000)
	presignClient *minio.Client // dùng cho PresignGet (endpoint công khai: localhost:9000) để browser mở được
	bucket        string
	publicBaseURL string // e.g. http://localhost:9000/hst (no trailing slash)
}

// NewMinIO creates a MinIO storage client. publicBaseURL is the base URL for browser (e.g. http://localhost:9000/hst-avatars).
// Upload dùng endpoint; PresignGet dùng host từ publicBaseURL để presigned URL mở được từ trình duyệt.
func NewMinIO(endpoint, accessKey, secretKey, bucket string, useSSL bool, publicBaseURL string) (*MinIO, error) {
	creds := credentials.NewStaticV4(accessKey, secretKey, "")
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  creds,
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("minio New: %w", err)
	}
	publicBaseURL = strings.TrimSuffix(publicBaseURL, "/")
	if publicBaseURL == "" {
		publicBaseURL = fmt.Sprintf("http://%s/%s", endpoint, bucket)
		if useSSL {
			publicBaseURL = fmt.Sprintf("https://%s/%s", endpoint, bucket)
		}
	}
	m := &MinIO{client: client, bucket: bucket, publicBaseURL: publicBaseURL}
	// presignClient không còn dùng cho PresignedGetObject (dùng client nội bộ rồi thay host); giữ để tương thích
	publicHost, publicScheme := parsePublicEndpoint(publicBaseURL)
	if publicHost != "" {
		useSSL := publicScheme == "https"
		presignClient, err := minio.New(publicHost, &minio.Options{
			Creds:  creds,
			Secure: useSSL,
		})
		if err != nil {
			log.Printf("MinIO - ⚠️ Presign client init (dùng endpoint nội bộ): %v", err)
		} else {
			m.presignClient = presignClient
		}
	}
	if m.presignClient == nil {
		m.presignClient = client
	}
	if err := m.ensureBucket(context.Background()); err != nil {
		return nil, err
	}
	return m, nil
}

// parsePublicEndpoint lấy host:port và scheme từ publicBaseURL (e.g. https://minio.example.com -> minio.example.com, https).
func parsePublicEndpoint(publicBaseURL string) (hostPort string, scheme string) {
	u, err := url.Parse(publicBaseURL)
	if err != nil || u.Host == "" {
		return "", "http"
	}
	scheme = "http"
	if u.Scheme == "https" {
		scheme = "https"
	}
	return u.Host, scheme
}

func (m *MinIO) ensureBucket(ctx context.Context) error {
	exists, err := m.client.BucketExists(ctx, m.bucket)
	if err != nil {
		return fmt.Errorf("BucketExists: %w", err)
	}
	if !exists {
		if err := m.client.MakeBucket(ctx, m.bucket, minio.MakeBucketOptions{}); err != nil {
			return fmt.Errorf("MakeBucket: %w", err)
		}
		log.Printf("MinIO - ✅ Bucket %q created", m.bucket)
	}
	return nil
}

// Upload uploads the reader to MinIO at objectKey and returns the public URL.
func (m *MinIO) Upload(ctx context.Context, objectKey string, reader io.Reader, size int64, contentType string) (publicURL string, err error) {
	opts := minio.PutObjectOptions{ContentType: contentType}
	_, err = m.client.PutObject(ctx, m.bucket, objectKey, reader, size, opts)
	if err != nil {
		return "", fmt.Errorf("PutObject: %w", err)
	}
	publicURL = m.publicBaseURL + "/" + objectKey
	return publicURL, nil
}

// PresignGet returns a presigned GET URL for the object. urlOrRef can be full URL (http://.../bucket/key) or "bucket/key" or just "key".
// Luôn dùng client nội bộ (minio:9000) để gọi PresignedGetObject — từ trong Docker, presignClient(localhost:9000) không kết nối được.
// Sau đó thay host trong URL bằng public host để browser mở được.
func (m *MinIO) PresignGet(ctx context.Context, urlOrRef string, expiry time.Duration) (string, error) {
	if urlOrRef == "" {
		return "", nil
	}
	key := urlOrRef
	if idx := strings.LastIndex(urlOrRef, "/"); idx >= 0 {
		key = urlOrRef[idx+1:]
	}
	if key == "" {
		return "", nil
	}
	// Luôn dùng client nội bộ (endpoint minio:9000) — kết nối được từ container
	u, err := m.client.PresignedGetObject(ctx, m.bucket, key, expiry, nil)
	if err != nil {
		return "", fmt.Errorf("PresignedGetObject: %w", err)
	}
	presignedStr := u.String()
	// Thay host (và scheme) nội bộ bằng MINIO_PUBLIC_URL để browser mở được (localhost, IP, hoặc domain qua NPM)
	publicHost, publicScheme := parsePublicEndpoint(m.publicBaseURL)
	if publicHost != "" {
		parsed, err := url.Parse(presignedStr)
		if err == nil && (parsed.Host != publicHost || parsed.Scheme != publicScheme) {
			parsed.Scheme = publicScheme
			parsed.Host = publicHost
			presignedStr = parsed.String()
		}
	}
	return presignedStr, nil
}

// GetObject returns a reader for the object (proxy). Dùng client nội bộ.
func (m *MinIO) GetObject(ctx context.Context, objectKey string) (io.ReadCloser, int64, string, error) {
	obj, err := m.client.GetObject(ctx, m.bucket, objectKey, minio.GetObjectOptions{})
	if err != nil {
		return nil, 0, "", fmt.Errorf("GetObject: %w", err)
	}
	info, err := obj.Stat()
	if err != nil {
		obj.Close()
		return nil, 0, "", fmt.Errorf("Stat: %w", err)
	}
	contentType := "application/octet-stream"
	if info.ContentType != "" {
		contentType = info.ContentType
	}
	return obj, info.Size, contentType, nil
}

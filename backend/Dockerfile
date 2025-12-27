# Stage 1: Build stage
FROM golang:alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/api

# Stage 2: Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/main /app/main

# Copy migrations directory
COPY --from=builder /app/migrations /app/migrations

# Make binary executable
RUN chmod +x /app/main

# Create uploads directory
RUN mkdir -p /app/uploads/avatars

EXPOSE 8080

CMD ["/app/main"]

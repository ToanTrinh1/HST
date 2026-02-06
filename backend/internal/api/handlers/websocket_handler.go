package handlers

import (
	"log"
	"net/http"

	"fullstack-backend/internal/websocket"
	"fullstack-backend/pkg/utils"

	"github.com/gin-gonic/gin"
	gorillaWS "github.com/gorilla/websocket"
)

var upgrader = gorillaWS.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for now (adjust in production)
		return true
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type WebSocketHandler struct {
	hub       *websocket.Hub
	jwtSecret string
}

func NewWebSocketHandler(hub *websocket.Hub, jwtSecret string) *WebSocketHandler {
	return &WebSocketHandler{
		hub:       hub,
		jwtSecret: jwtSecret,
	}
}

// HandleWebSocket handles WebSocket connections
func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	// Get JWT token from query parameter or header
	tokenString := c.Query("token")
	if tokenString == "" {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			tokenString = authHeader[len("Bearer "):]
		}
	}

	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authentication token"})
		return
	}

	// Validate JWT token
	claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
		return
	}

	// Upgrade connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket - ❌ Error upgrading connection: %v", err)
		return
	}

	// Create client
	client := &websocket.Client{
		Hub:    h.hub,
		Conn:   conn,
		UserID: claims.UserID,
		Send:   make(chan []byte, 256),
	}

	// Register client
	h.hub.Register(client)

	// Start client pumps
	go client.WritePump()
	go client.ReadPump()

	log.Printf("WebSocket - ✅ Connection established for UserID: %s", claims.UserID)
}

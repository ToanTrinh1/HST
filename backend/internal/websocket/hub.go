package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	gorillaWS "github.com/gorilla/websocket"
)

// Client represents a WebSocket client connection
type Client struct {
	Hub    *Hub
	Conn   *gorillaWS.Conn
	UserID string
	Send   chan []byte
}

// Hub maintains the set of active clients and broadcasts messages to clients
type Hub struct {
	// Registered clients mapped by user ID
	clients map[string]*Client

	// Register requests from clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Broadcast message to specific user
	broadcastToUser chan *UserMessage

	// Broadcast to all connected clients (e.g. for admin real-time đơn hàng)
	broadcastToAll chan []byte

	// Mutex for thread-safe operations
	mu sync.RWMutex
}

// UserMessage represents a message to be sent to a specific user
type UserMessage struct {
	UserID  string
	Message []byte
}

// Message represents the structure of WebSocket messages
type Message struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		clients:         make(map[string]*Client),
		register:        make(chan *Client),
		unregister:      make(chan *Client),
		broadcastToUser: make(chan *UserMessage, 256),
		broadcastToAll:  make(chan []byte, 64),
	}
}

// Register registers a new client
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			// Remove old connection if exists for this user
			if oldClient, exists := h.clients[client.UserID]; exists {
				close(oldClient.Send)
				delete(h.clients, client.UserID)
			}
			h.clients[client.UserID] = client
			h.mu.Unlock()
			log.Printf("WebSocket - ✅ Client registered: UserID=%s, Total clients=%d", client.UserID, len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.UserID]; ok {
				delete(h.clients, client.UserID)
				close(client.Send)
				log.Printf("WebSocket - ❌ Client unregistered: UserID=%s, Total clients=%d", client.UserID, len(h.clients))
			}
			h.mu.Unlock()

		case userMsg := <-h.broadcastToUser:
			h.mu.RLock()
			client, ok := h.clients[userMsg.UserID]
			h.mu.RUnlock()
			if ok {
				select {
				case client.Send <- userMsg.Message:
				default:
					close(client.Send)
					h.mu.Lock()
					delete(h.clients, userMsg.UserID)
					h.mu.Unlock()
				}
			}

		case msg := <-h.broadcastToAll:
			h.mu.RLock()
			for _, client := range h.clients {
				select {
				case client.Send <- msg:
				default:
					// Skip full buffer
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastNotification sends a notification to a specific user
func (h *Hub) BroadcastNotification(userID string, notification interface{}) {
	msg := Message{
		Type:    "notification",
		Payload: notification,
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("WebSocket - ❌ Error marshaling notification: %v", err)
		return
	}

	h.broadcastToUser <- &UserMessage{
		UserID:  userID,
		Message: msgBytes,
	}
}

// BroadcastChatMessage sends a chat message to a specific user
func (h *Hub) BroadcastChatMessage(userID string, chatMessage interface{}) {
	msg := Message{
		Type:    "chat_message",
		Payload: chatMessage,
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("WebSocket - ❌ Error marshaling chat message: %v", err)
		return
	}

	h.broadcastToUser <- &UserMessage{
		UserID:  userID,
		Message: msgBytes,
	}
}

// BroadcastChatMessagesRead notifies a user that their messages were read by another user (real-time "đã xem")
func (h *Hub) BroadcastChatMessagesRead(receiverUserID string, payload interface{}) {
	msg := Message{
		Type:    "chat_messages_read",
		Payload: payload,
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("WebSocket - ❌ Error marshaling chat_messages_read: %v", err)
		return
	}

	h.broadcastToUser <- &UserMessage{
		UserID:  receiverUserID,
		Message: msgBytes,
	}
}

// BroadcastBetReceiptUpdated notifies all connected clients (admins) that an order was created/updated - for real-time đơn hàng
func (h *Hub) BroadcastBetReceiptUpdated(payload interface{}) {
	msg := Message{
		Type:    "bet_receipt_updated",
		Payload: payload,
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("WebSocket - ❌ Error marshaling bet_receipt_updated: %v", err)
		return
	}
	select {
	case h.broadcastToAll <- msgBytes:
	default:
		log.Printf("WebSocket - ⚠️ broadcastToAll channel full, drop bet_receipt_updated")
	}
}

// readPump pumps messages from the websocket connection to the hub
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	// Set read deadline, pong handler, etc.
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetReadLimit(512)
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			if gorillaWS.IsUnexpectedCloseError(err, gorillaWS.CloseGoingAway, gorillaWS.CloseAbnormalClosure) {
				log.Printf("WebSocket - ❌ Error: %v", err)
			}
			break
		}
	}
}

// writePump pumps messages from the hub to the websocket connection
func (c *Client) WritePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(gorillaWS.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(gorillaWS.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current websocket message
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(gorillaWS.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

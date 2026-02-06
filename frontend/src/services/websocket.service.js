class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000; // 3 seconds
    this.listeners = new Map();
    this.isConnecting = false;
    this.shouldReconnect = true;
  }

  connect(token) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket - ✅ Already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('WebSocket - ⏳ Connection in progress...');
      return;
    }

    this.isConnecting = true;
    const API_BASE_URL = process.env.REACT_APP_API_URL 
      ? process.env.REACT_APP_API_URL
      : 'http://localhost:8080/api';
    
    // Convert http:// to ws:// or https:// to wss://
    const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws?token=' + encodeURIComponent(token);
    
    console.log('WebSocket - 🔌 Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***'));

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket - ✅ Connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket - 📨 Message received:', data.type);
          this.emit(data.type, data.payload);
        } catch (error) {
          console.error('WebSocket - ❌ Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket - ❌ Error:', error);
        this.isConnecting = false;
        this.emit('error', error);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket - ❌ Connection closed:', event.code, event.reason);
        this.isConnecting = false;
        this.emit('disconnected', event);
        
        // Auto-reconnect if not intentionally closed
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`WebSocket - 🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => {
            if (this.shouldReconnect) {
              this.connect(token);
            }
          }, this.reconnectDelay);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('WebSocket - ❌ Max reconnection attempts reached');
          this.emit('reconnect_failed');
        }
      };
    } catch (error) {
      console.error('WebSocket - ❌ Connection error:', error);
      this.isConnecting = false;
      this.emit('error', error);
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`WebSocket - ❌ Error in listener for ${event}:`, error);
        }
      });
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
export default websocketService;

package client

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"time"

	"github.com/gorilla/websocket"
)

// WebSocketMessage represents a message sent over WebSocket
type WebSocketMessage struct {
	Type       string                 `json:"type"`
	SessionID  string                 `json:"session_id,omitempty"`
	Text       string                 `json:"text,omitempty"`
	IsFinal    bool                   `json:"is_final,omitempty"`
	Confidence float64                `json:"confidence,omitempty"`
	Level      float64                `json:"level,omitempty"`
	Spectrum   []float64              `json:"spectrum,omitempty"`
	Status     string                 `json:"status,omitempty"`
	Timestamp  string                 `json:"timestamp,omitempty"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
	Data       interface{}            `json:"data,omitempty"`
	Command    string                 `json:"command,omitempty"`
	Message    string                 `json:"message,omitempty"`
}

// MessageHandler defines the callback function type for handling messages
type MessageHandler func(msg WebSocketMessage)

// WebSocketClient handles real-time communication with the backend
type WebSocketClient struct {
	conn           *websocket.Conn
	baseURL        string
	sessionID      string
	messageHandler MessageHandler
	done           chan struct{}
	connected      bool
}

// NewWebSocketClient creates a new WebSocket client
func NewWebSocketClient(host string, port string, sessionID string) *WebSocketClient {
	return &WebSocketClient{
		baseURL:   fmt.Sprintf("ws://%s:%s", host, port),
		sessionID: sessionID,
		done:      make(chan struct{}),
	}
}

// SetMessageHandler sets the callback function for handling incoming messages
func (c *WebSocketClient) SetMessageHandler(handler MessageHandler) {
	c.messageHandler = handler
}

// Connect establishes a WebSocket connection to the backend
func (c *WebSocketClient) Connect(ctx context.Context) error {
	u, err := url.Parse(fmt.Sprintf("%s/ws/%s", c.baseURL, c.sessionID))
	if err != nil {
		return fmt.Errorf("failed to parse WebSocket URL: %w", err)
	}

	dialer := websocket.DefaultDialer
	dialer.HandshakeTimeout = 10 * time.Second

	conn, _, err := dialer.DialContext(ctx, u.String(), nil)
	if err != nil {
		return fmt.Errorf("failed to connect to WebSocket: %w", err)
	}

	c.conn = conn
	c.connected = true

	// Start message handling goroutine
	go c.handleMessages()

	// Send initial ping to test connection
	return c.SendPing()
}

// IsConnected returns whether the client is currently connected
func (c *WebSocketClient) IsConnected() bool {
	return c.connected
}

// SendMessage sends a message to the WebSocket server
func (c *WebSocketClient) SendMessage(msg WebSocketMessage) error {
	if !c.connected || c.conn == nil {
		return fmt.Errorf("WebSocket not connected")
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
		c.connected = false
		return fmt.Errorf("failed to send message: %w", err)
	}

	return nil
}

// SendPing sends a ping message to test connectivity
func (c *WebSocketClient) SendPing() error {
	return c.SendMessage(WebSocketMessage{
		Type:      "ping",
		Timestamp: time.Now().Format(time.RFC3339),
	})
}

// SendCommand sends a command to the backend
func (c *WebSocketClient) SendCommand(command string) error {
	return c.SendMessage(WebSocketMessage{
		Type:    "command",
		Command: command,
	})
}

// SendAudioData sends audio data to the backend for processing
func (c *WebSocketClient) SendAudioData(data interface{}) error {
	return c.SendMessage(WebSocketMessage{
		Type: "audio_data",
		Data: data,
	})
}

// handleMessages handles incoming WebSocket messages
func (c *WebSocketClient) handleMessages() {
	defer func() {
		c.connected = false
		if c.conn != nil {
			c.conn.Close()
		}
		close(c.done)
	}()

	for {
		if !c.connected || c.conn == nil {
			break
		}

		_, messageData, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		var msg WebSocketMessage
		if err := json.Unmarshal(messageData, &msg); err != nil {
			log.Printf("Failed to unmarshal message: %v", err)
			continue
		}

		// Call the message handler if set
		if c.messageHandler != nil {
			c.messageHandler(msg)
		}
	}
}

// Close closes the WebSocket connection
func (c *WebSocketClient) Close() error {
	c.connected = false

	if c.conn != nil {
		// Send close message
		err := c.conn.WriteMessage(
			websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""),
		)
		if err != nil {
			log.Printf("Error sending close message: %v", err)
		}

		// Close connection
		c.conn.Close()
	}

	// Wait for message handler to finish
	select {
	case <-c.done:
	case <-time.After(1 * time.Second):
		// Timeout waiting for graceful close
	}

	return nil
}

// Wait waits for the connection to close
func (c *WebSocketClient) Wait() {
	<-c.done
}

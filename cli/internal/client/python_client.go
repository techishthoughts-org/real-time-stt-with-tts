package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// PythonClient handles communication with the Python backend
type PythonClient struct {
	baseURL    string
	httpClient *http.Client
}

// SessionConfig represents session configuration
type SessionConfig struct {
	Model        string `json:"model"`
	Device       string `json:"device"`
	Language     string `json:"language"`
	OpenAIKey    string `json:"openai_key,omitempty"`
	InputDevice  int    `json:"input_device,omitempty"`
	OutputDevice int    `json:"output_device,omitempty"`
}

// Session represents an active session
type Session struct {
	ID        string                 `json:"id"`
	Config    *SessionConfig         `json:"config"`
	Status    string                 `json:"status"`
	CreatedAt time.Time              `json:"created_at"`
	Metadata  map[string]interface{} `json:"metadata"`
}

// TranscriptionEvent represents a real-time transcription update
type TranscriptionEvent struct {
	SessionID string    `json:"session_id"`
	Text      string    `json:"text"`
	IsFinal   bool      `json:"is_final"`
	Timestamp time.Time `json:"timestamp"`
}

// AIResponse represents an AI response
type AIResponse struct {
	SessionID string    `json:"session_id"`
	Text      string    `json:"text"`
	Timestamp time.Time `json:"timestamp"`
}

// HealthResponse represents a health check response
type HealthResponse struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
	Version   string    `json:"version,omitempty"`
}

// NewPythonClient creates a new Python backend client
func NewPythonClient(baseURL string) *PythonClient {
	return &PythonClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// IsHealthy checks if the Python backend is running and healthy
func (c *PythonClient) IsHealthy() bool {
	resp, err := c.httpClient.Get(c.baseURL + "/health")
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}

// StartSession starts a new speech processing session
func (c *PythonClient) StartSession(config *SessionConfig) (*Session, error) {
	jsonData, err := json.Marshal(config)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal config: %w", err)
	}

	resp, err := c.httpClient.Post(
		c.baseURL+"/sessions",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("session creation failed: %s", string(body))
	}

	var session Session
	if err := json.NewDecoder(resp.Body).Decode(&session); err != nil {
		return nil, fmt.Errorf("failed to decode session response: %w", err)
	}

	return &session, nil
}

// StopSession stops an active session
func (c *PythonClient) StopSession(sessionID string) error {
	req, err := http.NewRequest("DELETE", c.baseURL+"/sessions/"+sessionID, nil)
	if err != nil {
		return fmt.Errorf("failed to create stop request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to stop session: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("session stop failed: %s", string(body))
	}

	return nil
}

// GetSession retrieves session information
func (c *PythonClient) GetSession(sessionID string) (*Session, error) {
	resp, err := c.httpClient.Get(c.baseURL + "/sessions/" + sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("get session failed: %s", string(body))
	}

	var session Session
	if err := json.NewDecoder(resp.Body).Decode(&session); err != nil {
		return nil, fmt.Errorf("failed to decode session response: %w", err)
	}

	return &session, nil
}

// ListDevices retrieves available audio devices
func (c *PythonClient) ListDevices() (map[string]interface{}, error) {
	resp, err := c.httpClient.Get(c.baseURL + "/devices")
	if err != nil {
		return nil, fmt.Errorf("failed to list devices: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("list devices failed: %s", string(body))
	}

	var devices map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&devices); err != nil {
		return nil, fmt.Errorf("failed to decode devices response: %w", err)
	}

	return devices, nil
}

// NewClient creates a new Python backend client (alias for NewPythonClient)
func NewClient(host, port string) *PythonClient {
	baseURL := fmt.Sprintf("http://%s:%s", host, port)
	return NewPythonClient(baseURL)
}

// CheckHealth checks if the Python backend is running and returns health info
func (c *PythonClient) CheckHealth(ctx context.Context) (*HealthResponse, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", c.baseURL+"/health", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create health request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to check health: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("health check failed: %s", string(body))
	}

	var health HealthResponse
	if err := json.NewDecoder(resp.Body).Decode(&health); err != nil {
		return nil, fmt.Errorf("failed to decode health response: %w", err)
	}

	return &health, nil
}

// CreateSession creates a new session with optional device specification
func (c *PythonClient) CreateSession(ctx context.Context, device string) (*Session, error) {
	config := &SessionConfig{
		Model:    "tiny",
		Device:   "cpu",
		Language: "auto",
	}

	// Set device if specified
	if device != "" {
		// This could be audio device name - we'll let the backend handle it
		config.Device = device
	}

	jsonData, err := json.Marshal(config)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal config: %w", err)
	}

	req, err := http.NewRequestWithContext(
		ctx, "POST", c.baseURL+"/sessions", bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("session creation failed: %s", string(body))
	}

	var session Session
	if err := json.NewDecoder(resp.Body).Decode(&session); err != nil {
		return nil, fmt.Errorf("failed to decode session response: %w", err)
	}

	return &session, nil
}

// DeleteSession deletes/stops an active session
func (c *PythonClient) DeleteSession(ctx context.Context, sessionID string) error {
	req, err := http.NewRequestWithContext(
		ctx, "DELETE", c.baseURL+"/sessions/"+sessionID, nil,
	)
	if err != nil {
		return fmt.Errorf("failed to create delete request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("session deletion failed: %s", string(body))
	}

	return nil
}

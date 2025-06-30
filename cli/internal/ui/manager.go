package ui

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"realtimestt-cli/internal/client"

	"github.com/fatih/color"
)

// TranscriptionEntry represents a transcription log entry
type TranscriptionEntry struct {
	Text       string
	Timestamp  time.Time
	Confidence float64
	IsFinal    bool
}

// ChatEntry represents an AI chat response
type ChatEntry struct {
	Text         string
	Timestamp    time.Time
	IsAI         bool
	InResponseTo string
}

// SessionStats holds session statistics
type SessionStats struct {
	ConnectionTime      time.Time
	TotalTranscriptions int
	FinalTranscriptions int
	TotalAIResponses    int
	LastAudioUpdate     time.Time
	LastPingTime        time.Time
}

// Manager handles the user interface for the CLI (legacy)
type Manager struct {
	running bool
}

// NewManager creates a new legacy UI manager
func NewManager() *Manager {
	return &Manager{}
}

// Run runs the legacy UI manager
func (m *Manager) Run(session interface{}) error {
	// Legacy implementation - just show a message
	fmt.Println("Legacy UI manager - use NewUIManager instead")
	return nil
}

// Stop stops the legacy UI manager
func (m *Manager) Stop() {
	m.running = false
}

// UIManager manages the real-time terminal interface with WebSocket integration
type UIManager struct {
	mu       sync.RWMutex
	wsClient *client.WebSocketClient
	ctx      context.Context
	cancel   context.CancelFunc

	// Audio visualization data (received via WebSocket)
	audioLevel float64
	spectrum   []float64

	// Transcription data (received via WebSocket)
	transcriptions []TranscriptionEntry

	// AI Chat data (received via WebSocket)
	aiResponses []ChatEntry

	// Status and statistics
	stats            SessionStats
	lastUpdateTime   time.Time
	connectionStatus string

	// Colors
	green  *color.Color
	yellow *color.Color
	red    *color.Color
	blue   *color.Color
	cyan   *color.Color
	white  *color.Color
}

// NewUIManager creates a new UI manager with WebSocket integration
func NewUIManager(wsClient *client.WebSocketClient) *UIManager {
	ctx, cancel := context.WithCancel(context.Background())

	ui := &UIManager{
		wsClient:         wsClient,
		ctx:              ctx,
		cancel:           cancel,
		spectrum:         make([]float64, 59),
		transcriptions:   make([]TranscriptionEntry, 0, 5),
		aiResponses:      make([]ChatEntry, 0, 5),
		lastUpdateTime:   time.Now(),
		connectionStatus: "Connecting...",

		// Initialize colors
		green:  color.New(color.FgGreen),
		yellow: color.New(color.FgYellow),
		red:    color.New(color.FgRed),
		blue:   color.New(color.FgBlue),
		cyan:   color.New(color.FgCyan),
		white:  color.New(color.FgWhite),
	}

	// Set up WebSocket message handler
	wsClient.SetMessageHandler(ui.handleWebSocketMessage)

	return ui
}

// handleWebSocketMessage processes incoming WebSocket messages
func (ui *UIManager) handleWebSocketMessage(msg client.WebSocketMessage) {
	ui.mu.Lock()
	defer ui.mu.Unlock()

	switch msg.Type {
	case "connection_established":
		ui.connectionStatus = "Connected"
		ui.stats.ConnectionTime = time.Now()

	case "audio_data":
		ui.audioLevel = msg.Level
		if len(msg.Spectrum) > 0 {
			// Ensure spectrum is the right size
			ui.spectrum = make([]float64, 59)
			copy(ui.spectrum, msg.Spectrum)
		}
		ui.stats.LastAudioUpdate = time.Now()

	case "transcription":
		entry := TranscriptionEntry{
			Text:       msg.Text,
			Timestamp:  time.Now(),
			Confidence: msg.Confidence,
			IsFinal:    msg.IsFinal,
		}
		ui.addTranscription(entry)
		ui.stats.TotalTranscriptions++
		if msg.IsFinal {
			ui.stats.FinalTranscriptions++
		}

	case "ai_response":
		chatEntry := ChatEntry{
			Text:      msg.Text,
			Timestamp: time.Now(),
			IsAI:      true,
		}
		ui.addAIResponse(chatEntry)
		ui.stats.TotalAIResponses++

	case "status_update":
		ui.connectionStatus = msg.Status

	case "pong":
		// Connection is alive
		ui.stats.LastPingTime = time.Now()

	case "error":
		ui.connectionStatus = fmt.Sprintf("Error: %s", msg.Message)
	}

	ui.lastUpdateTime = time.Now()
}

// Start begins the real-time UI updates
func (ui *UIManager) Start() error {
	// Connect to WebSocket
	if err := ui.wsClient.Connect(ui.ctx); err != nil {
		return fmt.Errorf("failed to connect WebSocket: %w", err)
	}

	// Clear screen and hide cursor
	fmt.Print("\033[2J\033[H\033[?25l")

	// Start the update loop
	go ui.updateLoop()

	return nil
}

// Stop stops the UI manager and cleans up
func (ui *UIManager) Stop() {
	ui.cancel()

	// Show cursor and clean up
	fmt.Print("\033[?25h")

	// Close WebSocket connection
	if ui.wsClient != nil {
		ui.wsClient.Close()
	}
}

// updateLoop runs the main UI update loop
func (ui *UIManager) updateLoop() {
	ticker := time.NewTicker(50 * time.Millisecond) // 20 FPS
	defer ticker.Stop()

	for {
		select {
		case <-ui.ctx.Done():
			return
		case <-ticker.C:
			ui.render()
		}
	}
}

// render draws the complete UI
func (ui *UIManager) render() {
	ui.mu.RLock()
	defer ui.mu.RUnlock()

	// Move cursor to top-left
	fmt.Print("\033[H")

	// Render header
	ui.renderHeader()

	// Render audio spectrum (top section)
	ui.renderAudioSpectrum()

	// Render transcriptions (middle-left section)
	ui.renderTranscriptions()

	// Render AI responses (middle-right section)
	ui.renderAIResponses()

	// Render status dashboard (bottom section)
	ui.renderStatusDashboard()
}

// renderHeader renders the application header
func (ui *UIManager) renderHeader() {
	title := "🎤 RealtimeSTT - Real-time Speech Recognition with AI"
	ui.cyan.Printf("╔%s╗\n", strings.Repeat("═", len(title)+2))
	ui.cyan.Printf("║ %s ║\n", title)
	ui.cyan.Printf("╚%s╝\n", strings.Repeat("═", len(title)+2))
	fmt.Println()
}

// renderAudioSpectrum renders the real-time audio spectrum visualization
func (ui *UIManager) renderAudioSpectrum() {
	ui.blue.Println("┌─ Audio Spectrum & Level ─────────────────────────────────────────┐")

	// Audio level meter (horizontal bar)
	levelWidth := 50
	filledWidth := int(ui.audioLevel * float64(levelWidth))

	fmt.Print("│ Level: [")
	for i := 0; i < levelWidth; i++ {
		if i < filledWidth {
			if ui.audioLevel > 0.8 {
				ui.red.Print("█")
			} else if ui.audioLevel > 0.5 {
				ui.yellow.Print("█")
			} else {
				ui.green.Print("█")
			}
		} else {
			fmt.Print("░")
		}
	}
	fmt.Printf("] %.1f%%", ui.audioLevel*100)

	// Pad to column width
	padding := 69 - (8 + levelWidth + 2 + 6) // Total width minus used space
	fmt.Printf("%s│\n", strings.Repeat(" ", padding))

	// Spectrum display (3 rows of frequency bars)
	rows := 3
	barsPerRow := 20 // Show only first 20 frequency bins per row for readability

	for row := 0; row < rows; row++ {
		fmt.Print("│ ")
		startIdx := row * barsPerRow
		endIdx := startIdx + barsPerRow
		if endIdx > len(ui.spectrum) {
			endIdx = len(ui.spectrum)
		}

		for i := startIdx; i < endIdx; i++ {
			if i < len(ui.spectrum) {
				height := ui.spectrum[i]
				if height > 0.7 {
					ui.red.Print("█")
				} else if height > 0.4 {
					ui.yellow.Print("█")
				} else if height > 0.1 {
					ui.green.Print("▓")
				} else {
					fmt.Print("░")
				}
			} else {
				fmt.Print("░")
			}
		}

		// Show frequency range for this row
		freqStart := startIdx * 40 // Approximate Hz per bin
		freqEnd := (endIdx - 1) * 40
		freqInfo := fmt.Sprintf(" (%d-%d Hz)", freqStart, freqEnd)

		// Pad to column width
		usedSpace := 2 + (endIdx - startIdx) + len(freqInfo)
		padding := 69 - usedSpace
		fmt.Printf("%s%s│\n", freqInfo, strings.Repeat(" ", padding))
	}

	ui.blue.Println("└──────────────────────────────────────────────────────────────────┘")
	fmt.Println()
}

// renderTranscriptions renders the recent voice transcriptions
func (ui *UIManager) renderTranscriptions() {
	ui.green.Println("┌─ Voice Transcriptions (Last 5) ──────────────────────────────────┐")

	// Show last 5 transcriptions
	startIdx := 0
	if len(ui.transcriptions) > 5 {
		startIdx = len(ui.transcriptions) - 5
	}

	for i := startIdx; i < len(ui.transcriptions); i++ {
		entry := ui.transcriptions[i]
		timestamp := entry.Timestamp.Format("15:04:05")

		// Color code based on confidence and finality
		var textColor *color.Color
		prefix := "│ "

		if entry.IsFinal {
			if entry.Confidence > 0.8 {
				textColor = ui.green
				prefix += "✓ "
			} else {
				textColor = ui.yellow
				prefix += "~ "
			}
		} else {
			textColor = ui.cyan
			prefix += "… "
		}

		// Truncate text if too long
		maxTextLength := 45
		displayText := entry.Text
		if len(displayText) > maxTextLength {
			displayText = displayText[:maxTextLength-3] + "..."
		}

		// Display with confidence score
		textColor.Printf("%s[%s] %s (%.0f%%)",
			prefix, timestamp, displayText, entry.Confidence*100)

		// Pad to column width
		usedSpace := len(prefix) + 10 + len(displayText) + 7 // Approximate
		padding := 69 - usedSpace
		if padding < 0 {
			padding = 0
		}
		fmt.Printf("%s│\n", strings.Repeat(" ", padding))
	}

	// Fill empty rows if needed
	for i := len(ui.transcriptions); i < 5; i++ {
		fmt.Printf("│%s│\n", strings.Repeat(" ", 67))
	}

	ui.green.Println("└──────────────────────────────────────────────────────────────────┘")
	fmt.Println()
}

// renderAIResponses renders the AI assistant responses
func (ui *UIManager) renderAIResponses() {
	ui.yellow.Println("┌─ AI Assistant Responses ─────────────────────────────────────────┐")

	// Show last 3 AI responses with text wrapping
	startIdx := 0
	if len(ui.aiResponses) > 3 {
		startIdx = len(ui.aiResponses) - 3
	}

	for i := startIdx; i < len(ui.aiResponses); i++ {
		entry := ui.aiResponses[i]
		timestamp := entry.Timestamp.Format("15:04:05")

		// Word wrap the text
		maxLineLength := 60
		words := strings.Fields(entry.Text)
		lines := []string{}
		currentLine := ""

		for _, word := range words {
			if len(currentLine)+len(word)+1 <= maxLineLength {
				if currentLine == "" {
					currentLine = word
				} else {
					currentLine += " " + word
				}
			} else {
				if currentLine != "" {
					lines = append(lines, currentLine)
				}
				currentLine = word
			}
		}
		if currentLine != "" {
			lines = append(lines, currentLine)
		}

		// Display first line with timestamp
		if len(lines) > 0 {
			ui.cyan.Printf("│ 🤖 [%s] %s", timestamp, lines[0])
			padding := 69 - (12 + len(lines[0]))
			if padding < 0 {
				padding = 0
			}
			fmt.Printf("%s│\n", strings.Repeat(" ", padding))

			// Display remaining lines
			for j := 1; j < len(lines); j++ {
				ui.white.Printf("│       %s", lines[j])
				padding := 69 - (7 + len(lines[j]))
				if padding < 0 {
					padding = 0
				}
				fmt.Printf("%s│\n", strings.Repeat(" ", padding))
			}
		}

		// Add separator between responses
		if i < len(ui.aiResponses)-1 {
			fmt.Printf("│%s│\n", strings.Repeat("─", 67))
		}
	}

	// Fill empty space if needed
	currentLines := 0
	for i := startIdx; i < len(ui.aiResponses); i++ {
		entry := ui.aiResponses[i]
		words := strings.Fields(entry.Text)
		lines := (len(strings.Join(words, " ")) / 60) + 1
		currentLines += lines + 1 // +1 for separator
	}

	targetLines := 8 // Target display area
	for i := currentLines; i < targetLines; i++ {
		fmt.Printf("│%s│\n", strings.Repeat(" ", 67))
	}

	ui.yellow.Println("└──────────────────────────────────────────────────────────────────┘")
	fmt.Println()
}

// renderStatusDashboard renders the live status and statistics
func (ui *UIManager) renderStatusDashboard() {
	ui.blue.Println("┌─ Live Status Dashboard ──────────────────────────────────────────┐")

	// Connection status
	statusColor := ui.green
	if ui.connectionStatus != "Connected" && ui.connectionStatus != "listening" {
		statusColor = ui.red
	}

	statusText := fmt.Sprintf("Status: %s", ui.connectionStatus)
	statusColor.Printf("│ %s", statusText)
	padding := 69 - (2 + len(statusText))
	fmt.Printf("%s│\n", strings.Repeat(" ", padding))

	// Statistics row 1
	uptime := time.Since(ui.stats.ConnectionTime).Truncate(time.Second)
	stats1 := fmt.Sprintf("Uptime: %s | Transcriptions: %d (%d final)",
		uptime, ui.stats.TotalTranscriptions, ui.stats.FinalTranscriptions)
	fmt.Printf("│ %s", stats1)
	padding = 69 - (2 + len(stats1))
	fmt.Printf("%s│\n", strings.Repeat(" ", padding))

	// Statistics row 2
	stats2 := fmt.Sprintf("AI Responses: %d | Last Update: %s",
		ui.stats.TotalAIResponses, ui.lastUpdateTime.Format("15:04:05"))
	fmt.Printf("│ %s", stats2)
	padding = 69 - (2 + len(stats2))
	fmt.Printf("%s│\n", strings.Repeat(" ", padding))

	// Activity indicator
	activity := "○" // Default inactive
	if time.Since(ui.stats.LastAudioUpdate) < 100*time.Millisecond {
		activity = "●" // Active
	}

	activityText := fmt.Sprintf("Audio Activity: %s | WebSocket: %s",
		activity, func() string {
			if ui.wsClient.IsConnected() {
				return "Connected"
			}
			return "Disconnected"
		}())

	fmt.Printf("│ %s", activityText)
	padding = 69 - (2 + len(activityText))
	fmt.Printf("%s│\n", strings.Repeat(" ", padding))

	ui.blue.Println("└──────────────────────────────────────────────────────────────────┘")

	// Instructions
	ui.cyan.Println("\nPress Ctrl+C to exit")
}

// addTranscription adds a new transcription entry
func (ui *UIManager) addTranscription(entry TranscriptionEntry) {
	ui.transcriptions = append(ui.transcriptions, entry)

	// Keep only last 10 entries in memory
	if len(ui.transcriptions) > 10 {
		ui.transcriptions = ui.transcriptions[len(ui.transcriptions)-10:]
	}
}

// addAIResponse adds a new AI response entry
func (ui *UIManager) addAIResponse(entry ChatEntry) {
	ui.aiResponses = append(ui.aiResponses, entry)

	// Keep only last 5 entries in memory
	if len(ui.aiResponses) > 5 {
		ui.aiResponses = ui.aiResponses[len(ui.aiResponses)-5:]
	}
}

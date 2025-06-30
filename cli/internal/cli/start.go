package cli

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
	"github.com/spf13/cobra"

	"realtimestt-cli/internal/client"
	"realtimestt-cli/internal/ui"
)

var startCmd = &cobra.Command{
	Use:   "start",
	Short: "Start a real-time speech recognition session",
	Long: `Start a new real-time speech recognition session with AI processing.

This command will:
• Connect to the RealtimeSTT backend
• Create a new session for speech processing
• Display real-time audio visualization
• Show live transcriptions and AI responses
• Provide interactive controls

The session will continue until you press Ctrl+C to exit.`,
	Run: runStartSession,
}

func init() {
	startCmd.Flags().StringP("host", "H", "localhost", "Backend host")
	startCmd.Flags().StringP("port", "p", "8000", "Backend port")
	startCmd.Flags().StringP("device", "d", "", "Audio device name (optional)")
	startCmd.Flags().BoolP("verbose", "v", false, "Enable verbose logging")
}

func runStartSession(cmd *cobra.Command, args []string) {
	host, _ := cmd.Flags().GetString("host")
	port, _ := cmd.Flags().GetString("port")
	device, _ := cmd.Flags().GetString("device")
	verbose, _ := cmd.Flags().GetBool("verbose")

	// Colors for output
	green := color.New(color.FgGreen)
	red := color.New(color.FgRed)
	blue := color.New(color.FgBlue)
	yellow := color.New(color.FgYellow)

	// Create spinner for initialization
	s := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
	s.Prefix = "🚀 "
	s.Suffix = " Initializing RealtimeSTT session..."

	if verbose {
		fmt.Printf("Starting session with host=%s, port=%s, device=%s\n", host, port, device)
	}

	s.Start()

	// Create HTTP client for REST API calls
	httpClient := client.NewClient(host, port)

	// Check backend health
	if verbose {
		s.Suffix = " Checking backend health..."
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	health, err := httpClient.CheckHealth(ctx)
	if err != nil {
		s.Stop()
		red.Printf("❌ Failed to connect to backend: %v\n", err)
		red.Println("💡 Make sure the backend is running with: make run-backend")
		os.Exit(1)
	}

	if verbose {
		s.Suffix = fmt.Sprintf(" Backend healthy (%s)...", health.Status)
	}

	// Create session
	if verbose {
		s.Suffix = " Creating new session..."
	}

	session, err := httpClient.CreateSession(ctx, device)
	if err != nil {
		s.Stop()
		red.Printf("❌ Failed to create session: %v\n", err)
		os.Exit(1)
	}

	if verbose {
		s.Suffix = fmt.Sprintf(" Session created (ID: %s)...", session.ID[:8])
	}

	// Create WebSocket client for real-time communication
	wsClient := client.NewWebSocketClient(host, port, session.ID)

	// Create UI manager with WebSocket integration
	uiManager := ui.NewUIManager(wsClient)

	s.Stop()

	// Display session info
	green.Println("✅ RealtimeSTT session initialized successfully!")
	fmt.Println()
	blue.Printf("📊 Session ID: %s\n", session.ID)
	blue.Printf("🎙️  Audio Device: %s\n", func() string {
		if device == "" {
			return "Default"
		}
		return device
	}())
	blue.Printf("🔗 Backend: %s:%s\n", host, port)
	blue.Printf("⚡ WebSocket: ws://%s:%s/ws/%s\n", host, port, session.ID)
	fmt.Println()

	yellow.Println("🎤 Starting real-time speech recognition with AI...")
	fmt.Println()

	// Start the UI manager
	if err := uiManager.Start(); err != nil {
		red.Printf("❌ Failed to start UI: %v\n", err)
		// Clean up session
		httpClient.DeleteSession(context.Background(), session.ID)
		os.Exit(1)
	}

	// Set up signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Wait for interrupt signal
	<-sigChan

	// Graceful shutdown
	fmt.Print("\033[?25h") // Show cursor
	fmt.Println()
	yellow.Println("🛑 Shutting down...")

	// Stop UI manager
	uiManager.Stop()

	// Clean up session
	if verbose {
		fmt.Printf("Cleaning up session %s...\n", session.ID)
	}

	cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cleanupCancel()

	if err := httpClient.DeleteSession(cleanupCtx, session.ID); err != nil {
		if verbose {
			fmt.Printf("Warning: Failed to clean up session: %v\n", err)
		}
	}

	green.Println("✅ Session ended successfully!")
}

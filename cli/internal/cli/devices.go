package cli

import (
	"encoding/json"
	"fmt"

	"github.com/fatih/color"
	"github.com/spf13/cobra"

	"realtimestt-cli/internal/client"
)

// devicesCmd represents the devices command
var devicesCmd = &cobra.Command{
	Use:   "devices",
	Short: "📱 List available audio devices",
	Long: color.MagentaString(`
List all available audio input and output devices.
This helps you identify device indices for use with --input-device and --output-device flags.

Example:
  realtimestt devices
`),
	RunE: runDevices,
}

func init() {
	rootCmd.AddCommand(devicesCmd)
}

func runDevices(cmd *cobra.Command, args []string) error {
	// Initialize Python backend client
	backendClient := client.NewPythonClient(pythonBackendURL)

	// Check if backend is running
	if !backendClient.IsHealthy() {
		color.Red("❌ Python backend is not running at %s", pythonBackendURL)
		color.Yellow("💡 Please start the Python backend first:")
		color.Cyan("   python -m src.realtime_stt.main")
		return fmt.Errorf("backend not available")
	}

	// Get devices
	devices, err := backendClient.ListDevices()
	if err != nil {
		color.Red("❌ Failed to list devices: %v", err)
		return err
	}

	// Display devices
	color.Green("🎵 Available Audio Devices:")
	color.White("=====================================")

	// Pretty print the devices JSON
	prettyJSON, err := json.MarshalIndent(devices, "", "  ")
	if err != nil {
		color.Red("❌ Failed to format devices: %v", err)
		return err
	}

	fmt.Println(string(prettyJSON))

	color.White("\n💡 Usage Tips:")
	color.Cyan("  • Use device index numbers with --input-device and --output-device")
	color.Cyan("  • Device 0 is typically the built-in microphone")
	color.Cyan("  • Device 1 is typically the built-in speakers")

	return nil
}

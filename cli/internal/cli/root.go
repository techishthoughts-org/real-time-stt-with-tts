package cli

import (
	"fmt"
	"os"

	"github.com/fatih/color"
	"github.com/spf13/cobra"
)

var (
	// Global flags
	pythonBackendURL string
	verbose          bool
	configFile       string
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "realtimestt",
	Short: "🎤 Real-time Speech-to-Text CLI Bridge",
	Long: color.CyanString(`
┌─────────────────────────────────────────────────────────────┐
│                    🎤 RealtimeSTT CLI                       │
│                                                             │
│  Go CLI Bridge for Python Speech-to-Text Backend           │
│  Provides a fast, native CLI interface to the Python core  │
└─────────────────────────────────────────────────────────────┘
`),
	Version: "2.0.0",
}

// Execute adds all child commands to the root command and sets flags appropriately.
func Execute() error {
	return rootCmd.Execute()
}

func init() {
	cobra.OnInitialize(initConfig)

	// Global flags
	rootCmd.PersistentFlags().StringVar(&pythonBackendURL, "backend", "http://localhost:8000", "Python backend URL")
	rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "Verbose output")
	rootCmd.PersistentFlags().StringVar(&configFile, "config", "", "Config file (default is $HOME/.realtimestt.yaml)")

	// Add subcommands
	rootCmd.AddCommand(startCmd)
	rootCmd.AddCommand(devicesCmd)

	// Add version template
	rootCmd.SetVersionTemplate(`{{printf "%s: %s - version %s\n" .Name .Short .Version}}`)
}

func initConfig() {
	if configFile != "" {
		// Use config file from the flag
		fmt.Printf("Using config file: %s\n", configFile)
	} else {
		// Find home directory
		home, err := os.UserHomeDir()
		if err != nil {
			fmt.Printf("Warning: Could not find home directory: %v\n", err)
			return
		}

		// Search config in home directory with name ".realtimestt" (without extension)
		configFile = home + "/.realtimestt.yaml"
	}
}

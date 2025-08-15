#!/bin/bash

# Linux system integration script for Gon Voice Assistant
# This script helps integrate the app with Linux desktop environments

set -e

APP_NAME="Gon Voice Assistant"
APP_ID="com.voice.assistant"
DESKTOP_FILE="$HOME/.local/share/applications/$APP_ID.desktop"
ICON_DIR="$HOME/.local/share/icons"

echo "🐧 Setting up Linux integration for $APP_NAME..."

# Create desktop entry
cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=$APP_NAME
Comment=Your personal AI voice assistant
Exec=$PWD/dist/linux-unpacked/voice-assistant-electron
Icon=$APP_ID
Terminal=false
Categories=Utility;AudioVideo;Audio;Video;
Keywords=voice;assistant;ai;llm;stt;tts;
StartupWMClass=$APP_NAME
EOF

echo "✅ Created desktop entry: $DESKTOP_FILE"

# Create icon directory
mkdir -p "$ICON_DIR"

# Copy icon if it exists
if [ -f "build/icon.png" ]; then
    cp build/icon.png "$ICON_DIR/$APP_ID.png"
    echo "✅ Copied icon to: $ICON_DIR/$APP_ID.png"
else
    echo "⚠️  Icon not found at build/icon.png"
fi

# Make desktop file executable
chmod +x "$DESKTOP_FILE"

# Update desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$HOME/.local/share/applications"
    echo "✅ Updated desktop database"
fi

# Update icon cache
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t "$ICON_DIR"
    echo "✅ Updated icon cache"
fi

echo "🎉 Linux integration complete!"
echo "📝 The app should now appear in your application menu"
echo "🔧 To uninstall, run: rm '$DESKTOP_FILE'"

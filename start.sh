#!/bin/bash

# Gon Voice Assistant Web App Startup Script

echo "🎭 Starting Gon Voice Assistant Web App..."
echo ""

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.6+ and try again."
    exit 1
fi

# Check if port 3000 is available
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3000 is already in use. Stopping existing process..."
    pkill -f "python3 server.py"
    sleep 2
fi

# Start the server
echo "🚀 Starting web server on http://localhost:3000"
echo "📊 Health check: http://localhost:3000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 server.py

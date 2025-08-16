#!/bin/bash

# Build Web Version Script for Gon Voice Assistant

echo "🚀 Building web version of Gon Voice Assistant..."

# Kill any existing processes
pkill -f expo
sleep 2

# Clear cache
rm -rf .expo
rm -rf web-build
rm -rf dist

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Build web version
echo "🔨 Building web version..."
npx expo export --platform web --output-dir web-build

# Check if build was successful
if [ -d "web-build" ]; then
    echo "✅ Web build successful!"
    echo "📁 Build directory: web-build/"
    echo "🌐 To serve the build:"
    echo "   cd web-build && python3 -m http.server 8080"
else
    echo "❌ Web build failed!"
    exit 1
fi

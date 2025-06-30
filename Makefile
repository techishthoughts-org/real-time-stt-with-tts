# RealtimeSTT Dual-Stack Makefile
# Manages both Python backend and Go CLI

.PHONY: help build-go run-backend start-session start-all stop-all install clean test-system evaluate-all health-check test-cli test-backend

# Colors for output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

# Default target
help: ## 📋 Show this help message
	@echo "$(CYAN)🎤 RealtimeSTT Dual-Stack Project$(RESET)"
	@echo "$(CYAN)================================$(RESET)"
	@echo ""
	@echo "$(GREEN)Available commands:$(RESET)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-15s$(RESET) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(GREEN)Quick Start:$(RESET)"
	@echo "  $(YELLOW)make install$(RESET)     # Install dependencies"
	@echo "  $(YELLOW)make start-all$(RESET)   # Start everything"

# Installation
install: ## 📦 Install all dependencies and build
	@echo "$(CYAN)Installing Python dependencies...$(RESET)"
	@cd agents && uv sync
	@echo "$(CYAN)Installing Go dependencies...$(RESET)"
	@cd cli && go mod tidy && go mod download
	@echo "$(CYAN)Building Go CLI...$(RESET)"
	@cd cli && go build -o ../bin/realtimestt cmd/main.go
	@echo "$(GREEN)✅ Installation complete!$(RESET)"
	@echo ""
	@echo "$(CYAN)Next step: $(YELLOW)make start-all$(RESET)"

# Building
build-go: ## 🔨 Build Go CLI binary
	@echo "$(CYAN)Building Go CLI...$(RESET)"
	@cd cli && go mod tidy && go mod download
	@cd cli && go build -o ../bin/realtimestt cmd/main.go
	@echo "$(GREEN)✅ Go CLI built: ./bin/realtimestt$(RESET)"

# Running
run-backend: ## 🚀 Start Python backend server
	@echo "$(CYAN)Starting Python backend...$(RESET)"
	@echo "$(YELLOW)Backend: http://localhost:8000$(RESET)"
	@echo "$(YELLOW)API Docs: http://localhost:8000/docs$(RESET)"
	@cd agents && uv run python -m src.realtime_stt.main

start-session: build-go ## 🎯 Start CLI session (requires backend running)
	@echo "$(CYAN)Starting RealtimeSTT session...$(RESET)"
	@./bin/realtimestt start

start-all: build-go ## 🚀 Start everything at once (recommended)
	@echo "$(CYAN)🚀 Starting RealtimeSTT Complete System...$(RESET)"
	@echo "$(YELLOW)Starting Python backend in background...$(RESET)"
	@(cd agents && uv run python -m src.realtime_stt.main > ../backend.log 2>&1) & echo $$! > backend.pid
	@echo "$(GREEN)✅ Backend started (PID: $$(cat backend.pid))$(RESET)"
	@echo "$(YELLOW)Waiting for backend to initialize (this may take 5-10 seconds)...$(RESET)"
	@for i in $$(seq 1 10); do \
		sleep 1; \
		printf "."; \
		curl -s http://localhost:8000/health > /dev/null 2>&1 && break || true; \
	done
	@echo ""
	@curl -s http://localhost:8000/health > /dev/null || (echo "$(RED)❌ Backend failed to start. Check backend.log for details$(RESET)" && kill $$(cat backend.pid) 2>/dev/null || true && rm -f backend.pid backend.log && exit 1)
	@echo "$(GREEN)✅ Backend is healthy$(RESET)"
	@echo "$(YELLOW)Starting CLI session...$(RESET)"
	@echo "$(GREEN)🎤 RealtimeSTT is ready! Speak into your microphone$(RESET)"
	@echo "$(YELLOW)Press Ctrl+C to stop everything$(RESET)"
	@echo ""
	@./bin/realtimestt start; kill $$(cat backend.pid) 2>/dev/null || true; rm -f backend.pid backend.log

stop-all: ## 🛑 Stop all running services
	@echo "$(CYAN)Stopping all RealtimeSTT services...$(RESET)"
	@pkill -f "uvicorn" 2>/dev/null || true
	@pkill -f "python -m src.realtime_stt.main" 2>/dev/null || true
	@pkill -f "realtimestt" 2>/dev/null || true
	@rm -f backend.pid backend.log 2>/dev/null || true
	@echo "$(GREEN)✅ All services stopped$(RESET)"

# Utility
clean: ## 🧹 Clean build artifacts
	@echo "$(CYAN)Cleaning build artifacts...$(RESET)"
	@rm -rf bin/ dist/ __pycache__/ backend.log backend.pid
	@cd cli && go clean
	@cd agents && find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	@echo "$(GREEN)✅ Cleaned$(RESET)"

# Comprehensive system evaluation
evaluate-all: build-go ## 🧪 Run comprehensive system evaluation
	@echo "🧪 Running Comprehensive System Evaluation..."
	@echo "=================================="
	@echo ""
	@echo "1️⃣  Testing Go CLI Build..."
	@if [ -f "./bin/realtimestt" ]; then \
		echo "✅ CLI binary exists"; \
		./bin/realtimestt --version 2>/dev/null && echo "✅ CLI version check passed" || echo "❌ CLI version check failed"; \
		./bin/realtimestt --help > /dev/null 2>&1 && echo "✅ CLI help command works" || echo "❌ CLI help command failed"; \
	else \
		echo "❌ CLI binary not found"; \
	fi
	@echo ""
	@echo "2️⃣  Testing Python Backend Dependencies..."
	@cd agents && uv run python -c "import src.realtime_stt; print('✅ Python package imports successfully')" 2>/dev/null || echo "❌ Python package import failed"
	@cd agents && uv run python -c "import fastapi, uvicorn, websockets; print('✅ Web framework dependencies available')" 2>/dev/null || echo "❌ Web framework dependencies missing"
	@cd agents && uv run python -c "import numpy, sounddevice; print('✅ Audio processing dependencies available')" 2>/dev/null || echo "❌ Audio processing dependencies missing"
	@echo ""
	@echo "3️⃣  Testing Backend Startup (5 second test)..."
	@echo "Starting backend..."
	@(cd agents && timeout 5s uv run python -m src.realtime_stt.main > /tmp/backend_test.log 2>&1) & BACKEND_PID=$$!; \
	sleep 3; \
	if curl -s http://localhost:8000/health > /dev/null 2>&1; then \
		echo "✅ Backend starts and responds to health checks"; \
		curl -s http://localhost:8000/health | head -1; \
	else \
		echo "❌ Backend failed to start or respond"; \
		echo "Backend logs:"; \
		tail -10 /tmp/backend_test.log 2>/dev/null || echo "No logs available"; \
	fi; \
	kill $$BACKEND_PID 2>/dev/null || true; \
	sleep 1
	@echo ""
	@echo "4️⃣  Testing Audio Device Detection..."
	@./bin/realtimestt devices 2>/dev/null && echo "✅ Audio device detection works" || echo "❌ Audio device detection failed"
	@echo ""
	@echo "5️⃣  Testing API Endpoints..."
	@echo "Starting backend for API tests..."
	@(cd agents && uv run python -m src.realtime_stt.main > /dev/null 2>&1) & BACKEND_PID=$$!; \
	sleep 4; \
	echo "Testing /health endpoint..."; \
	curl -s http://localhost:8000/health > /dev/null 2>&1 && echo "✅ /health endpoint works" || echo "❌ /health endpoint failed"; \
	echo "Testing /docs endpoint..."; \
	curl -s http://localhost:8000/docs > /dev/null 2>&1 && echo "✅ /docs endpoint works" || echo "❌ /docs endpoint failed"; \
	echo "Testing WebSocket endpoint..."; \
	timeout 2s curl -s -H "Upgrade: websocket" -H "Connection: Upgrade" http://localhost:8000/ws 2>/dev/null && echo "✅ WebSocket endpoint accessible" || echo "⚠️  WebSocket endpoint test inconclusive"; \
	kill $$BACKEND_PID 2>/dev/null || true; \
	sleep 1
	@echo ""
	@echo "🏁 Evaluation Complete!"
	@echo "=================================="

# Quick system health check
test-system: build-go ## 🔍 Quick system health check
	@echo "🔍 Quick System Health Check..."
	@echo "CLI Binary: " && ([ -f "./bin/realtimestt" ] && echo "✅ Present" || echo "❌ Missing")
	@echo "Python Environment: " && (cd agents && uv run python --version > /dev/null 2>&1 && echo "✅ Ready" || echo "❌ Not Ready")
	@echo "Go Environment: " && (cd cli && go version > /dev/null 2>&1 && echo "✅ Ready" || echo "❌ Not Ready")
	@echo "Port 8000: " && (lsof -i :8000 > /dev/null 2>&1 && echo "⚠️  In Use" || echo "✅ Available")

# Test Python backend components
test-backend: ## 🐍 Test Python backend components
	@cd agents && uv run python ../test_components.py

# Test Go CLI components
test-cli: build-go ## 🔧 Test Go CLI components
	@echo "🔧 Testing Go CLI Components..."
	@echo "Binary execution: " && (./bin/realtimestt --version > /dev/null 2>&1 && echo "✅ Works" || echo "❌ Failed")
	@echo "Help command: " && (./bin/realtimestt --help > /dev/null 2>&1 && echo "✅ Works" || echo "❌ Failed")
	@echo "Device listing: " && (timeout 5s ./bin/realtimestt devices > /dev/null 2>&1 && echo "✅ Works" || echo "❌ Failed")
	@echo "Backend connection test: " && (echo "Starting temporary backend..." && \
		(cd agents && timeout 15s uv run python -m src.realtime_stt.main > /dev/null 2>&1) & BACKEND_PID=$$!; \
		sleep 6; \
		curl -s http://localhost:8000/health > /dev/null 2>&1 && echo "✅ Can connect to backend" || echo "❌ Backend connection failed"; \
		kill $$BACKEND_PID 2>/dev/null || true)

# Health check for running services
health-check: ## 🏥 Check health of running services
	@echo "🏥 Health Check for Running Services..."
	@echo "Backend Status: " && (curl -s http://localhost:8000/health > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Not Running")
	@echo "Port 8000: " && (lsof -i :8000 > /dev/null 2>&1 && echo "✅ In Use" || echo "❌ Available")
	@echo "WebSocket Test: " && (timeout 2s curl -s -H "Upgrade: websocket" -H "Connection: Upgrade" http://localhost:8000/ws > /dev/null 2>&1 && echo "✅ Accessible" || echo "❌ Not Accessible")
	@if [ -f "backend.pid" ]; then \
		PID=$$(cat backend.pid); \
		if ps -p $$PID > /dev/null 2>&1; then \
			echo "Backend Process: ✅ Running (PID: $$PID)"; \
		else \
			echo "Backend Process: ❌ Not Running (stale PID file)"; \
		fi; \
	else \
		echo "Backend Process: ⚠️  No PID file found"; \
	fi

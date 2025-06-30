# RealtimeSTT - Real-time Speech Recognition with AI

🎤 **A modern, high-performance dual-stack speech-to-text application with real-time transcription, AI-powered responses, and TTS capabilities.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Go](https://img.shields.io/badge/Go-1.19+-00ADD8.svg)
![Python](https://img.shields.io/badge/Python-3.8+-3776AB.svg)

> 📚 **[Complete Documentation Index](DOCS.md)** | 🚀 **[Current Development Phase](scripts/phase2_latency_optimization_plan.md)** | ✅ **[Latest Validation Results](scripts/cli_validation_report.md)**

## ✨ Features

### 🎤 **Real-Time Speech Processing**
- **Always-listening mode** - No press-to-talk required
- **Real-time audio spectrum visualization** with 3-row frequency analysis (0-2320 Hz)
- **Live voice transcriptions** with confidence scores and timestamps
- **WebSocket-based real-time communication** at 20 FPS
- **Multi-language support** with automatic language detection
- **Voice Activity Detection (VAD)** for automatic silence detection

### 🤖 **AI Integration**
- **Real-time AI assistant responses** using RAG (Retrieval-Augmented Generation)
- **Local LLM support** (Ollama) with fallback to OpenAI
- **Contextual conversation handling** with memory
- **Knowledge base integration** for intelligent responses
- **Text-to-Speech (TTS)** for AI responses using system voice

### ⚡ **Performance & Architecture**
- **Dual-stack architecture**: Fast Go CLI frontend + Powerful Python backend
- **Instant CLI startup** (~50ms) vs traditional Python startup (~3-5s)
- **Session-based communication** via REST API and WebSocket
- **Lazy service initialization** for optimal performance
- **Cross-platform Go binary** compilation

### 🎨 **Rich Terminal UI**
- **Live audio spectrum** with dynamic frequency bars
- **Real-time transcription log** showing last 5 voice inputs
- **AI chat interface** with multi-line text wrapping
- **Live status dashboard** with uptime, statistics, and connection status
- **Beautiful colored output** with progress indicators

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Go CLI        │    │   REST/WebSocket │    │  Python Agents │
│   Frontend      │◄──►│      API        │◄──►│   (AI/Speech)   │
│                 │    │                 │    │                 │
│ • Rich UI       │    │ • Session Mgmt  │    │ • Speech Proc   │
│ • Audio Viz     │    │ • Real-time     │    │ • AI Reasoning  │
│ • Fast Startup  │    │ • Health Checks │    │ • Audio Devices │
│ • TUI Interface │    │ • WebSocket     │    │ • RAG System    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Stack Components:**
- **Go CLI** (`cli/`): Fast, native command-line interface with rich TUI
- **Python Agents** (`agents/`): Speech processing, AI reasoning, audio handling
- **Communication**: REST API + WebSocket for real-time data
- **AI Services**: RAG with local LLM (Ollama) and OpenAI fallback
- **TTS**: System-native text-to-speech for AI responses

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** with `uv` package manager ([Install uv](https://docs.astral.sh/uv/getting-started/installation/))
- **Go 1.19+** ([Install Go](https://golang.org/doc/install))
- **Audio devices** (microphone/speakers)
- **Optional**: [Ollama](https://ollama.ai/) for local LLM support

### Installation & Usage

1. **Clone and setup:**
```bash
git clone <repository-url>
cd RealtimeSTT
make install  # Installs all dependencies and builds CLI
```

2. **Start everything at once (recommended):**
```bash
make start-all
```

That's it! The system will:
- Start the Python backend in the background
- Wait for it to initialize (5-10 seconds)
- Launch the CLI interface automatically
- Begin listening for speech immediately

### Alternative: Manual Start

If you prefer to run components separately:

```bash
# Terminal 1: Start backend
make run-backend

# Terminal 2: Start CLI (in new terminal)
make start-session
```

## 🎮 Real-Time Interface

When running, you'll see a beautiful real-time interface:

```
╔═════════════════════════════════════════════════════════╗
║ 🎤 RealtimeSTT - Real-time Speech Recognition with AI ║
╚═════════════════════════════════════════════════════════╝

┌─ Audio Spectrum & Level ─────────────────────────────────┐
│ Level: [████████████████████████████░░░░░░░░░░░░░░] 55.2% │
│ ███████▓████▓▓▓██▓█▓ (0-760 Hz)                         │
│ █▓▓█▓▓█▓▓█▓▓▓░▓▓▓▓▓░ (800-1560 Hz)                      │
│ ░▓░░░▓▓▓░▓▓░▓░░▓░░▓ (1600-2320 Hz)                      │
└──────────────────────────────────────────────────────────┘

┌─ Voice Transcriptions (Last 5) ──────────────────────────┐
│ ✓ [00:32:04] Hello, how can I help you today? (98%)     │
│ ✓ [00:32:15] What's the weather like outside? (95%)     │
│ ⧗ [00:32:25] Processing real-time speech... (87%)       │
└──────────────────────────────────────────────────────────┘

┌─ AI Assistant Responses ─────────────────────────────────┐
│ 🤖 [00:32:04] Hello! I'm your AI assistant. I can help  │
│              you with questions and conversations.       │
│ 🤖 [00:32:16] I don't have access to real-time weather  │
│              data, but I can help with other topics.     │
└──────────────────────────────────────────────────────────┘

┌─ Live Status Dashboard ──────────────────────────────────┐
│ Status: Connected | Uptime: 2m 45s | Transcriptions: 3  │
│ AI Responses: 2 | Audio Activity: ● | WebSocket: ✓      │
└──────────────────────────────────────────────────────────┘

Press Ctrl+C to exit
```

**Interface Features:**
- **Audio Spectrum**: Real-time visualization of audio frequencies
- **Voice Transcriptions**: Live speech-to-text with confidence scores
- **AI Responses**: Intelligent AI assistant replies with TTS
- **Status Dashboard**: System health and statistics

## 🔧 Available Commands

All project commands are available through the Makefile:

```bash
# Setup & Installation
make install      # Install all dependencies and build CLI
make clean        # Clean build artifacts

# Running the Application
make start-all    # 🚀 Start everything at once (recommended)
make run-backend  # Start Python backend only
make start-session# Start CLI session (requires backend running)
make stop-all     # Stop all running services

# Development
make build-go     # Build Go CLI binary only
make help         # Show all available commands
```

### Command Details

**`make start-all`** - The main command that:
1. Builds the Go CLI if needed
2. Starts Python backend in background
3. Waits for backend to be healthy
4. Launches CLI interface
5. Handles cleanup when you press Ctrl+C

**`make run-backend`** - For development:
- Starts backend at `http://localhost:8000`
- API documentation at `http://localhost:8000/docs`
- Health check at `http://localhost:8000/health`

## 🛠️ CLI Commands

Once the system is running, the CLI provides several commands:

```bash
# List available audio devices
./bin/realtimestt devices

# Start real-time session
./bin/realtimestt start

# Start with specific devices
./bin/realtimestt start --input-device 0 --output-device 1

# Enable verbose logging
./bin/realtimestt start --verbose

# Show help
./bin/realtimestt --help
```

## 📂 Project Structure

```
RealtimeSTT/
├── cli/                    # 🚀 Golang CLI Frontend
│   ├── cmd/               # CLI entry point and main.go
│   ├── internal/          # Go internal packages
│   │   ├── cli/          # CLI commands and flags
│   │   ├── client/       # HTTP/WebSocket clients
│   │   └── ui/           # Terminal UI management
│   ├── go.mod            # Go dependencies
│   └── go.sum            # Go dependency checksums
├── agents/                # 🤖 Python AI Agents Backend
│   ├── src/realtime_stt/ # Core Python application
│   │   ├── adapters/     # External interfaces
│   │   │   ├── primary/  # Controllers (REST/WebSocket)
│   │   │   └── secondary/# External service adapters
│   │   ├── application/  # Use cases and DTOs
│   │   ├── domain/       # Core business logic
│   │   │   ├── entities/ # Domain entities
│   │   │   ├── repositories/ # Repository interfaces
│   │   │   └── services/ # Domain services (AI, Speech)
│   │   └── infrastructure/ # Technical implementations
│   │       ├── audio/    # Audio processing
│   │       ├── speech/   # STT integration
│   │       ├── tts/      # Text-to-speech
│   │       └── models/   # Data models
│   ├── main.py           # Python application entry point
│   ├── pyproject.toml    # Python dependencies
│   ├── uv.lock          # Python dependency lock
│   └── README.md        # Python-specific documentation
├── bin/                  # 📦 Compiled binaries
├── Makefile             # 🔧 Build and run commands
└── README.md           # 📖 Main project documentation
```

## 🌐 API Reference

### REST Endpoints

- `GET /health` - Backend health check
- `GET /devices` - List available audio devices
- `POST /sessions` - Create new session
- `GET /sessions/{id}` - Get session information
- `DELETE /sessions/{id}` - Stop session

### WebSocket Communication

- `ws://localhost:8000/ws/{session_id}` - Real-time communication

**Message Types:**
- `connection_established` - WebSocket connected
- `audio_data` - Real-time audio level and spectrum
- `transcription` - Speech transcription result
- `ai_response` - AI assistant response
- `status_update` - System status changes

## ⚙️ Configuration

### Audio Settings
- **Sample Rate**: 48kHz (configurable)
- **Channels**: Mono input, Stereo output
- **Buffer Size**: Optimized for real-time processing
- **VAD**: Automatic voice activity detection

### AI Settings
- **Local LLM**: Ollama with `llama3.2:3b` (lazy-loaded)
- **Fallback**: OpenAI API (if configured)
- **RAG System**: Knowledge base with sentence transformers
- **Response Time**: < 500ms for most queries
- **TTS**: System-native (macOS `say`, Linux `espeak`)

### Performance Tuning
- **Backend**: Lazy initialization for AI services
- **CLI**: Compiled binary for instant startup (<50ms)
- **WebSocket**: 20 FPS refresh rate
- **Audio**: Real-time processing with minimal latency

## 🔍 Troubleshooting

### Common Issues

**1. Backend won't start:**
```bash
# Check Python environment
uv sync
make install

# Check logs if using start-all
cat backend.log
```

**2. No audio devices detected:**
```bash
# List system audio devices
./bin/realtimestt devices

# Check Python audio dependencies
uv run python -c "import pyaudio; print('PyAudio OK')"
```

**3. WebSocket connection issues:**
```bash
# Check backend health
curl http://localhost:8000/health

# Restart services
make stop-all
make start-all
```

**4. AI responses not working:**
```bash
# Check if Ollama is running (optional)
ollama list

# Verify AI service in backend logs
cat backend.log | grep -i "ai\|rag"
```

**5. No TTS (Text-to-Speech):**
```bash
# Test system TTS (macOS)
say "Hello world"

# Test system TTS (Linux)
espeak "Hello world"
```

### Debug Mode

Enable verbose logging for debugging:

```bash
# Verbose CLI output
./bin/realtimestt start --verbose

# Backend logs
tail -f backend.log
```

## 📊 System Requirements

### Minimum Requirements
- **CPU**: 2+ cores
- **RAM**: 4GB available
- **Audio**: Built-in microphone/speakers
- **Network**: Local network for API communication
- **OS**: macOS, Linux, Windows (WSL)

### Recommended for Best Performance
- **CPU**: 4+ cores (for AI processing)
- **RAM**: 8GB available
- **Audio**: External microphone for better quality
- **Storage**: SSD for faster model loading
- **Optional**: Ollama for local LLM support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test your changes: `make start-all`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Setup

```bash
# Install in development mode
make install

# Start agents backend for development
make run-backend

# Build and test CLI changes
make build-go
./bin/realtimestt start
```

### Folder Structure Benefits

**🚀 Golang CLI (`cli/`)**
- Fast compilation and startup
- Native performance
- Rich terminal interface
- Cross-platform binaries

**🤖 Python Agents (`agents/`)**
- AI/ML capabilities
- Speech processing
- Flexible agent architecture
- RAG and LLM integration

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **[RealtimeSTT](https://github.com/KoljaB/RealtimeSTT)**: Core speech recognition capabilities
- **[FastAPI](https://fastapi.tiangolo.com/)**: High-performance API framework
- **[Cobra](https://cobra.dev/)**: Powerful CLI framework for Go
- **[Ollama](https://ollama.ai/)**: Local LLM inference
- **[UV](https://docs.astral.sh/uv/)**: Fast Python package management

---

## 🎯 Quick Reference

**🚀 Get Started:**
```bash
make install    # Setup everything
make start-all  # Start and use immediately
```

**🎤 Start Talking:**
- Speak naturally into your microphone
- See real-time transcription
- Get AI responses with TTS
- Press Ctrl+C to stop

**🛠️ Development:**
```bash
make run-backend     # Agents backend only
make start-session   # CLI only
make stop-all        # Stop everything
```

**📁 Folder Structure:**
- `cli/` - Golang CLI source code
- `agents/` - Python AI agents backend
- `bin/realtimestt` - Compiled CLI binary (built from `cli/`)
- `Makefile` - Build commands

**📋 CLI Architecture:**
- **Source**: `cli/` contains Go source code
- **Binary**: `bin/realtimestt` is the compiled executable
- **Usage**: Run `./bin/realtimestt` or use `make start-all`

**Ready to experience real-time speech recognition with AI? Start now!** 🎤

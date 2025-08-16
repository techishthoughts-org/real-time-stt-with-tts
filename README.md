# 🎭 Gon Voice Assistant - Real-Time STT with TTS

A comprehensive monorepo featuring a real-time voice assistant with speech-to-text (STT) and text-to-speech (TTS) capabilities across multiple platforms.

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0+
- pnpm 8.0+
- Docker (for dependencies)

### Installation & Running

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start development servers:**
   ```bash
   # Start all services
   pnpm dev
   
   # Or start individual services
   pnpm --filter @voice/client-app dev
   pnpm --filter @voice/server dev
   ```

3. **Build all packages:**
   ```bash
   pnpm build
   ```

4. **Run tests:**
   ```bash
   pnpm test
   ```

## 🎯 Features

### Core Features
- ✅ **Real-time Voice Recognition**: Web Speech API and React Native voice recognition
- ✅ **Text-to-Speech**: Natural speech synthesis across platforms
- ✅ **Multi-platform Support**: Web, Mobile (React Native), and Desktop (Electron)
- ✅ **Modern Architecture**: Monorepo with TypeScript and modern tooling
- ✅ **Comprehensive Testing**: Unit tests, integration tests, and E2E tests
- ✅ **Security Features**: Authentication, encryption, and secure communication
- ✅ **PWA Support**: Progressive Web App capabilities
- ✅ **Voice Biometrics**: User voice identification and authentication

### Platform Support
- **Web Client**: React + TypeScript + Vite + Material-UI
- **Mobile App**: React Native + Expo + TypeScript
- **Desktop App**: Electron + React + TypeScript
- **Backend Server**: Fastify + TypeScript + WebSocket
- **AI Engines**: Multiple LLM providers (OpenRouter, Ollama)
- **STT Engine**: Whisper.cpp integration
- **TTS Engine**: Piper TTS integration

## 🏗️ Architecture

### Project Structure
```
real-time-stt-with-tts/
├── packages/
│   ├── client-app/          # Web client application
│   ├── mobile-app/          # React Native mobile app
│   ├── server/              # Backend API server
│   ├── voice-assistant-electron/ # Desktop Electron app
│   ├── engines/             # AI and voice processing engines
│   │   ├── ai-training/     # AI model training
│   │   ├── llm-manager/     # LLM orchestration
│   │   ├── llm-ollama/      # Ollama integration
│   │   ├── llm-openrouter/  # OpenRouter integration
│   │   ├── stt-whisper-cpp/ # Whisper.cpp STT
│   │   └── tts-piper/       # Piper TTS
│   ├── shared/              # Shared utilities
│   │   ├── config/          # Configuration management
│   │   ├── observability/   # Logging and monitoring
│   │   └── schemas/         # Data schemas and validation
│   └── sdk-js/              # JavaScript SDK
├── tests/                   # E2E tests
├── docker-compose.yml       # Docker services
└── package.json            # Root package configuration
```

### Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Material-UI
- **Mobile**: React Native 0.79.5, Expo 53, TypeScript
- **Backend**: Fastify, TypeScript, WebSocket, Redis
- **AI/ML**: Whisper.cpp, Piper TTS, Multiple LLM providers
- **Testing**: Vitest, Jest, Playwright, React Testing Library
- **Build Tools**: pnpm, TypeScript, Vite, Metro
- **Development**: ESLint, Prettier, Husky, lint-staged

## 🎤 Voice Assistant Features

### Speech Recognition
- Real-time speech-to-text conversion
- Multiple language support
- Continuous listening mode
- Error handling and recovery
- Voice activity detection

### Speech Synthesis
- Natural text-to-speech output
- Multiple voice options
- Configurable speech parameters
- Real-time synthesis

### AI Integration
- Multiple LLM provider support
- Context-aware conversations
- Memory and conversation history
- Custom AI training capabilities

### Security & Privacy
- End-to-end encryption
- Voice biometrics
- Secure authentication
- Data privacy controls
- SSL/TLS encryption

## 🔧 Development

### Development Commands
```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Lint code
pnpm lint

# Format code
pnpm format

# Type checking
pnpm typecheck
```

### Individual Package Development
```bash
# Web client
pnpm --filter @voice/client-app dev

# Mobile app
pnpm --filter @voice/mobile-app start

# Backend server
pnpm --filter @voice/server dev

# Desktop app
pnpm --filter voice-assistant-electron dev
```

### Docker Development
```bash
# Start all services with Docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🧪 Testing

### Test Coverage
- **Unit Tests**: Vitest for web, Jest for mobile
- **Integration Tests**: API and component testing
- **E2E Tests**: Playwright for full application testing
- **Security Tests**: Authentication and encryption validation
- **Performance Tests**: Load testing and optimization

### Running Tests
```bash
# All tests
pnpm test

# Specific package tests
pnpm --filter @voice/client-app test
pnpm --filter @voice/mobile-app test
pnpm --filter @voice/server test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm --filter @voice/client-app test:coverage
```

## 🌐 Browser & Platform Support

### Web Browser Support
- ✅ Chrome 66+ (Recommended)
- ✅ Safari 14.1+
- ✅ Firefox 75+
- ✅ Edge 79+

### Mobile Platform Support
- ✅ iOS 13+ (React Native)
- ✅ Android 8+ (React Native)
- ✅ PWA support for mobile browsers

### Desktop Platform Support
- ✅ Windows 10+ (Electron)
- ✅ macOS 10.14+ (Electron)
- ✅ Linux (Electron)

## 🔍 Troubleshooting

### Common Issues

1. **Build Failures**
   - Ensure Node.js 18+ and pnpm 8+ are installed
   - Clear node_modules and reinstall: `pnpm clean && pnpm install`
   - Check TypeScript errors: `pnpm typecheck`

2. **Mobile App Issues**
   - Ensure Expo CLI is installed: `npm install -g @expo/cli`
   - Clear Metro cache: `npx expo start --clear`
   - Check React Native version compatibility

3. **Voice Recognition Issues**
   - Use HTTPS or localhost (required for Web Speech API)
   - Allow microphone permissions in browser
   - Check browser console for detailed errors

4. **Docker Issues**
   - Ensure Docker and Docker Compose are installed
   - Check port conflicts in docker-compose.yml
   - View logs: `docker-compose logs -f`

### Debug Mode
```bash
# Enable debug logging
DEBUG=* pnpm dev

# View detailed build logs
pnpm build --verbose

# Check system requirements
node --version
pnpm --version
docker --version
```

## 📱 Mobile Development

### React Native Setup
```bash
# Install Expo CLI
npm install -g @expo/cli

# Start mobile development
cd packages/mobile-app
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android
```

### Mobile Features
- Voice recognition with React Native Voice
- Text-to-speech with react-native-tts
- Biometric authentication
- Offline capabilities
- Push notifications

## 🔮 Future Enhancements

### Planned Features
- [ ] **Advanced AI Models**: Custom fine-tuned models
- [ ] **Multi-language Support**: Internationalization
- [ ] **Voice Commands**: Custom command system
- [ ] **Cloud Sync**: Cross-device synchronization
- [ ] **Analytics**: Usage analytics and insights
- [ ] **API Documentation**: OpenAPI/Swagger docs
- [ ] **Plugin System**: Extensible architecture
- [ ] **Enterprise Features**: SSO, LDAP, advanced security

### Technical Improvements
- [ ] **Performance Optimization**: Bundle size reduction
- [ ] **Caching Strategy**: Redis and CDN optimization
- [ ] **Monitoring**: APM and error tracking
- [ ] **CI/CD**: Automated deployment pipelines
- [ ] **Security Audit**: Regular security assessments

## 📄 License

This project is part of the Gon Voice Assistant ecosystem.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `pnpm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Use conventional commits
- Follow the existing code style
- Update documentation as needed

## 📊 Project Status

### Current Status
- ✅ **Core Architecture**: Complete
- ✅ **Web Client**: Production ready
- ✅ **Mobile App**: Beta testing
- ✅ **Backend Server**: Production ready
- ✅ **AI Engines**: Integration complete
- ✅ **Testing Suite**: Comprehensive coverage
- ✅ **Documentation**: Updated and complete

### Recent Fixes
- ✅ Fixed React version compatibility issues
- ✅ Resolved Jest configuration for React Native
- ✅ Fixed TypeScript compilation errors
- ✅ Updated dependency versions
- ✅ Improved test coverage and reliability
- ✅ Enhanced build process and error handling

---

**🎭 Gon Voice Assistant** - Real-time voice interaction across all platforms! 🚀

# Gon Voice Assistant Mobile App

A React Native mobile application for the Gon Voice Assistant, featuring real-time speech recognition, text-to-speech, and AI-powered conversations. Built with Expo for cross-platform support (iOS, Android, and Web).

## 🚀 Features

- **Real-time Speech Recognition**: Convert speech to text using platform-native APIs
- **Text-to-Speech**: Natural voice synthesis for AI responses
- **Cross-platform Support**: iOS, Android, and Web platforms
- **Voice Test Interface**: Comprehensive testing interface similar to test-voice.html
- **Secure Authentication**: Biometric and token-based authentication
- **Offline Support**: Basic functionality when offline
- **Performance Monitoring**: Real-time metrics and logging
- **E2E Testing**: Complete test suite with Playwright

## 📱 Supported Platforms

- **iOS**: Native iOS app with full voice capabilities
- **Android**: Native Android app with full voice capabilities  
- **Web**: Progressive Web App (PWA) with Web Speech API

## 🛠️ Tech Stack

- **Framework**: React Native 0.79.5 + Expo SDK 53
- **Navigation**: React Navigation 6.x
- **State Management**: Zustand
- **Voice**: React Native Voice + Web Speech API
- **Testing**: Jest + React Native Testing Library + Playwright
- **Build**: Metro + Expo CLI
- **Language**: TypeScript

## 📋 Prerequisites

- Node.js 18+ 
- pnpm 8+
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)
- Chrome/Edge (for web development)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install workspace dependencies
pnpm install

# Install mobile app dependencies
cd packages/mobile-app
pnpm install
```

### 2. Start Development Server

```bash
# Start for iOS
pnpm run ios

# Start for Android
pnpm run android

# Start for Web
pnpm run web

# Start Expo development server
pnpm start
```

### 3. Run Tests

```bash
# Run unit tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Run E2E tests
pnpm run e2e:test

# Run E2E tests for web
pnpm run e2e:test:web
```

## 🏗️ Project Structure

```
packages/mobile-app/
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/           # React contexts (Voice, Permissions)
│   ├── screens/            # App screens
│   │   ├── HomeScreen.tsx
│   │   ├── VoiceTestScreen.tsx  # Voice testing interface
│   │   ├── ConversationScreen.tsx
│   │   └── ...
│   ├── services/           # Business logic services
│   │   ├── platformVoiceService.ts  # Platform-specific voice
│   │   ├── security.ts
│   │   └── api.ts
│   ├── store/              # State management
│   └── types/              # TypeScript type definitions
├── e2e/                    # End-to-end tests
├── web/                    # Web-specific files
├── assets/                 # App assets
└── __tests__/              # Unit tests
```

## 🎤 Voice Features

### Platform-Specific Implementation

The app uses different voice APIs based on the platform:

- **iOS/Android**: React Native Voice + React Native TTS
- **Web**: Web Speech API (SpeechRecognition + SpeechSynthesis)

### Voice Test Interface

Access the comprehensive voice testing interface by:
1. Opening the app
2. Tapping the "🧪 Voice Test Interface" button
3. Using the interface to test:
   - Server connectivity
   - Microphone access
   - Speech recognition
   - Text-to-speech
   - AI responses
   - Performance metrics

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the mobile app directory:

```env
# API Configuration
API_BASE_URL=http://localhost:3030
API_TIMEOUT=30000

# Voice Configuration
VOICE_LANGUAGE=en-US
VOICE_SPEED=1.0
VOICE_PITCH=1.0

# Security
ENCRYPTION_KEY=your-encryption-key
BIOMETRIC_ENABLED=true
```

### App Configuration

Edit `app.json` to customize:
- App name and version
- Platform-specific settings
- Permissions
- Build configuration

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage
```

### E2E Tests

```bash
# Install E2E dependencies
pnpm run e2e:install

# Run E2E tests
pnpm run e2e:test

# Run E2E tests for specific platform
pnpm run e2e:test:web
pnpm run e2e:test:mobile
```

### Test Structure

- **Unit Tests**: Jest + React Native Testing Library
- **E2E Tests**: Playwright with multiple browser/device configurations
- **Voice Tests**: Platform-specific voice functionality testing
- **Security Tests**: Authentication and data protection testing

## 🚀 Building for Production

### Web Build

```bash
# Build for web
pnpm run build:web

# Serve web build
pnpm run web:serve
```

### Mobile Builds

```bash
# Build for iOS
pnpm run build:ios

# Build for Android
pnpm run build:android
```

## 🔒 Security Features

- **Biometric Authentication**: Face ID / Touch ID / Fingerprint
- **Secure Storage**: Encrypted local storage
- **Token Management**: Secure session handling
- **Network Security**: SSL pinning and certificate validation
- **Input Validation**: XSS and injection protection

## 📊 Performance Monitoring

The app includes comprehensive performance monitoring:

- **Response Time**: API call latency tracking
- **Audio Level**: Real-time microphone input monitoring
- **Cache Hits**: Performance optimization metrics
- **Error Tracking**: Comprehensive error logging
- **Memory Usage**: Memory leak detection

## 🐛 Troubleshooting

### Common Issues

1. **Metro Bundler Errors**
   ```bash
   # Clear Metro cache
   npx expo start --clear
   ```

2. **Voice Recognition Not Working**
   - Check microphone permissions
   - Ensure HTTPS on web (required for Speech API)
   - Verify platform-specific voice libraries

3. **Build Failures**
   ```bash
   # Clean and reinstall
   pnpm run clean
   pnpm install
   ```

4. **Test Failures**
   ```bash
   # Clear Jest cache
   npx jest --clearCache
   ```

### Platform-Specific Issues

#### iOS
- Ensure Xcode is up to date
- Check iOS deployment target compatibility
- Verify microphone permissions in Info.plist

#### Android
- Ensure Android SDK is properly configured
- Check Android permissions in AndroidManifest.xml
- Verify Google Play Services availability

#### Web
- Use HTTPS for voice features (required by Web Speech API)
- Check browser compatibility (Chrome, Safari, Edge)
- Ensure microphone permissions are granted

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the E2E test examples for usage patterns

## 🔄 Version History

- **v1.0.0**: Initial release with basic voice functionality
- **v1.1.0**: Added Voice Test Interface
- **v1.2.0**: Enhanced E2E testing and performance monitoring
- **v1.3.0**: Improved cross-platform compatibility and security features

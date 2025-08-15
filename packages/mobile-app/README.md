# Gon Voice Assistant Mobile App

A React Native mobile application for the Gon Voice Assistant, providing voice interaction capabilities on iOS and Android devices.

## Features

- **Voice Recognition**: Real-time speech-to-text using device microphone
- **Text-to-Speech**: Natural voice responses from Gon
- **Conversation History**: View and replay previous conversations
- **Offline Mode**: Basic functionality when server is unavailable
- **Push Notifications**: Receive voice assistant alerts
- **Settings Management**: Configure app preferences and permissions

## Prerequisites

- Node.js 16+
- React Native CLI
- Xcode (for iOS development)
- Android Studio (for Android development)
- Gon Voice Assistant server running on localhost:3000

## Installation

1. **Install dependencies**:
   ```bash
   cd packages/mobile-app
   pnpm install
   ```

2. **iOS Setup** (macOS only):
   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **Start the Metro bundler**:
   ```bash
   pnpm start
   ```

4. **Run on device/simulator**:
   ```bash
   # iOS
   pnpm ios

   # Android
   pnpm android
   ```

## Development

### Project Structure

```
src/
├── contexts/           # React Context providers
│   ├── VoiceAssistantContext.tsx
│   └── PermissionsContext.tsx
├── screens/            # App screens
│   ├── HomeScreen.tsx
│   ├── ConversationScreen.tsx
│   └── SettingsScreen.tsx
└── components/         # Reusable components
```

### Key Components

- **VoiceAssistantContext**: Manages voice recognition, TTS, and server communication
- **PermissionsContext**: Handles app permissions (microphone, notifications)
- **HomeScreen**: Main voice interaction interface
- **ConversationScreen**: Chat history and message playback
- **SettingsScreen**: App configuration and permissions

### Configuration

The app connects to the Gon Voice Assistant server running on `localhost:3000`. Update the server URL in `VoiceAssistantContext.tsx` for production deployment.

## Building for Production

### iOS

1. **Archive the app**:
   ```bash
   pnpm build:ios
   ```

2. **Upload to App Store Connect** using Xcode

### Android

1. **Build APK**:
   ```bash
   pnpm build:android
   ```

2. **Upload to Google Play Console**

## Permissions

The app requires the following permissions:

- **Microphone**: For voice recognition
- **Notifications**: For push notifications
- **Storage** (Android): For offline data storage

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `pnpm start --reset-cache`
2. **iOS build errors**: Clean build folder in Xcode
3. **Android build errors**: Clean project with `cd android && ./gradlew clean`
4. **Permission denied**: Check device settings and app permissions

### Debug Mode

Enable debug logging by setting `__DEV__` to true in the app configuration.

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for all new components
3. Test on both iOS and Android devices
4. Update documentation for new features

## License

This project is part of the Gon Voice Assistant and follows the same license terms.

# @voice/sdk-js

JavaScript/TypeScript SDK for Gon Voice Assistant - A comprehensive client library for interacting with the voice assistant API.

## Features

- 🔐 **Authentication**: User registration, login, logout, and session management
- 💬 **Chat**: Send messages and get AI responses with streaming support
- 🎤 **Speech-to-Text**: Transcribe audio to text
- 🔊 **Text-to-Speech**: Convert text to speech
- 👤 **Persona**: Get information about the Gon assistant
- 📊 **Health**: Monitor service health and status
- 🛡️ **Error Handling**: Comprehensive error handling with custom error classes
- 📝 **TypeScript**: Full TypeScript support with type definitions

## Installation

```bash
npm install @voice/sdk-js
# or
yarn add @voice/sdk-js
# or
pnpm add @voice/sdk-js
```

## Quick Start

```typescript
import { createVoiceAssistantClient } from '@voice/sdk-js';

// Create a client instance
const client = createVoiceAssistantClient({
  baseUrl: 'http://localhost:3030',
  debug: true
});

// Register a new user
const auth = await client.register({
  email: 'user@example.com',
  password: 'password123',
  name: 'John Doe'
});

// Send a chat message
const response = await client.chat('Hello, how are you?');
console.log(response.response); // "Hello! I'm doing great, thank you for asking!"

// Get persona information
const persona = await client.getPersonaInfo();
console.log(persona.name); // "Gon"
```

## Configuration

```typescript
import { VoiceAssistantClient } from '@voice/sdk-js';

const client = new VoiceAssistantClient({
  baseUrl: 'https://api.example.com', // API base URL
  apiKey: 'your-api-key',             // Optional API key
  timeout: 30000,                     // Request timeout in ms
  retries: 3,                         // Number of retries
  debug: false                        // Enable debug logging
});
```

## Authentication

### Register a new user

```typescript
const auth = await client.register({
  email: 'user@example.com',
  password: 'password123',
  name: 'John Doe',
  tenantId: 'default' // Optional
});

console.log(auth.user.id); // User ID
console.log(auth.session.id); // Session ID
```

### Login

```typescript
const auth = await client.login({
  email: 'user@example.com',
  password: 'password123'
});

// Session token is automatically stored
console.log(client.isAuthenticated()); // true
```

### Logout

```typescript
await client.logout();
console.log(client.isAuthenticated()); // false
```

### Get current user

```typescript
const user = await client.getCurrentUser();
console.log(user.name); // "John Doe"
console.log(user.quota.currentRequestsToday); // 5
```

### Update profile

```typescript
const updatedUser = await client.updateProfile({
  name: 'John Smith',
  preferences: {
    language: 'en-US',
    voiceSettings: {
      speed: 1.2,
      pitch: 1.0,
      volume: 0.8
    }
  }
});
```

## Chat

### Send a message

```typescript
const response = await client.chat('What is the weather like today?');
console.log(response.response);
console.log(response.model); // "gpt-3.5-turbo"
console.log(response.confidence); // 0.95
```

### Send a message with context

```typescript
const response = await client.chat(
  'What about tomorrow?',
  'The weather today is sunny and 25°C'
);
```

### Streaming chat

```typescript
await client.chatStream('Tell me a story', undefined, {
  onMessage: (message) => {
    console.log('Received:', message.response);
  },
  onError: (error) => {
    console.error('Stream error:', error);
  },
  onClose: () => {
    console.log('Stream closed');
  }
});
```

## Speech-to-Text

```typescript
const result = await client.transcribeAudio({
  data: 'base64-encoded-audio-data',
  sampleRate: 16000,
  channels: 1,
  timestamp: Date.now()
});

console.log(result.text); // "Hello world"
console.log(result.confidence); // 0.95
console.log(result.isFinal); // true
```

## Text-to-Speech

```typescript
const ttsResponse = await client.synthesizeSpeech({
  text: 'Hello, this is a test message',
  voice: 'default',
  speed: 1.0,
  pitch: 1.0
});

for (const chunk of ttsResponse.audioChunks) {
  console.log('Audio chunk:', chunk.data); // base64 encoded audio
  console.log('Is last chunk:', chunk.isLast);
}
```

## Persona Information

```typescript
const persona = await client.getPersonaInfo();
console.log(persona.name); // "Gon"
console.log(persona.language); // "pt-BR"
console.log(persona.personality); // "Friendly and helpful"
console.log(persona.capabilities); // ["chat", "voice", "assistance"]
```

## Health Monitoring

```typescript
const health = await client.getHealthStatus();
console.log(health.status); // "ok"
console.log(health.services.stt); // true
console.log(health.services.tts); // true
console.log(health.services.llm); // true
console.log(health.uptime); // 3600 (seconds)
console.log(health.version); // "1.0.0"
```

## Error Handling

The SDK provides comprehensive error handling with custom error classes:

```typescript
import {
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  ValidationError,
  NetworkError,
  ServiceUnavailableError,
  QuotaExceededError
} from '@voice/sdk-js';

try {
  await client.chat('Hello');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.log('Please login first');
  } else if (error instanceof RateLimitError) {
    console.log('Too many requests, please wait');
  } else if (error instanceof NetworkError) {
    console.log('Network connection issue');
  } else {
    console.log('Unknown error:', error.message);
  }
}
```

## Utility Methods

```typescript
// Set session token manually
client.setSessionToken('your-session-token');

// Get current session token
const token = client.getSessionToken();

// Check if authenticated
if (client.isAuthenticated()) {
  console.log('User is logged in');
}

// Update configuration
client.setBaseUrl('https://new-api.example.com');
client.setApiKey('new-api-key');
client.setDebug(true);
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import type {
  VoiceAssistantConfig,
  ChatResponse,
  UserInfo,
  PersonaInfo,
  HealthStatus,
  STTResult,
  TTSResponse
} from '@voice/sdk-js';

// All methods are fully typed
const response: ChatResponse = await client.chat('Hello');
const user: UserInfo = await client.getCurrentUser();
```

## Examples

### Complete chat application

```typescript
import { createVoiceAssistantClient } from '@voice/sdk-js';

async function chatApp() {
  const client = createVoiceAssistantClient({
    baseUrl: 'http://localhost:3030'
  });

  try {
    // Login
    await client.login({
      email: 'user@example.com',
      password: 'password123'
    });

    // Get persona info
    const persona = await client.getPersonaInfo();
    console.log(`Connected to ${persona.name}`);

    // Start chat loop
    while (true) {
      const message = await getUserInput();
      if (message.toLowerCase() === 'quit') break;

      const response = await client.chat(message);
      console.log(`${persona.name}: ${response.response}`);
    }

    // Logout
    await client.logout();
  } catch (error) {
    console.error('Chat error:', error);
  }
}
```

### Voice assistant with STT/TTS

```typescript
import { createVoiceAssistantClient } from '@voice/sdk-js';

async function voiceAssistant() {
  const client = createVoiceAssistantClient();

  // Login
  await client.login({
    email: 'user@example.com',
    password: 'password123'
  });

  // Transcribe audio
  const audioData = await captureAudio();
  const transcription = await client.transcribeAudio({
    data: audioData,
    sampleRate: 16000,
    channels: 1,
    timestamp: Date.now()
  });

  // Get AI response
  const response = await client.chat(transcription.text);

  // Synthesize speech
  const speech = await client.synthesizeSpeech({
    text: response.response,
    voice: 'default',
    speed: 1.0,
    pitch: 1.0
  });

  // Play audio
  await playAudio(speech.audioChunks[0].data);
}
```

## API Reference

### VoiceAssistantClient

#### Constructor

```typescript
new VoiceAssistantClient(config?: VoiceAssistantConfig)
```

#### Methods

- `register(request: RegisterRequest): Promise<AuthResponse>`
- `login(request: LoginRequest): Promise<AuthResponse>`
- `logout(): Promise<void>`
- `getCurrentUser(): Promise<UserInfo>`
- `updateProfile(request: UpdateProfileRequest): Promise<UserInfo>`
- `chat(message: string, context?: string): Promise<ChatResponse>`
- `chatStream(message: string, context?: string, options?: StreamOptions): Promise<void>`
- `transcribeAudio(audioFrame: AudioFrame): Promise<STTResult>`
- `synthesizeSpeech(request: TTSRequest): Promise<TTSResponse>`
- `getPersonaInfo(): Promise<PersonaInfo>`
- `getHealthStatus(): Promise<HealthStatus>`
- `getLLMHealth(): Promise<any>`
- `setSessionToken(token: string): void`
- `getSessionToken(): string | undefined`
- `isAuthenticated(): boolean`
- `setBaseUrl(url: string): void`
- `setApiKey(key: string): void`
- `setDebug(enabled: boolean): void`

### Error Classes

- `VoiceAssistantError` - Base error class
- `AuthenticationError` - Authentication failures
- `AuthorizationError` - Permission issues
- `RateLimitError` - Rate limiting
- `ValidationError` - Invalid input
- `NetworkError` - Network issues
- `ServiceUnavailableError` - Service unavailable
- `QuotaExceededError` - Quota exceeded

## License

MIT License - see LICENSE file for details.

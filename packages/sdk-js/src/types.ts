export interface VoiceAssistantConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
}

export interface ChatMessage {
  message: string;
  context?: string;
  timestamp?: Date;
}

export interface ChatResponse {
  response: string;
  timestamp: string;
  model?: string;
  confidence?: number;
}

export interface AudioFrame {
  data: string; // base64 encoded audio data
  sampleRate: number;
  channels: number;
  timestamp: number;
}

export interface STTResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

export interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
  pitch?: number;
}

export interface TTSResponse {
  audioChunks: Array<{
    data: string; // base64 encoded audio
    timestamp: number;
    isLast: boolean;
  }>;
}

export interface PersonaInfo {
  name: string;
  language: string;
  personality: string;
  capabilities: string[];
}

export interface HealthStatus {
  status: 'ok' | 'error';
  services: {
    stt: boolean;
    tts: boolean;
    llm: boolean;
    cache: boolean;
  };
  uptime: number;
  version: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  preferences: {
    language: string;
    voiceSettings: {
      speed: number;
      pitch: number;
      volume: number;
    };
    notificationSettings: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  quota: {
    maxRequestsPerDay: number;
    maxConcurrentSessions: number;
    maxStorageGB: number;
    currentRequestsToday: number;
    currentSessions: number;
    currentStorageGB: number;
  };
}

export interface SessionInfo {
  id: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
}

export interface AuthResponse {
  user: UserInfo;
  session: SessionInfo;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  tenantId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  name?: string;
  preferences?: {
    language?: string;
    voiceSettings?: {
      speed?: number;
      pitch?: number;
      volume?: number;
    };
    notificationSettings?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    };
  };
}

export interface StreamOptions {
  onMessage?: (message: ChatResponse) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

export interface VoiceAssistantEvents {
  'chat.message': ChatResponse;
  'chat.error': Error;
  'stt.result': STTResult;
  'tts.audio': TTSResponse;
  'auth.login': AuthResponse;
  'auth.logout': void;
  'health.status': HealthStatus;
}

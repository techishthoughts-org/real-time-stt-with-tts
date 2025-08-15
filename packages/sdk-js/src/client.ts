import {
    AuthenticationError,
    AuthorizationError,
    NetworkError,
    RateLimitError,
    ServiceUnavailableError,
    ValidationError,
    VoiceAssistantError
} from './errors';
import {
    AudioFrame,
    AuthResponse,
    ChatResponse,
    HealthStatus,
    LoginRequest,
    PersonaInfo,
    RegisterRequest,
    StreamOptions,
    STTResult,
    TTSRequest,
    TTSResponse,
    UpdateProfileRequest,
    UserInfo,
    VoiceAssistantConfig
} from './types';

export class VoiceAssistantClient {
  private config: Required<VoiceAssistantConfig>;
  private sessionToken?: string;

  constructor(config: VoiceAssistantConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3030',
      apiKey: config.apiKey || '',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      debug: config.debug || false
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new NetworkError('Request timeout');
        }
        throw new NetworkError(error.message);
      }

      throw new NetworkError('Unknown network error');
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: 'Unknown error' };
    }

    const message = errorData.error || 'Request failed';
    const details = errorData;

    switch (response.status) {
      case 401:
        throw new AuthenticationError(message, details);
      case 403:
        throw new AuthorizationError(message, details);
      case 429:
        throw new RateLimitError(message, details);
      case 400:
        throw new ValidationError(message, details);
      case 503:
        throw new ServiceUnavailableError(message, details);
      default:
        throw new VoiceAssistantError(message, 'HTTP_ERROR', response.status, details);
    }
  }

  // Authentication methods
  async register(request: RegisterRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(request)
    });

    this.sessionToken = response.session.id;
    return response;
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(request)
    });

    this.sessionToken = response.session.id;
    return response;
  }

  async logout(): Promise<void> {
    await this.request<void>('/auth/logout', {
      method: 'POST'
    });

    this.sessionToken = undefined;
  }

  async getCurrentUser(): Promise<UserInfo> {
    const response = await this.request<{ user: UserInfo }>('/auth/me');
    return response.user;
  }

  async updateProfile(request: UpdateProfileRequest): Promise<UserInfo> {
    const response = await this.request<{ user: UserInfo }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(request)
    });
    return response.user;
  }

  // Chat methods
  async chat(message: string, context?: string): Promise<ChatResponse> {
    const response = await this.request<ChatResponse>('/llm/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context })
    });
    return response;
  }

  async chatStream(message: string, context?: string, options?: StreamOptions): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/llm/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.sessionToken}`
      },
      body: JSON.stringify({ message, context })
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new NetworkError('Stream not available');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              options?.onClose?.();
              return;
            }

            try {
              const message: ChatResponse = JSON.parse(data);
              options?.onMessage?.(message);
            } catch (error) {
              options?.onError?.(new Error('Invalid stream data'));
            }
          }
        }
      }
    } catch (error) {
      options?.onError?.(error instanceof Error ? error : new Error('Stream error'));
    } finally {
      reader.releaseLock();
    }
  }

  // STT methods
  async transcribeAudio(audioFrame: AudioFrame): Promise<STTResult> {
    const response = await this.request<STTResult>('/stt/process', {
      method: 'POST',
      body: JSON.stringify(audioFrame)
    });
    return response;
  }

  // TTS methods
  async synthesizeSpeech(request: TTSRequest): Promise<TTSResponse> {
    const response = await this.request<TTSResponse>('/tts/synthesize', {
      method: 'POST',
      body: JSON.stringify(request)
    });
    return response;
  }

  // Persona methods
  async getPersonaInfo(): Promise<PersonaInfo> {
    const response = await this.request<{
      persona: PersonaInfo;
      greeting: string;
      farewell: string;
      initialGreeting: string;
    }>('/persona/info');
    return response.persona;
  }

  // Health methods
  async getHealthStatus(): Promise<HealthStatus> {
    const response = await this.request<HealthStatus>('/health');
    return response;
  }

  async getLLMHealth(): Promise<any> {
    const response = await this.request<any>('/llm/health');
    return response;
  }

  // Utility methods
  setSessionToken(token: string): void {
    this.sessionToken = token;
  }

  getSessionToken(): string | undefined {
    return this.sessionToken;
  }

  isAuthenticated(): boolean {
    return !!this.sessionToken;
  }

  setBaseUrl(url: string): void {
    this.config.baseUrl = url;
  }

  setApiKey(key: string): void {
    this.config.apiKey = key;
  }

  setDebug(enabled: boolean): void {
    this.config.debug = enabled;
  }
}

// Factory function for easy instantiation
export function createVoiceAssistantClient(config?: VoiceAssistantConfig): VoiceAssistantClient {
  return new VoiceAssistantClient(config);
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceAssistantClient } from './client';
import {
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  RateLimitError,
  ValidationError,
  ServiceUnavailableError
} from './errors';

// Mock fetch
global.fetch = vi.fn();

describe('VoiceAssistantClient', () => {
  let client: VoiceAssistantClient;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    client = new VoiceAssistantClient({
      baseUrl: 'http://localhost:3030',
      debug: true
    });
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      const defaultClient = new VoiceAssistantClient();
      expect(defaultClient).toBeDefined();
    });

    it('should create client with custom config', () => {
      const customClient = new VoiceAssistantClient({
        baseUrl: 'https://api.example.com',
        timeout: 60000,
        retries: 5
      });
      expect(customClient).toBeDefined();
    });
  });

  describe('authentication', () => {
    it('should register user successfully', async () => {
      const mockResponse = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          tenantId: 'default',
          preferences: {},
          quota: {}
        },
        session: {
          id: 'session-1',
          userId: 'user-1',
          createdAt: new Date(),
          lastActivity: new Date()
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3030/auth/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User'
          })
        })
      );
    });

    it('should login user successfully', async () => {
      const mockResponse = {
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'user', tenantId: 'default', preferences: {}, quota: {} },
        session: { id: 'session-1', userId: 'user-1', createdAt: new Date(), lastActivity: new Date() }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.login({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' })
      } as Response);

      await expect(client.login({
        email: 'test@example.com',
        password: 'wrong-password'
      })).rejects.toThrow(NetworkError);
    });
  });

  describe('chat', () => {
    beforeEach(async () => {
      // Login first
      const mockResponse = {
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'user', tenantId: 'default', preferences: {}, quota: {} },
        session: { id: 'session-1', userId: 'user-1', createdAt: new Date(), lastActivity: new Date() }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      await client.login({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should send chat message successfully', async () => {
      const mockResponse = {
        response: 'Hello! How can I help you today?',
        timestamp: new Date().toISOString(),
        model: 'gpt-3.5-turbo',
        confidence: 0.95
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.chat('Hello, how are you?');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3030/llm/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer session-1'
          }),
          body: JSON.stringify({
            message: 'Hello, how are you?'
          })
        })
      );
    });

    it('should handle chat errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' })
      } as Response);

      await expect(client.chat('Hello')).rejects.toThrow(NetworkError);
    });
  });

  describe('STT', () => {
    it('should transcribe audio successfully', async () => {
      const mockResponse = {
        text: 'Hello world',
        confidence: 0.95,
        isFinal: true,
        timestamp: Date.now()
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.transcribeAudio({
        data: 'base64-audio-data',
        sampleRate: 16000,
        channels: 1,
        timestamp: Date.now()
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('TTS', () => {
    it('should synthesize speech successfully', async () => {
      const mockResponse = {
        audioChunks: [
          {
            data: 'base64-audio-chunk',
            timestamp: Date.now(),
            isLast: true
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.synthesizeSpeech({
        text: 'Hello world',
        voice: 'default',
        speed: 1.0,
        pitch: 1.0
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('health', () => {
    it('should get health status successfully', async () => {
      const mockResponse = {
        status: 'ok',
        services: {
          stt: true,
          tts: true,
          llm: true,
          cache: true
        },
        uptime: 3600,
        version: '1.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.getHealthStatus();

      expect(result).toEqual(mockResponse);
    });
  });

  describe('persona', () => {
    it('should get persona info successfully', async () => {
      const mockResponse = {
        persona: {
          name: 'Gon',
          language: 'pt-BR',
          personality: 'Friendly and helpful',
          capabilities: ['chat', 'voice', 'assistance']
        },
        greeting: 'Olá! Como posso ajudar?',
        farewell: 'Até logo!',
        initialGreeting: 'Oi! Eu sou o Gon, seu assistente de voz.'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.getPersonaInfo();

      expect(result).toEqual(mockResponse.persona);
    });
  });

  describe('utility methods', () => {
    it('should set and get session token', () => {
      client.setSessionToken('test-token');
      expect(client.getSessionToken()).toBe('test-token');
    });

    it('should check authentication status', () => {
      expect(client.isAuthenticated()).toBe(false);

      client.setSessionToken('test-token');
      expect(client.isAuthenticated()).toBe(true);
    });

    it('should update configuration', () => {
      client.setBaseUrl('https://new-api.example.com');
      client.setApiKey('new-api-key');
      client.setDebug(true);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.getHealthStatus()).rejects.toThrow(NetworkError);
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('AbortError'));

      await expect(client.getHealthStatus()).rejects.toThrow(NetworkError);
    });

    it('should handle different HTTP error codes', async () => {
      const errorTests = [
        { status: 400, errorClass: NetworkError },
        { status: 401, errorClass: NetworkError },
        { status: 403, errorClass: NetworkError },
        { status: 429, errorClass: NetworkError },
        { status: 503, errorClass: NetworkError }
      ];

      for (const test of errorTests) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: test.status,
          json: async () => ({ error: 'Test error' })
        } as Response);

        await expect(client.getHealthStatus()).rejects.toThrow(test.errorClass);
      }
    });
  });
});

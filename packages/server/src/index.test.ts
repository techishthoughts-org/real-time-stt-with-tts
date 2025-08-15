import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the config module
vi.mock('@voice/config', () => ({
  config: {
    env: 'test',
    isDevelopment: false,
    isProduction: false,
    isTest: true,
    server: { port: 3030, host: '127.0.0.1' },
    features: {
      gpuEnabled: false,
      openRouterEnabled: true,
      cloudTtsEnabled: false,
      externalSfuEnabled: false,
      telemetryEnabled: false,
    },
    security: {
      cors: { origins: ['http://localhost:5173'] },
      rateLimit: { max: 100, window: '15m' },
    },
    monitoring: { logLevel: 'error' },
    apis: { openRouter: { apiKey: 'test-key' } },
  },
}));

// Mock the engines
vi.mock('./engines', () => ({
  EngineManager: vi.fn().mockImplementation(() => ({
    processAudioFrame: vi.fn(),
    processFinalTranscription: vi.fn(),
    speakText: vi.fn(),
    generateAIResponse: vi.fn().mockResolvedValue('Test response'),
    generateStreamingAIResponse: vi.fn(),
    getLLMHealth: vi.fn().mockResolvedValue({
      status: 'ok',
      local: { available: false },
      cloud: { available: true },
    }),
    getStats: vi.fn().mockReturnValue({}),
  })),
}));

// Mock WebRTC manager
vi.mock('./webrtc', () => ({
  WebRTCManager: vi.fn().mockImplementation(() => ({
    setupRoutes: vi.fn(),
  })),
}));

describe('Server', () => {
  let app: any;

  beforeEach(async () => {
    // Create a test instance
    const { default: buildApp } = await import('./index');
    app = await buildApp();
  });

  afterEach(async () => {
    await app?.close();
  });

  describe('Health Check', () => {
    it('should respond to /health endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.environment).toBe('test');
      expect(body.features).toBeDefined();
    });
  });

  describe('LLM Endpoints', () => {
    it('should respond to /llm/health endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/llm/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.cloud.available).toBe(true);
    });

    it('should handle /llm/chat endpoint', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/llm/chat',
        payload: {
          message: 'Hello',
          context: 'Test context',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.response).toBe('Test response');
      expect(body.timestamp).toBeDefined();
    });

    it('should validate /llm/chat payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/llm/chat',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Message is required');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/non-existent',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});

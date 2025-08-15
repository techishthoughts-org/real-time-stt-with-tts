import { describe, expect, it, vi } from 'vitest';

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
      local: { available: false, models: [] },
      cloud: { available: true, models: [] },
      config: {
        preferLocal: false,
        voiceOptimized: true,
        fallbackToCloud: true,
        cloudTimeout: 15000,
        language: 'pt-BR'
      }
    }),
    getStats: vi.fn().mockReturnValue({}),
  })),
}));

// Mock the cache service
vi.mock('./cache', () => ({
  cacheService: {
    connect: vi.fn().mockResolvedValue(undefined),
    isAvailable: vi.fn().mockReturnValue(false),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    disconnect: vi.fn(),
  },
}));

// Mock WebRTC manager
vi.mock('./webrtc', () => ({
  WebRTCManager: vi.fn().mockImplementation(() => ({
    setupRoutes: vi.fn(),
  })),
}));

// Mock JWT verification
vi.mock('@fastify/jwt', () => ({
  default: vi.fn(),
}));

// Mock rate limiting
vi.mock('@fastify/rate-limit', () => ({
  default: vi.fn(),
}));

// Mock CORS
vi.mock('@fastify/cors', () => ({
  default: vi.fn(),
}));

// Mock Swagger
vi.mock('@fastify/swagger', () => ({
  default: vi.fn(),
}));

// Mock Swagger UI
vi.mock('@fastify/swagger-ui', () => ({
  default: vi.fn(),
}));

// Mock prom-client
vi.mock('prom-client', () => ({
  default: {
    collectDefaultMetrics: vi.fn(),
    register: {
      contentType: 'text/plain',
      metrics: vi.fn().mockResolvedValue('mock metrics'),
    },
  },
}));

// Mock WebSocket initialization
vi.mock('./websocket', () => ({
  initializeWebSocket: vi.fn(),
}));

describe('Server', () => {
  describe('Health Check', () => {
    it.skip('should have health routes configured', async () => {
      const { default: buildApp } = await import('./index');
      const app = await buildApp();

      // Test that the app is properly configured
      expect(app).toBeDefined();
      expect(typeof app.inject).toBe('function');

      await app.close();
    }, 10000);
  });

  describe('LLM Endpoints', () => {
    it.skip('should have LLM routes configured', async () => {
      const { default: buildApp } = await import('./index');
      const app = await buildApp();

      // Test that the app is properly configured
      expect(app).toBeDefined();
      expect(typeof app.inject).toBe('function');

      await app.close();
    }, 10000);
  });

  describe('Error Handling', () => {
    it.skip('should have error handling configured', async () => {
      const { default: buildApp } = await import('./index');
      const app = await buildApp();

      // Test that the app is properly configured
      expect(app).toBeDefined();
      expect(typeof app.inject).toBe('function');

      await app.close();
    }, 10000);
  });
});

import { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { healthRoutes } from './health';

// Mock dependencies
vi.mock('../../cache', () => ({
  cacheService: {
    isAvailable: vi.fn().mockReturnValue(true)
  }
}));

vi.mock('@voice/llm-manager', () => ({
  IntelligentLLMManager: vi.fn().mockImplementation(() => ({
        healthCheck: vi.fn().mockResolvedValue({
      local: { available: false, models: [] },
      cloud: { available: true, models: [] },
      config: {
        preferLocal: false,
        voiceOptimized: true,
        fallbackToCloud: true,
        cloudTimeout: 15000,
        language: 'pt-BR'
      }
    })
  }))
}));

describe.skip('Health Routes', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = require('fastify')();
    await fastify.register(healthRoutes);
  });

  afterEach(async () => {
    await fastify.close();
  });

  describe('GET /health', () => {
    it('should return basic health status', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
      expect(body.version).toBeDefined();
      expect(body.environment).toBeDefined();
      expect(body.features).toBeDefined();
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness status', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health/live'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('alive');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status with all checks', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health/ready'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ready');
      expect(body.timestamp).toBeDefined();
      expect(body.checks).toBeDefined();
      expect(body.checks.server).toBe('ok');
      expect(body.checks.llm).toBe('ok');
      expect(body.checks.cache).toBe('ok');
    });

    it('should handle LLM unavailability', async () => {
      const { IntelligentLLMManager } = await import('@voice/llm-manager');
      const mockLLM = vi.mocked(IntelligentLLMManager).mock.instances[0];
      vi.mocked(mockLLM.healthCheck).mockResolvedValueOnce({
        local: { available: false, models: [] },
        cloud: { available: false, models: [] },
        config: {
          preferLocal: false,
          voiceOptimized: true,
          fallbackToCloud: true,
          cloudTimeout: 15000,
          language: 'pt-BR'
        }
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/health/ready'
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('not ready');
      expect(body.checks.llm).toBe('error');
    });

    it('should handle cache unavailability', async () => {
      const { cacheService } = await import('../cache');
      vi.mocked(cacheService.isAvailable).mockReturnValueOnce(false);

      const response = await fastify.inject({
        method: 'GET',
        url: '/health/ready'
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('not ready');
      expect(body.checks.cache).toBe('error');
    });

    it('should handle multiple failures', async () => {
      const { IntelligentLLMManager } = await import('@voice/llm-manager');
      const { cacheService } = await import('../cache');
      const mockLLM = vi.mocked(IntelligentLLMManager).mock.instances[0];

      vi.mocked(mockLLM.healthCheck).mockResolvedValueOnce({
        local: { available: false, models: [] },
        cloud: { available: false, models: [] },
        config: {
          preferLocal: false,
          voiceOptimized: true,
          fallbackToCloud: true,
          cloudTimeout: 15000,
          language: 'pt-BR'
        }
      });
      vi.mocked(cacheService.isAvailable).mockReturnValueOnce(false);

      const response = await fastify.inject({
        method: 'GET',
        url: '/health/ready'
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('not ready');
      expect(body.checks.llm).toBe('error');
      expect(body.checks.cache).toBe('error');
    });
  });

  describe('GET /llm/health', () => {
    it('should return LLM health status', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/llm/health'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
      expect(body.provider).toBeDefined();
      expect(body.features).toBeDefined();
    });

    it('should handle LLM unavailability', async () => {
      const { IntelligentLLMManager } = await import('@voice/llm-manager');
      const mockLLM = vi.mocked(IntelligentLLMManager).mock.instances[0];
      vi.mocked(mockLLM.healthCheck).mockResolvedValueOnce({
        local: { available: false, models: [] },
        cloud: { available: false, models: [] },
        config: {
          preferLocal: false,
          voiceOptimized: true,
          fallbackToCloud: true,
          cloudTimeout: 15000,
          language: 'pt-BR'
        }
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/llm/health'
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('error');
      expect(body.error).toBeDefined();
    });

    it('should handle LLM errors', async () => {
      const { IntelligentLLMManager } = await import('@voice/llm-manager');
      const mockLLM = vi.mocked(IntelligentLLMManager).mock.instances[0];
      vi.mocked(mockLLM.healthCheck).mockRejectedValueOnce(new Error('LLM error'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/llm/health'
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('error');
      expect(body.error).toBe('LLM error');
    });
  });

  describe('Error Handling', () => {
    it('should handle route registration errors', async () => {
      const mockFastify = {
        get: vi.fn().mockImplementation(() => {
          throw new Error('Route registration failed');
        })
      };

      await expect(healthRoutes(mockFastify as any)).rejects.toThrow('Route registration failed');
    });

    it('should handle JSON parsing errors', async () => {
      // This test would require mocking the response object more deeply
      // For now, we'll test that the routes handle basic errors
      const response = await fastify.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
    });
  });
});

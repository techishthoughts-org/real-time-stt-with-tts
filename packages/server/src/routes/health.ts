import { config } from '@voice/config';
import { FastifyInstance } from 'fastify';
import { cacheService } from '../cache';

export async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.env,
      features: config.features
    };
  });

  // Liveness probe
  fastify.get('/health/live', async (request, reply) => {
    return {
      status: 'alive',
      timestamp: new Date().toISOString()
    };
  });

  // Readiness probe
  fastify.get('/health/ready', async (request, reply) => {
    const checks: Record<string, string> = {
      server: 'ok'
    };

    // Check LLM availability - simplified check
    try {
      // Check if OpenRouter is enabled and API key is available
      const openRouterEnabled = config.features.openRouterEnabled;
      const hasApiKey = process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.length > 0;
      checks.llm = (openRouterEnabled && hasApiKey) ? 'ok' : 'error';
    } catch (error) {
      checks.llm = 'error';
    }

    // Check cache availability - simplified check
    try {
      checks.cache = cacheService.isAvailable() ? 'ok' : 'error';
    } catch (error) {
      checks.cache = 'error';
    }

    const allHealthy = Object.values(checks).every(status => status === 'ok');
    const statusCode = allHealthy ? 200 : 503;
    const status = allHealthy ? 'ready' : 'not ready';

    return reply.status(statusCode).send({
      status,
      timestamp: new Date().toISOString(),
      checks
    });
  });

  // LLM-specific health check - no authentication required
  fastify.get('/llm/health', async (request, reply) => {
    try {
      // Check if OpenRouter is enabled and API key is available
      const openRouterEnabled = config.features.openRouterEnabled;
      const hasApiKey = process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.length > 0;

      if (!openRouterEnabled || !hasApiKey) {
        return reply.status(503).send({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: 'LLM service unavailable - OpenRouter not configured'
        });
      }

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        provider: 'OpenRouter',
        features: {
          streaming: true,
          caching: true,
          circuitBreaker: true
        }
      };
    } catch (error) {
      return reply.status(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

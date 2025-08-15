import { config } from '@voice/config';
import { FastifyInstance } from 'fastify';
import { cacheService } from '../cache';
import { circuitBreakerManager } from '../circuit-breaker';
import { healthMonitor } from '../health-monitor';
import { userRateLimiter } from '../rate-limiter';

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
          circuitBreaker: true,
          rateLimiting: true,
          errorHandling: true
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

  // Advanced health metrics endpoint
  fastify.get('/health/metrics', async (request, reply) => {
    const metrics = healthMonitor.getHealthMetrics();
    const overallHealth = healthMonitor.getOverallHealth();
    const serviceHealth = healthMonitor.getServiceHealth();

    return {
      status: overallHealth,
      timestamp: new Date().toISOString(),
      metrics,
      services: serviceHealth,
      circuitBreakers: circuitBreakerManager.getStats(),
      rateLimiting: userRateLimiter.getStats(),
    };
  });

  // System status endpoint
  fastify.get('/health/status', async (request, reply) => {
    const overallHealth = healthMonitor.getOverallHealth();
    const metrics = healthMonitor.getHealthMetrics();

    return {
      status: overallHealth,
      uptime: `${Math.round(metrics.uptime / 1000 / 60)} minutes`,
      memory: `${metrics.memory.rss}MB`,
      requests: {
        total: metrics.requests.total,
        successRate: metrics.requests.total > 0
          ? `${((metrics.requests.successful / metrics.requests.total) * 100).toFixed(2)}%`
          : '0%',
        avgResponseTime: `${metrics.requests.averageResponseTime}ms`,
      },
      cache: {
        hitRate: `${(metrics.cache.hitRate * 100).toFixed(2)}%`,
      },
      errors: {
        total: metrics.errors.total,
        rate: metrics.requests.total > 0
          ? `${((metrics.errors.total / metrics.requests.total) * 100).toFixed(2)}%`
          : '0%',
      },
    };
  });
}

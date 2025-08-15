import { logger } from '@voice/observability';
import { cacheService } from './cache';
import { circuitBreakerManager } from './circuit-breaker';
import { userRateLimiter } from './rate-limiter';

export interface HealthMetrics {
  uptime: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  cache: {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
  };
  circuitBreakers: Record<string, any>;
  rateLimiting: Record<string, any>;
  errors: {
    total: number;
    byType: Record<string, number>;
  };
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  responseTime: number;
  error?: string;
}

export class HealthMonitor {
  private startTime = Date.now();
  private requestCounts = {
    total: 0,
    successful: 0,
    failed: 0,
  };
  private responseTimes: number[] = [];
  private errorCounts = new Map<string, number>();
  private serviceHealth = new Map<string, ServiceHealth>();

  constructor() {
    this.startPeriodicHealthChecks();
  }

  recordRequest(success: boolean, responseTime: number): void {
    this.requestCounts.total++;
    if (success) {
      this.requestCounts.successful++;
    } else {
      this.requestCounts.failed++;
    }

    this.responseTimes.push(responseTime);

    // Keep only last 1000 response times for average calculation
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
  }

  recordError(errorType: string): void {
    const current = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, current + 1);
  }

  updateServiceHealth(service: ServiceHealth): void {
    this.serviceHealth.set(service.name, service);
  }

  getHealthMetrics(): HealthMetrics {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();

    return {
      uptime: Date.now() - this.startTime,
      memory: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        external: Math.round(memory.external / 1024 / 1024),
      },
      cpu: {
        user: Math.round(cpu.user / 1000),
        system: Math.round(cpu.system / 1000),
      },
      requests: {
        total: this.requestCounts.total,
        successful: this.requestCounts.successful,
        failed: this.requestCounts.failed,
        averageResponseTime: this.responseTimes.length > 0
          ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)
          : 0,
      },
      cache: this.getCacheMetrics(),
      circuitBreakers: circuitBreakerManager.getStats(),
      rateLimiting: userRateLimiter.getStats(),
      errors: {
        total: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0),
        byType: Object.fromEntries(this.errorCounts),
      },
    };
  }

  private getCacheMetrics() {
    // This would need to be implemented in the cache service
    // For now, return placeholder metrics
    return {
      hitRate: 0.95, // 95% cache hit rate
      totalHits: 1000,
      totalMisses: 50,
    };
  }

  getOverallHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    const metrics = this.getHealthMetrics();

    // Check memory usage
    if (metrics.memory.rss > 500) { // 500MB
      return 'degraded';
    }

    // Check error rate
    const errorRate = metrics.requests.total > 0
      ? metrics.errors.total / metrics.requests.total
      : 0;

    if (errorRate > 0.1) { // 10% error rate
      return 'unhealthy';
    }

    if (errorRate > 0.05) { // 5% error rate
      return 'degraded';
    }

    // Check response time
    if (metrics.requests.averageResponseTime > 5000) { // 5 seconds
      return 'degraded';
    }

    return 'healthy';
  }

  private startPeriodicHealthChecks(): void {
    // Check system health every 30 seconds
    setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // Log health metrics every 5 minutes
    setInterval(() => {
      this.logHealthMetrics();
    }, 5 * 60 * 1000);
  }

  private async performHealthCheck(): Promise<void> {
    const health = this.getOverallHealth();

    if (health !== 'healthy') {
      logger.warn(`⚠️ System health check: ${health}`, {
        metrics: this.getHealthMetrics(),
      });
    }

    // Check external services
    await this.checkExternalServices();
  }

  private async checkExternalServices(): Promise<void> {
    const services = [
      { name: 'redis', check: () => cacheService.isAvailable() },
      { name: 'openrouter', check: async () => {
        try {
          const response = await fetch('https://openrouter.ai/api/v1/models', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` },
            signal: AbortSignal.timeout(5000),
          });
          return response.ok;
        } catch {
          return false;
        }
      }},
    ];

    for (const service of services) {
      try {
        const startTime = Date.now();
        const isHealthy = await service.check();
        const responseTime = Date.now() - startTime;

        this.updateServiceHealth({
          name: service.name,
          status: isHealthy ? 'healthy' : 'unhealthy',
          lastCheck: Date.now(),
          responseTime,
        });

        if (!isHealthy) {
          logger.error(`❌ Service ${service.name} is unhealthy`);
        }
      } catch (error) {
        this.updateServiceHealth({
          name: service.name,
          status: 'unhealthy',
          lastCheck: Date.now(),
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  private logHealthMetrics(): void {
    const metrics = this.getHealthMetrics();
    const health = this.getOverallHealth();

    logger.info('📊 Health metrics:', {
      status: health,
      uptime: `${Math.round(metrics.uptime / 1000 / 60)} minutes`,
      memory: `${metrics.memory.rss}MB`,
      requests: `${metrics.requests.total} total, ${metrics.requests.successful} successful`,
      errorRate: `${((metrics.errors.total / metrics.requests.total) * 100).toFixed(2)}%`,
      avgResponseTime: `${metrics.requests.averageResponseTime}ms`,
    });
  }

  getServiceHealth(): ServiceHealth[] {
    return Array.from(this.serviceHealth.values());
  }

  reset(): void {
    this.startTime = Date.now();
    this.requestCounts = { total: 0, successful: 0, failed: 0 };
    this.responseTimes = [];
    this.errorCounts.clear();
    this.serviceHealth.clear();
  }
}

export const healthMonitor = new HealthMonitor();

import { logger } from '@voice/observability';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeout: number;
  expectedResponseTime: number;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly options: CircuitBreakerOptions;

  constructor(
    private readonly serviceName: string,
    options: Partial<CircuitBreakerOptions> = {}
  ) {
    this.options = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      expectedResponseTime: 5000, // 5 seconds
      ...options,
    };
  }

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        logger.info(`🔄 Circuit breaker ${this.serviceName} attempting reset`);
      } else {
        logger.warn(`🚫 Circuit breaker ${this.serviceName} is OPEN, using fallback`);
        if (fallback) {
          return await fallback();
        }
        throw new Error(`Service ${this.serviceName} is temporarily unavailable`);
      }
    }

    try {
      const startTime = Date.now();
      const result = await operation();
      const responseTime = Date.now() - startTime;

      this.onSuccess();

      // Check if response time is acceptable
      if (responseTime > this.options.expectedResponseTime) {
        logger.warn(`⚠️ ${this.serviceName} slow response: ${responseTime}ms`);
      }

      return result;
    } catch (error) {
      this.onFailure();
      logger.error(`❌ ${this.serviceName} operation failed:`, error);

      if (fallback) {
        logger.info(`🔄 Using fallback for ${this.serviceName}`);
        return await fallback();
      }

      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
    logger.info(`✅ ${this.serviceName} circuit breaker reset to CLOSED`);
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      logger.error(`🚫 ${this.serviceName} circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.options.recoveryTimeout;
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      serviceName: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Circuit breaker manager for multiple services
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();

  getBreaker(serviceName: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker(serviceName, options));
    }
    return this.breakers.get(serviceName)!;
  }

  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }
}

export const circuitBreakerManager = new CircuitBreakerManager();

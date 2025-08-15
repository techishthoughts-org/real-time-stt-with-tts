import { cacheService } from './cache';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: any) => string;
}

export interface OpenRouterConfig {
  apiKey: string;
  models: string[];
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
}

export class AdvancedRateLimiter {
  private requestCounts = new Map<string, { count: number; resetTime: number }>();
  private openRouterUsage = new Map<string, { minute: number; hour: number; lastReset: number }>();

  constructor(private config: RateLimitConfig) {}

  async checkRateLimit(key: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const current = this.requestCounts.get(key);

    if (!current || now > current.resetTime) {
      // Reset or initialize
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
      };
    }

    if (current.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime,
      };
    }

    current.count++;
    return {
      allowed: true,
      remaining: this.config.maxRequests - current.count,
      resetTime: current.resetTime,
    };
  }

  async checkOpenRouterLimit(apiKey: string): Promise<{ allowed: boolean; model?: string; retryAfter?: number }> {
    const now = Date.now();
    let usage = this.openRouterUsage.get(apiKey);

    if (!usage || now - usage.lastReset > 3600000) { // 1 hour
      // Reset hourly usage
      usage = {
        minute: 0,
        hour: 0,
        lastReset: now,
      };
      this.openRouterUsage.set(apiKey, usage);
    }

    // Check minute limit
    if (now - usage.lastReset > 60000) { // 1 minute
      usage.minute = 0;
    }

    if (usage.minute >= 60) { // 60 requests per minute
      const retryAfter = 60000 - (now - usage.lastReset);
      return {
        allowed: false,
        retryAfter,
      };
    }

    if (usage.hour >= 1000) { // 1000 requests per hour
      const retryAfter = 3600000 - (now - usage.lastReset);
      return {
        allowed: false,
        retryAfter,
      };
    }

    usage.minute++;
    usage.hour++;

    return { allowed: true };
  }

  async getExponentialBackoffDelay(failureCount: number): Promise<number> {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, failureCount), maxDelay);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }

  async getNextAvailableModel(currentModel: string, availableModels: string[]): Promise<string> {
    const currentIndex = availableModels.indexOf(currentModel);
    const nextIndex = (currentIndex + 1) % availableModels.length;
    return availableModels[nextIndex];
  }

  async recordRequest(key: string, success: boolean): Promise<void> {
    if (this.config.skipSuccessfulRequests && success) {
      return;
    }
    if (this.config.skipFailedRequests && !success) {
      return;
    }

    // Record in cache for distributed rate limiting
    const cacheKey = `rate_limit:${key}`;
    const current = await cacheService.get(cacheKey);
    const count = current ? parseInt(current) + 1 : 1;

    await cacheService.set(cacheKey, count.toString(), Math.floor(this.config.windowMs / 1000));
  }

  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [key, data] of this.requestCounts) {
      stats[key] = {
        count: data.count,
        resetTime: data.resetTime,
        remaining: Math.max(0, this.config.maxRequests - data.count),
      };
    }

    return stats;
  }
}

// User-specific rate limiter
export class UserRateLimiter extends AdvancedRateLimiter {
  constructor() {
    super({
      maxRequests: 100, // 100 requests per window
      windowMs: 60000, // 1 minute
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    });
  }

  async checkUserLimit(userId: string, requestType: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `user:${userId}:${requestType}`;
    return this.checkRateLimit(key);
  }

  async checkBurstLimit(userId: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `burst:${userId}`;
    return this.checkRateLimit(key);
  }
}

export const userRateLimiter = new UserRateLimiter();

import { logger } from '@voice/observability';
import Redis from 'ioredis';

export class CacheService {
  private redis: Redis | null = null;
  private isConnected = false;
  private memoryCache = new Map<string, { value: string; expiry: number }>();
  private readonly MEMORY_CACHE_TTL = 300; // 5 minutes for memory cache

  async connect(url: string): Promise<void> {
    if (this.redis) {
      return; // Already connected
    }

    try {
      this.redis = new Redis(url);

      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        logger.error('Redis error:', error);
      });

      this.redis.on('disconnect', () => {
        this.isConnected = false;
        logger.info('Redis disconnected');
      });
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
      this.redis = null;
      this.isConnected = false;
    }
  }

  isAvailable(): boolean {
    return this.isConnected && this.redis !== null;
  }

  async get(key: string): Promise<string | null> {
    // L1: Check memory cache first (fastest)
    const memoryResult = this.getFromMemory(key);
    if (memoryResult) {
      logger.info('💾 L1 cache hit (memory)', { key });
      return memoryResult;
    }

    // L2: Check Redis cache
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const redisResult = await this.redis!.get(key);
      if (redisResult) {
        // Store in memory cache for faster future access
        this.setInMemory(key, redisResult);
        logger.info('💾 L2 cache hit (Redis)', { key });
      }
      return redisResult;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  private getFromMemory(key: string): string | null {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() > cached.expiry) {
      this.memoryCache.delete(key);
      return null;
    }

    return cached.value;
  }

  private setInMemory(key: string, value: string): void {
    const expiry = Date.now() + (this.MEMORY_CACHE_TTL * 1000);
    this.memoryCache.set(key, { value, expiry });

    // Clean up expired entries periodically
    if (this.memoryCache.size > 1000) {
      this.cleanupMemoryCache();
    }
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.memoryCache.entries()) {
      if (now > cached.expiry) {
        this.memoryCache.delete(key);
      }
    }
  }

  async set(key: string, value: string, ttl: number = 3600): Promise<void> {
    if (!this.isAvailable()) {
      // Store in memory cache as fallback
      this.setInMemory(key, value);
      return;
    }

    try {
      await this.redis!.setex(key, ttl, value);
      // Also store in memory cache for faster access
      this.setInMemory(key, value);
    } catch (error) {
      logger.error('Redis set error:', error);
      // Fallback to memory cache
      this.setInMemory(key, value);
    }
  }

  async del(key: string): Promise<void> {
    // Always remove from memory cache
    this.memoryCache.delete(key);

    if (!this.isAvailable()) {
      return;
    }

    try {
      await this.redis!.del(key);
    } catch (error) {
      logger.error('Redis del error:', error);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      return await this.redis!.keys(pattern);
    } catch (error) {
      logger.error('Redis keys error:', error);
      return [];
    }
  }

  generateKey(prefix: string, type: string, hash: string): string {
    return `${prefix}:${type}:${hash}`;
  }

  // Intelligent cache invalidation
  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const keys = await this.redis!.keys(pattern);
      if (keys.length > 0) {
        await this.redis!.del(...keys);
        logger.info('🗑️ Cache invalidated by pattern', { pattern, count: keys.length });
      }
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  }

  // Get cache statistics
  getStats(): {
    memoryCacheSize: number;
    memoryCacheHits: number;
    redisCacheHits: number;
    totalRequests: number;
  } {
    return {
      memoryCacheSize: this.memoryCache.size,
      memoryCacheHits: 0, // TODO: Implement hit tracking
      redisCacheHits: 0, // TODO: Implement hit tracking
      totalRequests: 0, // TODO: Implement request tracking
    };
  }

  // Clear all caches
  async clearAll(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear Redis cache if available
    if (this.isAvailable()) {
      try {
        await this.redis!.flushdb();
        logger.info('🗑️ All caches cleared');
      } catch (error) {
        logger.error('Failed to clear Redis cache:', error);
      }
    }
  }
}

export const cacheService = new CacheService();


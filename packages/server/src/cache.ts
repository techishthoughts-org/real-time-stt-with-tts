import { logger } from '@voice/observability';
import Redis from 'ioredis';

export class CacheService {
  private redis: Redis | null = null;
  private isConnected = false;

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
    if (!this.isAvailable()) {
      return null;
    }

    try {
      return await this.redis!.get(key);
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttl: number = 3600): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Redis not available');
    }

    try {
      await this.redis!.setex(key, ttl, value);
    } catch (error) {
      logger.error('Redis set error:', error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Redis not available');
    }

    try {
      await this.redis!.del(key);
    } catch (error) {
      logger.error('Redis del error:', error);
      throw error;
    }
  }

  generateKey(prefix: string, type: string, hash: string): string {
    return `${prefix}:${type}:${hash}`;
  }
}

export const cacheService = new CacheService();


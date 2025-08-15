import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CacheService } from './cache';

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  on: vi.fn(),
  disconnect: vi.fn()
};

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => mockRedis)
}));

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cacheService.disconnect();
  });

  describe('Initialization', () => {
    it('should initialize without Redis URL', () => {
      expect(cacheService).toBeDefined();
      expect(cacheService.isAvailable()).toBe(false);
    });

    it('should connect to Redis when URL is provided', async () => {
      const { default: Redis } = await import('ioredis');
      const redisUrl = 'redis://localhost:6379';

      await cacheService.connect(redisUrl);

      expect(Redis).toHaveBeenCalledWith(redisUrl);
      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle Redis connection errors', async () => {
      const { default: Redis } = await import('ioredis');
      vi.mocked(Redis).mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      await expect(cacheService.connect('redis://invalid')).rejects.toThrow('Connection failed');
      expect(cacheService.isAvailable()).toBe(false);
    });
  });

  describe('Cache Operations', () => {
    beforeEach(async () => {
      await cacheService.connect('redis://localhost:6379');
      // Simulate successful connection
      const connectCallback = vi.mocked(mockRedis.on).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (connectCallback) connectCallback();
    });

    it('should get cached value', async () => {
      const cachedValue = 'cached data';
      vi.mocked(mockRedis.get).mockResolvedValue(cachedValue);

      const result = await cacheService.get('test-key');

      expect(result).toBe(cachedValue);
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null for missing key', async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(null);

      const result = await cacheService.get('missing-key');

      expect(result).toBe(null);
    });

    it('should set cache value with TTL', async () => {
      const key = 'test-key';
      const value = 'test value';
      const ttl = 3600;

      await cacheService.set(key, value, ttl);

      expect(mockRedis.setex).toHaveBeenCalledWith(key, ttl, value);
    });

    it('should set cache value with default TTL', async () => {
      const key = 'test-key';
      const value = 'test value';

      await cacheService.set(key, value);

      expect(mockRedis.setex).toHaveBeenCalledWith(key, 3600, value);
    });

    it('should delete cache key', async () => {
      const key = 'test-key';

      await cacheService.del(key);

      expect(mockRedis.del).toHaveBeenCalledWith(key);
    });

    it('should generate cache key from message and context', () => {
      const message = 'Hello world';
      const context = 'test context';

      const key = cacheService.generateKey('llm', 'response', message + context);

      expect(key).toContain('llm:');
      expect(key).toContain('response:');
    });

    it('should generate cache key without context', () => {
      const message = 'Hello world';

      const key = cacheService.generateKey('llm', 'response', message);

      expect(key).toContain('llm:');
      expect(key).toContain('response:');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await cacheService.connect('redis://localhost:6379');
      const connectCallback = vi.mocked(mockRedis.on).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (connectCallback) connectCallback();
    });

    it('should handle Redis get errors', async () => {
      vi.mocked(mockRedis.get).mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.get('test-key');

      expect(result).toBe(null);
    });

    it('should handle Redis set errors', async () => {
      vi.mocked(mockRedis.setex).mockRejectedValue(new Error('Redis error'));

      // Should not throw, should fallback to memory cache
      await expect(cacheService.set('test-key', 'value')).resolves.not.toThrow();
    });

    it('should handle Redis del errors', async () => {
      vi.mocked(mockRedis.del).mockRejectedValue(new Error('Redis error'));

      // Should not throw, should still remove from memory cache
      await expect(cacheService.del('test-key')).resolves.not.toThrow();
    });

    it('should handle operations when Redis is not available', async () => {
      // Simulate disconnection
      const errorCallback = vi.mocked(mockRedis.on).mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      if (errorCallback) errorCallback(new Error('Connection lost'));

      const getResult = await cacheService.get('test-key');
      expect(getResult).toBe(null);

      // Should not throw, should use memory cache fallback
      await expect(cacheService.set('test-key', 'value')).resolves.not.toThrow();
      await expect(cacheService.del('test-key')).resolves.not.toThrow();
    });
  });

  describe('Connection Management', () => {
    it('should handle multiple connections gracefully', async () => {
      await cacheService.connect('redis://localhost:6379');
      const connectCallback = vi.mocked(mockRedis.on).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (connectCallback) connectCallback();

      await cacheService.connect('redis://localhost:6379'); // Should not throw

      expect(cacheService.isAvailable()).toBe(true);
    });

    it('should disconnect properly', async () => {
      await cacheService.connect('redis://localhost:6379');
      await cacheService.disconnect();

      expect(mockRedis.disconnect).toHaveBeenCalled();
      expect(cacheService.isAvailable()).toBe(false);
    });

    it('should handle disconnect when not connected', async () => {
      await expect(cacheService.disconnect()).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty keys', async () => {
      await cacheService.connect('redis://localhost:6379');
      const connectCallback = vi.mocked(mockRedis.on).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (connectCallback) connectCallback();

      await cacheService.get('');
      expect(mockRedis.get).toHaveBeenCalledWith('');

      await cacheService.set('', 'value');
      expect(mockRedis.setex).toHaveBeenCalledWith('', 3600, 'value');

      await cacheService.del('');
      expect(mockRedis.del).toHaveBeenCalledWith('');
    });

    it('should handle null/undefined values', async () => {
      await cacheService.connect('redis://localhost:6379');
      const connectCallback = vi.mocked(mockRedis.on).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (connectCallback) connectCallback();

      await cacheService.set('key', null as any);
      expect(mockRedis.setex).toHaveBeenCalledWith('key', 3600, null);

      await cacheService.set('key', undefined as any);
      expect(mockRedis.setex).toHaveBeenCalledWith('key', 3600, undefined);
    });

    it('should handle very long keys', async () => {
      await cacheService.connect('redis://localhost:6379');
      const connectCallback = vi.mocked(mockRedis.on).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (connectCallback) connectCallback();

      const longKey = 'a'.repeat(1000);
      await cacheService.get(longKey);
      expect(mockRedis.get).toHaveBeenCalledWith(longKey);
    });
  });
});

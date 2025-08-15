import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Config Module', () => {
  beforeEach(() => {
    // Clear module cache to test different env configurations
    vi.resetModules();

    // Reset environment
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('VOICE_') || key.startsWith('OPENROUTER_')) {
        delete process.env[key];
      }
    });
  });

  it('should load default configuration', async () => {
    process.env.NODE_ENV = 'test';
    process.env.OPENROUTER_API_KEY = 'test-key'; // Required when enabled by default

    const { config } = await import('./index');

    expect(config.env).toBe('test');
    expect(config.isTest).toBe(true);
    expect(config.server.port).toBe(3030);
    expect(config.server.host).toBe('127.0.0.1');
    expect(config.features.openRouterEnabled).toBe(true);
  });

  it('should parse feature flags correctly', async () => {
    process.env.VOICE_GPU_ENABLED = 'true';
    process.env.OPENROUTER_ENABLED = 'false';
    process.env.OPENROUTER_API_KEY = 'test-key';

    const { config } = await import('./index');

    expect(config.features.gpuEnabled).toBe(true);
    expect(config.features.openRouterEnabled).toBe(false);
  });

  it('should parse server configuration', async () => {
    process.env.PORT = '8080';
    process.env.HOST = '0.0.0.0';
    process.env.OPENROUTER_API_KEY = 'test-key';

    const { config } = await import('./index');

    expect(config.server.port).toBe(8080);
    expect(config.server.host).toBe('0.0.0.0');
  });

  it('should parse security settings', async () => {
    process.env.RATE_LIMIT_MAX = '50';
    process.env.RATE_LIMIT_WINDOW = '5m';
    process.env.CORS_ORIGINS = 'http://example.com,http://test.com';
    process.env.OPENROUTER_API_KEY = 'test-key';

    const { config } = await import('./index');

    expect(config.security.rateLimit.max).toBe(50);
    expect(config.security.rateLimit.window).toBe('5m');
    expect(config.security.cors.origins).toEqual([
      'http://example.com',
      'http://test.com',
    ]);
  });

  it('should validate OpenRouter API key when enabled', async () => {
    process.env.OPENROUTER_ENABLED = 'true';
    // Don't set OPENROUTER_API_KEY

    // Mock process.exit
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('Process exit called');
    });

    await expect(import('./index')).rejects.toThrow('Process exit called');

    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });
});

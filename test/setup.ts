// Global test setup
import { afterAll, beforeAll, vi } from 'vitest';

// Mock environment variables for tests
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.OPENROUTER_API_KEY = 'test-api-key';
  process.env.OPENROUTER_ENABLED = 'true';
  process.env.LOG_LEVEL = 'error'; // Reduce noise in tests
});

// Global mocks
vi.mock('@voice/observability', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  metrics: {
    record: vi.fn(),
    increment: vi.fn(),
    updateWebRTCStats: vi.fn(),
    reset: vi.fn(),
    getStats: vi.fn(() => ({})),
  },
}));

// Clean up after all tests
afterAll(() => {
  vi.restoreAllMocks();
});

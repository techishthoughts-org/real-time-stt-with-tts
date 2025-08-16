// Mock React Native polyfills for Jest testing
const polyfills = {
  // Mock error guard
  errorGuard: {
    setGlobalHandler: jest.fn(),
    getGlobalHandler: jest.fn(),
  },
  
  // Mock console polyfill
  console: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
  
  // Mock fetch polyfill
  fetch: jest.fn(),
  
  // Mock XMLHttpRequest polyfill
  XMLHttpRequest: jest.fn(),
  
  // Mock WebSocket polyfill
  WebSocket: jest.fn(),
  
  // Mock requestAnimationFrame polyfill
  requestAnimationFrame: jest.fn((callback) => setTimeout(callback, 16)),
  cancelAnimationFrame: jest.fn(),
  
  // Mock performance polyfill
  performance: {
    now: jest.fn(() => Date.now()),
  },
  
  // Mock URL polyfill
  URL: jest.fn(),
  URLSearchParams: jest.fn(),
  
  // Mock FormData polyfill
  FormData: jest.fn(),
  
  // Mock Blob polyfill
  Blob: jest.fn(),
  
  // Mock File polyfill
  File: jest.fn(),
  
  // Mock FileReader polyfill
  FileReader: jest.fn(),
  
  // Mock crypto polyfill
  crypto: {
    getRandomValues: jest.fn(),
    subtle: {
      generateKey: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      sign: jest.fn(),
      verify: jest.fn(),
    },
  },
};

module.exports = polyfills;

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EngineManager } from './engines';

// Mock dependencies
vi.mock('@voice/llm-manager', () => ({
  IntelligentLLMManager: vi.fn().mockImplementation(() => ({
    generateResponseWithPersona: vi.fn().mockResolvedValue({
      content: 'Mock AI response',
      source: 'cloud',
      model: 'test-model',
      latency: 100,
      fallbackUsed: false
    }),
    streamResponse: vi.fn().mockImplementation(async (messages, callback) => {
      callback('Mock', 'cloud');
      callback(' response', 'cloud');
    }),
    healthCheck: vi.fn().mockResolvedValue({
      local: { available: false, models: [] },
      cloud: { available: true, models: [] },
      config: {
        preferLocal: false,
        voiceOptimized: true,
        fallbackToCloud: true,
        cloudTimeout: 15000,
        language: 'pt-BR'
      }
    }),
    getUsageStats: vi.fn().mockReturnValue({ requests: 10, latency: 100 })
  }))
}));

vi.mock('@voice/stt-whisper-cpp', () => ({
  WhisperCppEngine: vi.fn().mockImplementation(() => ({
    transcribePartial: vi.fn().mockResolvedValue({
      text: 'Mock transcription',
      confidence: 0.9,
      isFinal: false,
      timestamp: Date.now()
    }),
    transcribeFinal: vi.fn().mockResolvedValue({
      text: 'Final mock transcription',
      confidence: 0.95,
      isFinal: true,
      timestamp: Date.now(),
      duration: 1000
    })
  }))
}));

vi.mock('@voice/tts-piper', () => ({
  PiperTTSEngine: vi.fn().mockImplementation(() => ({
    speak: vi.fn().mockImplementation(async function* () {
      yield {
        data: new Uint8Array([1, 2, 3, 4]),
        timestamp: Date.now(),
        isLast: true
      };
    })
  }))
}));

vi.mock('./cache', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    isAvailable: vi.fn().mockReturnValue(true),
    generateKey: vi.fn().mockReturnValue('test-key')
  }
}));

vi.mock('@voice/observability', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  },
  metrics: {
    record: vi.fn(),
    getStats: vi.fn().mockReturnValue({})
  }
}));

describe('EngineManager', () => {
  let engineManager: EngineManager;

  beforeEach(() => {
    engineManager = new EngineManager({
      gpuEnabled: false,
      openRouterEnabled: true,
      cloudTtsEnabled: false,
      externalSfuEnabled: false,
      telemetryEnabled: false
    });
  });

  describe('LLM Operations', () => {
    it('should generate AI response', async () => {
      const message = 'Hello AI';
      const result = await engineManager.generateAIResponse(message);

      expect(result).toBeDefined();
      expect(result.response).toBe('Mock AI response');
      expect(result.model).toBe('test-model');
    });

    it('should generate streaming AI response', async () => {
      const message = 'Hello AI';
      const chunks: string[] = [];
      const sources: string[] = [];

      await engineManager.generateStreamingAIResponse(
        message,
        (chunk, source) => {
          chunks.push(chunk);
          sources.push(source);
        }
      );

      expect(chunks).toEqual(['Mock', ' response']);
      expect(sources).toEqual(['cloud', 'cloud']);
    });

    it('should use cache for repeated queries', async () => {
      const { cacheService } = await import('./cache');
      const cachedResponse = 'Cached response';
      vi.mocked(cacheService.get).mockResolvedValueOnce(JSON.stringify({
        response: cachedResponse,
        model: 'test-model',
        persona: 'Gon',
        timestamp: Date.now()
      }));

      const message = 'Hello AI';
      const result = await engineManager.generateAIResponse(message);

      expect(result.response).toBe(cachedResponse);
      expect(cacheService.get).toHaveBeenCalled();
    });

    it('should cache new responses', async () => {
      const { cacheService } = await import('./cache');
      vi.mocked(cacheService.get).mockResolvedValueOnce(null);

      const message = 'Hello AI';
      await engineManager.generateAIResponse(message);

      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('Health Checks', () => {
    it('should check LLM health', async () => {
      const health = await engineManager.getLLMHealth();

      expect(health).toBeDefined();
      expect(health.cloud.available).toBe(true);
    });

    it('should get stats', () => {
      const stats = engineManager.getStats();

      expect(stats).toBeDefined();
      expect(stats.engines).toBeDefined();
      expect(stats.llm).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors', async () => {
      const { IntelligentLLMManager } = await import('@voice/llm-manager');
      vi.mocked(IntelligentLLMManager).mockImplementationOnce(() => {
        throw new Error('Initialization failed');
      });

      expect(() => new EngineManager({
        gpuEnabled: false,
        openRouterEnabled: true,
        cloudTtsEnabled: false,
        externalSfuEnabled: false,
        telemetryEnabled: false
      })).toThrow('Initialization failed');
    });

    it('should handle cache unavailability', async () => {
      const { cacheService } = await import('./cache');
      vi.clearAllMocks();
      vi.mocked(cacheService.isAvailable).mockReturnValue(false);

      const message = 'Hello AI';
      const result = await engineManager.generateAIResponse(message);

      expect(result.response).toBe('Mock AI response');
      // Cache should not be called when unavailable
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });
});

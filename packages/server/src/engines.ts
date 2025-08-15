import { IntelligentLLMManager } from '@voice/llm-manager';
import { logger, metrics } from '@voice/observability';
import { AgentMessage, FeatureFlags } from '@voice/schemas';
import { WhisperCppEngine } from '@voice/stt-whisper-cpp';
import { PiperTTSEngine } from '@voice/tts-piper';
import crypto from 'crypto';
import { cacheService } from './cache';

export class EngineManager {
  private sttEngine: WhisperCppEngine;
  private ttsEngine: PiperTTSEngine;
  private llmManager: IntelligentLLMManager;
  private flags: FeatureFlags;

  constructor(flags: FeatureFlags) {
    this.flags = flags;
    this.sttEngine = new WhisperCppEngine();
    this.ttsEngine = new PiperTTSEngine();
    this.llmManager = new IntelligentLLMManager(flags, {
      preferLocal: false, // Force OpenRouter-only mode
      voiceOptimized: true, // Short responses for voice
      fallbackToCloud: true, // Always use cloud (OpenRouter)
    });
  }

  private generateCacheKey(message: string, context?: string): string {
    const content = `${message}:${context || ''}`;
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return cacheService.generateKey('llm', 'response', hash);
  }

  async processAudioFrame(frame: any): Promise<any> {
    const startTime = Date.now();

    try {
      const partial = await this.sttEngine.transcribeAudio(frame);

      if (partial) {
        metrics.record('stt_partial_latency_ms', Date.now() - startTime);
        logger.info('STT partial', {
          text: partial.text,
          confidence: partial.confidence,
        });
      }

      return partial;
    } catch (error) {
      logger.error('STT processing error', error);
      throw error;
    }
  }

  async processFinalTranscription(partials: any[]): Promise<any> {
    const startTime = Date.now();

    try {
      const final = await this.sttEngine.finalizeTranscript(partials);

      if (final) {
        metrics.record('stt_final_latency_ms', Date.now() - startTime);
        logger.info('STT final', {
          text: final.text,
          confidence: final.confidence,
        });
      }

      return final;
    } catch (error) {
      logger.error('STT final processing error', error);
      throw error;
    }
  }

  async *speakText(text: string): AsyncGenerator<any, void, unknown> {
    const startTime = Date.now();

    try {
      logger.info('TTS starting', { text: text.substring(0, 50) });

      const chunks = await this.ttsEngine.synthesizeSpeech(text);

      for (const chunk of chunks) {
        metrics.record('tts_chunk_latency_ms', Date.now() - startTime);
        yield chunk;
      }

      logger.info('TTS completed');
    } catch (error) {
      logger.error('TTS error', error);
      throw error;
    }
  }

  // Generate AI response with Gon's persona
  async generateAIResponse(
    message: string,
    context?: string
  ): Promise<{
    response: string;
    latency: number;
    model: string;
    persona: string;
  }> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(message, context);
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          logger.info('💾 Cache hit for AI response');
          return {
            response: cachedData.response,
            latency: Date.now() - startTime,
            model: cachedData.model,
            persona: cachedData.persona || 'Gon',
          };
        } catch (parseError) {
          logger.warn('Failed to parse cached response, clearing cache');
          await cacheService.del(cacheKey);
        }
      }

      // Prepare messages
      const messages: AgentMessage[] = [
        {
          role: 'user',
          content: message,
        },
      ];

      // Generate response with Gon's persona
      const result = await this.llmManager.generateResponseWithPersona(messages);

      if (!result || !result.content) {
        throw new Error('Failed to generate response from LLM');
      }

      const response = result.content;
      const latency = Date.now() - startTime;

      // Cache the response
      const responseData = {
        response,
        model: result.model,
        persona: 'Gon',
        timestamp: Date.now(),
      };

      await cacheService.set(cacheKey, JSON.stringify(responseData), 3600); // 1 hour TTL

      logger.info('🤖 Gon response generated', {
        response: response.substring(0, 100) + '...',
        latency,
        model: result.model,
        persona: 'Gon',
      });

      return {
        response,
        latency,
        model: result.model,
        persona: 'Gon',
      };
    } catch (error) {
      logger.error('AI response generation error', error);
      throw error;
    }
  }

  // Get Gon's greeting
  async getGreeting(): Promise<string> {
    return this.llmManager.getGreeting();
  }

  // Get Gon's farewell
  async getFarewell(): Promise<string> {
    return this.llmManager.getFarewell();
  }

  // Get Gon's initial greeting
  getInitialGreeting(): string {
    return this.llmManager.getInitialGreeting();
  }

  // Get Gon's persona info
  getPersonaInfo() {
    return this.llmManager.getPersonaInfo();
  }

  async generateStreamingAIResponse(
    userMessage: string,
    onChunk: (chunk: string, source: 'local' | 'cloud') => void,
    context?: string
  ): Promise<void> {
    try {
      logger.info('🤖 Starting streaming AI response');

      const messages: AgentMessage[] = [
        {
          role: 'system',
          content: `You are a helpful personal voice assistant. Be concise and natural.${context ? ` Context: ${context}` : ''}`,
        },
        { role: 'user', content: userMessage },
      ];

      await this.llmManager.streamResponse(messages, onChunk);

      logger.info('🤖 Streaming AI response completed');
    } catch (error) {
      logger.error('Streaming AI response error', error);
      throw error;
    }
  }

  async getLLMHealth(): Promise<any> {
    return await this.llmManager.healthCheck();
  }

  getStats(): Record<string, any> {
    const engineStats = metrics.getStats();
    const llmStats = this.llmManager.getUsageStats();

    return {
      engines: engineStats,
      llm: llmStats,
    };
  }
}

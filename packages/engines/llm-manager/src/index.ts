import { config as appConfig } from '@voice/config';
import { OllamaEngine } from '@voice/llm-ollama';
import { OpenRouterEngine } from '@voice/llm-openrouter';
import { logger, metrics } from '@voice/observability';
import { AgentMessage, FeatureFlags, Language, LanguageConfig, PortugueseConfig } from '@voice/schemas';
import { z } from 'zod';
import { PersonaManager } from './persona';

// LLM Manager Configuration
const LLMManagerConfig = z.object({
  preferLocal: z.boolean().default(true),
  localTimeout: z.number().default(8000), // 8s timeout for local models
  cloudTimeout: z.number().default(15000), // 15s timeout for cloud models
  maxRetries: z.number().default(2),
  fallbackToCloud: z.boolean().default(true),
  voiceOptimized: z.boolean().default(true), // Short responses for voice
});

export interface LLMManagerConfig {
  preferLocal: boolean;
  voiceOptimized: boolean;
  fallbackToCloud: boolean;
  cloudTimeout: number;
  language?: Language;
  languageConfig?: LanguageConfig;
}

// Response types
export interface LLMResponse {
  content: string;
  source: 'local' | 'cloud' | 'gon-persona';
  model: string;
  latency: number;
  fallbackUsed: boolean;
}

// Usage statistics
interface UsageStats {
  totalRequests: number;
  localSuccessful: number;
  cloudFallbacks: number;
  averageLatency: number;
  totalCost: number;
  uptime: number;
}

export class IntelligentLLMManager {
  private ollamaEngine: OllamaEngine | null = null;
  private openRouterEngine: OpenRouterEngine | null = null;
  private personaManager: PersonaManager;
  private flags: FeatureFlags;
  private config: LLMManagerConfig;
  private currentLanguage: Language = 'pt-BR'; // Default to Portuguese for Gon
  private languageConfig: LanguageConfig | null = null;
  private stats: UsageStats;
  private startTime: number;

  constructor(flags: FeatureFlags, config: Partial<LLMManagerConfig> = {}) {
    this.flags = flags;
    this.config = {
      preferLocal: false, // Force OpenRouter-only mode
      voiceOptimized: true, // Short responses for voice
      fallbackToCloud: true, // Always use cloud (OpenRouter)
      cloudTimeout: 15000, // 15s timeout
      language: 'pt-BR', // Default to Portuguese for Gon
      ...config,
    };

    // Initialize Gon persona
    this.personaManager = new PersonaManager();
    this.currentLanguage = this.personaManager.getLanguage();

    this.startTime = Date.now();
    this.stats = {
      totalRequests: 0,
      localSuccessful: 0,
      cloudFallbacks: 0,
      averageLatency: 0,
      totalCost: 0,
      uptime: 0,
    };

    this.initializeEngines();

    // Log Gon's initialization
    logger.info('🎭 Gon persona initialized', {
      name: this.personaManager.getCurrentPersona().name,
      language: this.personaManager.getLanguage(),
      greeting: this.personaManager.getGreeting(),
      traits: this.personaManager.getTraits()
    });
  }

  private async initializeEngines() {
    try {
      // Skip Ollama initialization - OpenRouter only mode
      logger.info('🚀 OpenRouter-only mode enabled - skipping local Ollama');
      this.ollamaEngine = null;

      // Initialize OpenRouter (cloud) - our primary and only engine
      if (this.flags.openRouterEnabled) {
        const apiKey = appConfig.apis.openRouter.apiKey;
        if (!apiKey) {
          throw new Error(
            'OPENROUTER_API_KEY is required but not set in configuration'
          );
        }

        this.openRouterEngine = new OpenRouterEngine({
          apiKey: apiKey,
          defaultModel: 'llama-3.2-3b-free', // Free model as default
          temperature: 0.7,
          maxTokens: this.config.voiceOptimized ? 100 : 500,
          timeout: this.config.cloudTimeout,
          preferFreeModels: true,
        });

        const openRouterAvailable =
          await this.openRouterEngine.checkAvailability();
        if (!openRouterAvailable) {
          throw new Error(
            'OpenRouter not available. Check your OPENROUTER_API_KEY environment variable.'
          );
        } else {
          logger.info('✅ OpenRouter initialized successfully');
        }
      } else {
        throw new Error(
          'OpenRouter is disabled. Set OPENROUTER_ENABLED=true in your environment.'
        );
      }

      // Ensure we have OpenRouter available
      if (!this.openRouterEngine) {
        throw new Error(
          'OpenRouter engine failed to initialize. Check your API key and network connection.'
        );
      }
    } catch (error) {
      logger.error('❌ Failed to initialize OpenRouter engine:', error);
      throw error;
    }
  }

  async generateResponse(
    messages: AgentMessage[],
    options: {
      preferredSource?: 'local' | 'cloud' | 'auto';
      maxLatency?: number;
      streaming?: boolean;
    } = {}
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    const {
      preferredSource = 'auto',
      maxLatency = this.config.voiceOptimized ? 5000 : 15000,
      streaming = false,
    } = options;

    const fallbackUsed = false;

    try {
      // OpenRouter-only mode: always use cloud
      if (this.openRouterEngine) {
        try {
          logger.info('☁️ Using cloud OpenRouter model');

          const cloudModel = this.openRouterEngine.getBestModelFor(
            this.config.voiceOptimized ? 'speed' : 'quality'
          );

          const result = await this.openRouterEngine.generateResponse(
            messages,
            cloudModel
          );
          const latency = Date.now() - startTime;

          this.stats.cloudFallbacks++;
          this.updateAverageLatency(latency);

          if (result.usage?.estimatedCost) {
            this.stats.totalCost += result.usage.estimatedCost;
          }

          metrics.record('llm_cloud_latency_ms', latency);
          metrics.record('llm_cloud_tokens', result.usage?.totalTokens || 0);

          return {
            content: result.content,
            source: 'cloud',
            model: result.model,
            latency,
            fallbackUsed,
          };
        } catch (cloudError) {
          logger.error('Cloud LLM also failed:', cloudError);
          throw new Error('Both local and cloud LLM engines failed');
        }
      }

      throw new Error('No available LLM engines');
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error(`LLM generation failed after ${latency}ms:`, error);
      metrics.record('llm_error_latency_ms', latency);
      throw error;
    }
  }

  // Personal assistant optimized method
  async askPersonalAssistant(
    userQuestion: string,
    context?: string
  ): Promise<string> {
    const systemPrompt = `You are a helpful personal voice assistant. Be concise and natural.

${context ? `Context: ${context}` : ''}

Guidelines for voice responses:
- Keep responses under 2 sentences
- Be conversational and friendly
- If you don't know something, say so briefly
- Focus on being immediately useful
- Avoid long explanations unless specifically asked`;

    const messages: AgentMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuestion },
    ];

    const response = await this.generateResponse(messages, {
      preferredSource: 'auto',
      maxLatency: 8000, // 8s max for voice interaction
      streaming: false,
    });

    // Log for personal assistant usage
    logger.info('Personal assistant response', {
      source: response.source,
      model: response.model,
      latency: response.latency,
      fallback: response.fallbackUsed,
      preview: response.content.substring(0, 50),
    });

    return response.content;
  }

  // Streaming response for real-time conversation
  async streamResponse(
    messages: AgentMessage[],
    onChunk: (chunk: string, source: 'local' | 'cloud') => void,
    options: { preferredSource?: 'local' | 'cloud' | 'auto' } = {}
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const { preferredSource = 'auto' } = options;

    const useLocal = this.shouldUseLocal(preferredSource);
    let content = '';
    let source: 'local' | 'cloud';
    let model: string;

    try {
      if (this.openRouterEngine) {
        logger.info('☁️ Streaming from cloud OpenRouter');
        source = 'cloud';

        const cloudModel = this.openRouterEngine.getBestModelFor('speed');
        const result = await this.openRouterEngine.generateStreamResponse(
          messages,
          cloudModel,
          (chunk) => {
            content += chunk;
            onChunk(chunk, 'cloud');
          }
        );
        model = result.model;
      } else {
        throw new Error('No engines available for streaming');
      }

      const latency = Date.now() - startTime;
      this.updateAverageLatency(latency);

      return {
        content,
        source,
        model,
        latency,
        fallbackUsed: false,
      };
    } catch (error) {
      logger.error('Streaming failed:', error);
      throw error;
    }
  }

  // Health and status methods
  async healthCheck(): Promise<{
    local: { available: boolean; models?: string[] };
    cloud: { available: boolean; models?: any[] };
    config: LLMManagerConfig;
  }> {
    // OpenRouter-only mode
    const localAvailable = false;
    const cloudAvailable = this.openRouterEngine
      ? await this.openRouterEngine.checkAvailability()
      : false;

    const cloudModels =
      cloudAvailable && this.openRouterEngine
        ? this.openRouterEngine.getAvailableModels()
        : undefined;

    return {
      local: { available: localAvailable, models: [] },
      cloud: { available: cloudAvailable, models: cloudModels },
      config: this.config,
    };
  }

  getUsageStats(): UsageStats & {
    efficiency: number;
    costPerRequest: number;
    preferredEngine: 'local' | 'cloud' | 'mixed';
  } {
    const efficiency =
      this.stats.totalRequests > 0
        ? (this.stats.localSuccessful / this.stats.totalRequests) * 100
        : 0;

    const costPerRequest =
      this.stats.totalRequests > 0
        ? this.stats.totalCost / this.stats.totalRequests
        : 0;

    let preferredEngine: 'local' | 'cloud' | 'mixed';
    if (this.stats.localSuccessful > this.stats.cloudFallbacks * 2) {
      preferredEngine = 'local';
    } else if (this.stats.cloudFallbacks > this.stats.localSuccessful * 2) {
      preferredEngine = 'cloud';
    } else {
      preferredEngine = 'mixed';
    }

    return {
      ...this.stats,
      uptime: Date.now() - this.startTime,
      efficiency,
      costPerRequest,
      preferredEngine,
    };
  }

  // Language detection and configuration
  setLanguage(language: Language, config?: Partial<LanguageConfig>) {
    this.currentLanguage = language;
    this.languageConfig = {
      language,
      ...config,
    };

    logger.info(`🌍 Language set to: ${language}`);

    // Update model based on language
    if (this.openRouterEngine) {
      const bestModel = this.openRouterEngine.getBestModelForLanguage(language);
      logger.info(`🤖 Using model for ${language}: ${bestModel}`);
    }
  }

  // Detect language from text (simple heuristic)
  detectLanguage(text: string): Language {
    const textLower = text.toLowerCase();

    // Portuguese detection patterns
    const portuguesePatterns = [
      /\b(olá|oi|bom dia|boa tarde|boa noite)\b/i,
      /\b(obrigado|obrigada|valeu|valeu mesmo)\b/i,
      /\b(como vai|tudo bem|tudo bom)\b/i,
      /\b(por favor|favor|pfv)\b/i,
      /\b(que legal|muito legal|massa|daora)\b/i,
      /\b(cara|mano|brother|parceiro)\b/i,
      /\b(beleza|tranquilo|suave)\b/i,
    ];

    // Check for Portuguese patterns
    for (const pattern of portuguesePatterns) {
      if (pattern.test(textLower)) {
        return 'pt-BR';
      }
    }

    // Check for common Portuguese words
    const portugueseWords = [
      'não', 'sim', 'talvez', 'claro', 'certo', 'entendi',
      'pode ser', 'com certeza', 'sem dúvida', 'absolutamente'
    ];

    for (const word of portugueseWords) {
      if (textLower.includes(word)) {
        return 'pt-BR';
      }
    }

    // Default to English
    return 'en';
  }

  // Get Portuguese-specific configuration
  getPortugueseConfig(): PortugueseConfig {
    return {
      language: 'pt-BR',
      model: 'claude-3-haiku-pt',
      voice: 'pt-BR',
      ttsVoice: 'pt_BR-amy-low',
      sttLanguage: 'pt-BR',
      regionalisms: true,
      formal: false,
    };
  }

  // Generate response with Gon's persona
  async generateResponseWithPersona(
    messages: AgentMessage[],
    options: {
      preferredSource?: 'local' | 'cloud' | 'auto';
      maxLatency?: number;
      streaming?: boolean;
    } = {}
  ): Promise<LLMResponse> {
    const lastMessage = messages[messages.length - 1];

    if (lastMessage && lastMessage.role === 'user') {
      // Check for greetings/farewells first
      const appropriateResponse = this.personaManager.getAppropriateResponse(lastMessage.content);
      if (appropriateResponse) {
        // Add to conversation history
        this.personaManager.addToHistory('user', lastMessage.content);
        this.personaManager.addToHistory('assistant', appropriateResponse);

        logger.info('🎭 Gon persona greeting/farewell response', {
          userMessage: lastMessage.content,
          response: appropriateResponse
        });

        return {
          content: appropriateResponse,
          source: 'gon-persona',
          model: 'gon-persona',
          latency: 0, // No actual latency for a persona response
          fallbackUsed: false,
        };
      }

      // Add user message to history
      this.personaManager.addToHistory('user', lastMessage.content);
    }

    // Create messages with Gon's system prompt
    const gonMessages: AgentMessage[] = [
      {
        role: 'system',
        content: this.personaManager.getSystemPrompt(),
      },
      ...messages,
    ];

    logger.info('🧠 Generating Gon response with LLM', {
      messageCount: messages.length,
      lastMessage: lastMessage?.content
    });

    // Generate response using the appropriate model for Portuguese
    const result = await this.generateResponse(gonMessages, options);

    // Add assistant response to history
    if (result.content) {
      this.personaManager.addToHistory('assistant', result.content);
    }

    return result;
  }

  // Get Gon's greeting
  getGreeting(): string {
    return this.personaManager.getGreeting();
  }

  // Get Gon's farewell
  getFarewell(): string {
    return this.personaManager.getFarewell();
  }

  // Get Gon's initial greeting for system startup
  getInitialGreeting(): string {
    return "Oi! Eu sou o Gon, seu assistente pessoal brasileiro! 🎭 Estou aqui para te ajudar com qualquer coisa. Como posso ser útil hoje?";
  }

  // Get Gon's persona info
  getPersonaInfo() {
    return {
      name: this.personaManager.getCurrentPersona().name,
      traits: this.personaManager.getTraits(),
      interests: this.personaManager.getInterests(),
      language: this.personaManager.getLanguage(),
      voice: this.personaManager.getVoice(),
    };
  }

  // Private helper methods
  private shouldUseLocal(preferredSource: 'local' | 'cloud' | 'auto'): boolean {
    if (preferredSource === 'local') return true;
    if (preferredSource === 'cloud') return false;

    // Auto: prefer local if available and config says so
    return this.config.preferLocal && !!this.ollamaEngine;
  }

  private updateAverageLatency(newLatency: number) {
    const totalLatency =
      this.stats.averageLatency * (this.stats.totalRequests - 1) + newLatency;
    this.stats.averageLatency = totalLatency / this.stats.totalRequests;
  }
}

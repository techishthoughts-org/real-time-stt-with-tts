import { AgentMessage } from '@voice/schemas';
import CircuitBreaker from 'opossum';
import { z } from 'zod';

// OpenRouter API configuration
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Best FREE models on OpenRouter (perfect for personal assistant)
export const FreeModels = {
  'llama-3.2-3b-free': {
    id: 'meta-llama/llama-3.2-3b-instruct:free',
    name: 'Llama 3.2 3B (Free)',
    context: 131_072, // 131K tokens
    speed: 'fast',
    cost: 'FREE',
    description:
      'Fast and lightweight Llama model, perfect for quick responses',
    languages: ['en', 'es', 'pt', 'fr', 'de', 'it'],
  },
  'gemma-2-9b-free': {
    id: 'google/gemma-2-9b-it:free',
    name: 'Gemma 2 9B (Free)',
    context: 8_192, // 8K tokens
    speed: 'fast',
    cost: 'FREE',
    description: 'Google Gemma 2 model, good quality responses',
    languages: ['en', 'es', 'pt', 'fr', 'de', 'it', 'pt-BR'],
  },
  'qwen-2.5-72b-free': {
    id: 'qwen/qwen-2.5-72b-instruct:free',
    name: 'Qwen 2.5 72B (Free)',
    context: 32_768, // 32K tokens
    speed: 'medium',
    cost: 'FREE',
    description: 'Powerful Qwen model, excellent for complex reasoning',
    languages: ['en', 'es', 'pt', 'fr', 'de', 'it', 'pt-BR', 'zh', 'ja', 'ko'],
  },
} as const;

// Brazilian Portuguese specific models
export const PortugueseModels = {
  'claude-3-haiku-pt': {
    id: 'anthropic/claude-3-haiku:free',
    name: 'Claude 3 Haiku (Portuguese)',
    context: 200_000, // 200K tokens
    speed: 'fast',
    cost: 'FREE',
    description: 'Excellent Portuguese understanding, very natural responses',
    languages: ['en', 'pt', 'pt-BR'],
    portugueseOptimized: true,
  },
  'gemini-1.5-flash-pt': {
    id: 'google/gemini-1.5-flash:free',
    name: 'Gemini 1.5 Flash (Portuguese)',
    context: 1_000_000, // 1M tokens
    speed: 'fast',
    cost: 'FREE',
    description: 'Google Gemini with excellent Portuguese support',
    languages: ['en', 'pt', 'pt-BR', 'es'],
    portugueseOptimized: true,
  },
  'llama-3.1-8b-pt': {
    id: 'meta-llama/llama-3.1-8b-instruct:free',
    name: 'Llama 3.1 8B (Portuguese)',
    context: 8_192, // 8K tokens
    speed: 'fast',
    cost: 'FREE',
    description: 'Llama 3.1 with good Portuguese understanding',
    languages: ['en', 'pt', 'pt-BR', 'es'],
    portugueseOptimized: true,
  },
} as const;

// Paid models for when you need premium quality
export const PaidModels = {
  'qwen3-30b': {
    id: 'qwen/qwen3-30b-a3b',
    name: 'Qwen3 30B A3B',
    context: 40_960,
    speed: 'fast',
    cost: '$0.02/$0.08 per 1M tokens',
    description: 'Best balance of speed/quality/cost for daily use',
    languages: ['en', 'pt', 'pt-BR', 'es', 'fr', 'de', 'it', 'zh', 'ja', 'ko'],
  },
  'claude-3-sonnet': {
    id: 'anthropic/claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    context: 200_000,
    speed: 'medium',
    cost: '$0.003/$0.015 per 1K tokens',
    description: 'Excellent Portuguese understanding and reasoning',
    languages: ['en', 'pt', 'pt-BR', 'es', 'fr', 'de', 'it'],
    portugueseOptimized: true,
  },
} as const;

export type FreeModelKey = keyof typeof FreeModels;
export type PortugueseModelKey = keyof typeof PortugueseModels;
export type PaidModelKey = keyof typeof PaidModels;
export type ModelKey = FreeModelKey | PortugueseModelKey | PaidModelKey;

// OpenRouter API schemas
const OpenRouterRequest = z.object({
  model: z.string(),
  messages: z.array(AgentMessage),
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  stream: z.boolean().optional(),
});

const OpenRouterResponse = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number(),
      message: z.object({
        role: z.string(),
        content: z.string(),
      }),
      finish_reason: z.string().optional(),
    })
  ),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number(),
    })
    .optional(),
});

export interface OpenRouterEngineConfig {
  apiKey: string;
  defaultModel: ModelKey;
  temperature: number;
  maxTokens: number;
  timeout: number;
  preferFreeModels: boolean;
}

export class OpenRouterEngine {
  private config: OpenRouterEngineConfig;
  private baseUrl: string;
  private headers: Record<string, string>;
  private circuitBreaker: CircuitBreaker;

  constructor(config: Partial<OpenRouterEngineConfig> = {}) {
    const apiKey = config.apiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENROUTER_API_KEY is required. Set it in environment variables or pass it in config.'
      );
    }

    this.config = {
      apiKey,
      defaultModel: 'llama-3.2-3b-free', // FREE model as default
      temperature: 0.7,
      maxTokens: 150, // Short responses for voice assistant
      timeout: 15000, // 15s timeout
      preferFreeModels: true, // Always prefer free models
      ...config,
    };

    this.baseUrl = OPENROUTER_BASE_URL;
    this.headers = {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/arthurcosta/real-time-stt-with-tts',
      'X-Title': 'Personal Voice Assistant',
    };

    // Circuit breaker for API calls
    this.circuitBreaker = new CircuitBreaker(this.makeApiCall.bind(this), {
      timeout: this.config.timeout,
      errorThresholdPercentage: 50,
      resetTimeout: 30000, // 30s reset
      volumeThreshold: 5,
    });

    this.circuitBreaker.on('open', () => {
      console.error('🚨 OpenRouter circuit breaker opened');
    });

    this.circuitBreaker.on('halfOpen', () => {
      console.log('🔄 OpenRouter circuit breaker half-open');
    });

    this.circuitBreaker.on('close', () => {
      console.log('✅ OpenRouter circuit breaker closed');
    });
  }

  private async makeApiCall(endpoint: string, request: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error response:', errorText);
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('Non-JSON response from OpenRouter:', responseText);
      throw new Error(`OpenRouter returned non-JSON response: ${responseText.substring(0, 100)}`);
    }

    const responseText = await response.text();
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response text:', responseText);
      throw new Error(`Failed to parse OpenRouter response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.headers,
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      console.error('OpenRouter availability check failed:', error);
      return false;
    }
  }

  async generateResponse(
    messages: AgentMessage[],
    model: ModelKey = this.config.defaultModel
  ): Promise<{
    content: string;
    model: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCost?: number;
    };
  }> {
    const startTime = Date.now();

    try {
      // Get model config
      const modelConfig = this.getModelConfig(model);

      // Prepare request
      const request = OpenRouterRequest.parse({
        model: modelConfig.id,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: false,
      });

      // Use circuit breaker for API call
      const data = await this.circuitBreaker.fire('/chat/completions', request);
      const result = OpenRouterResponse.parse(data);

      if (!result.choices[0]?.message?.content) {
        throw new Error('No response content from OpenRouter');
      }

      // Calculate estimated cost (only for paid models)
      let estimatedCost: number | undefined;
      if (model in PaidModels && result.usage) {
        // Very rough estimation - would need actual pricing from OpenRouter
        estimatedCost = (result.usage.total_tokens / 1_000_000) * 0.05; // ~$0.05 per 1M tokens average
      }

      return {
        content: result.choices[0].message.content,
        model: result.model,
        usage: result.usage
          ? {
              promptTokens: result.usage.prompt_tokens,
              completionTokens: result.usage.completion_tokens,
              totalTokens: result.usage.total_tokens,
              estimatedCost,
            }
          : undefined,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`OpenRouter generation failed after ${duration}ms:`, error);

      // Fallback response for rate limiting or API issues
      if (error instanceof Error && (error.message.includes('rate limit') || error.message.includes('non-JSON'))) {
        console.log('🔄 Using fallback response due to OpenRouter issues');
        return {
          content: "Desculpe, estou com problemas técnicos no momento. Pode tentar novamente em alguns segundos?",
          model: 'fallback',
          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            estimatedCost: 0,
          },
        };
      }

      throw error;
    }
  }

  async generateStreamResponse(
    messages: AgentMessage[],
    model: ModelKey = this.config.defaultModel,
    onChunk: (chunk: string) => void
  ): Promise<{
    content: string;
    model: string;
    usage?: any;
  }> {
    const startTime = Date.now();
    let fullContent = '';

    try {
      const modelConfig = this.getModelConfig(model);

      const request = OpenRouterRequest.parse({
        model: modelConfig.id,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: true,
      });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response stream');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk
          .split('\n')
          .filter((line) => line.trim() && line.startsWith('data: '));

        for (const line of lines) {
          if (line.includes('[DONE]')) continue;

          try {
            const data = JSON.parse(line.slice(6)); // Remove 'data: ' prefix
            const content = data.choices?.[0]?.delta?.content;

            if (content) {
              fullContent += content;
              onChunk(content);
            }
          } catch (parseError) {
            // Skip invalid JSON lines
          }
        }
      }

      return {
        content: fullContent,
        model: modelConfig.id,
        usage: {}, // Stream doesn't return usage stats
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`OpenRouter streaming failed after ${duration}ms:`, error);
      throw error;
    }
  }

  // Personal assistant optimized response
  async personalAssistantResponse(
    userMessage: string,
    context?: string
  ): Promise<string> {
    const systemPrompt = `You are a helpful personal assistant. Be concise, friendly, and natural.
${context ? `Context: ${context}` : ''}

Guidelines:
- Keep responses under 2 sentences for voice interaction
- Be conversational and helpful
- If you don't know something, say so briefly
- Focus on being useful for daily tasks and questions`;

    const messages: AgentMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    // Use fastest free model for personal assistant
    const result = await this.generateResponse(messages, 'llama-3.2-3b-free');
    return result.content;
  }

  // Get available models (prioritize free models)
  getAvailableModels(): Array<{ key: ModelKey; config: any; isFree: boolean }> {
    const freeModels = Object.entries(FreeModels).map(([key, config]) => ({
      key: key as FreeModelKey,
      config,
      isFree: true,
    }));

    const paidModels = Object.entries(PaidModels).map(([key, config]) => ({
      key: key as PaidModelKey,
      config,
      isFree: false,
    }));

    // Return free models first
    return [...freeModels, ...paidModels];
  }

  // Get best model for specific use case
  getBestModelFor(
    useCase: 'speed' | 'quality' | 'free' | 'balanced' | 'portuguese'
  ): ModelKey {
    switch (useCase) {
      case 'speed':
        return 'llama-3.2-3b-free'; // Fast and free
      case 'quality':
        return this.config.preferFreeModels ? 'qwen-2.5-72b-free' : 'qwen3-30b';
      case 'free':
        return 'llama-3.2-3b-free';
      case 'balanced':
        return this.config.preferFreeModels ? 'gemma-2-9b-free' : 'qwen3-30b';
      case 'portuguese':
        return 'claude-3-haiku-pt'; // Best Portuguese model
      default:
        return this.config.defaultModel;
    }
  }

  // Get best model for language
  getBestModelForLanguage(language: string): ModelKey {
    const languageLower = language.toLowerCase();

    if (languageLower === 'pt' || languageLower === 'pt-br' || languageLower === 'portuguese') {
      return 'claude-3-haiku-pt'; // Best Portuguese model
    }

    // Default to balanced model for other languages
    return 'gemma-2-9b-free';
  }

  private getModelConfig(model: ModelKey) {
    if (model in FreeModels) {
      return FreeModels[model as FreeModelKey];
    }
    if (model in PortugueseModels) {
      return PortugueseModels[model as PortugueseModelKey];
    }
    if (model in PaidModels) {
      return PaidModels[model as PaidModelKey];
    }
    throw new Error(`Unknown model: ${model}`);
  }
}

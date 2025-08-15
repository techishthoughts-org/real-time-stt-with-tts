import { z } from 'zod';
import { AgentMessage } from '@voice/schemas';

// Ollama API configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

// Available local models with performance characteristics
export const LocalModels = {
  // Your installed models (optimized for voice/chat)
  'qwen2.5:1.5b': {
    name: 'Qwen 2.5 1.5B',
    size: '1.5B',
    speed: 'very-fast',
    quality: 'good',
    description: 'Fastest model, best for quick responses',
  },
  'llama3.2:3b': {
    name: 'Llama 3.2 3B',
    size: '3B',
    speed: 'fast',
    quality: 'very-good',
    description: 'Balanced speed/quality for conversation',
  },
  'llama3:latest': {
    name: 'Llama 3 8B',
    size: '8B',
    speed: 'medium',
    quality: 'excellent',
    description: 'High quality responses, slower',
  },
  'gemma3:4b': {
    name: 'Gemma 3 4B',
    size: '4B',
    speed: 'fast',
    quality: 'very-good',
    description: 'Google model, good reasoning',
  },
} as const;

export type LocalModelKey = keyof typeof LocalModels;

// Ollama API schemas
const OllamaRequest = z.object({
  model: z.string(),
  messages: z.array(AgentMessage),
  stream: z.boolean().optional(),
  options: z
    .object({
      temperature: z.number().optional(),
      top_p: z.number().optional(),
      num_predict: z.number().optional(),
    })
    .optional(),
});

const OllamaResponse = z.object({
  model: z.string(),
  message: z.object({
    role: z.string(),
    content: z.string(),
  }),
  done: z.boolean(),
  total_duration: z.number().optional(),
  load_duration: z.number().optional(),
  prompt_eval_duration: z.number().optional(),
  eval_duration: z.number().optional(),
  eval_count: z.number().optional(),
});

export interface OllamaEngineConfig {
  defaultModel: LocalModelKey;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

export class OllamaEngine {
  private config: OllamaEngineConfig;
  private baseUrl: string;

  constructor(config: Partial<OllamaEngineConfig> = {}) {
    this.config = {
      defaultModel: 'llama3.2:3b', // Best balance for voice chat
      temperature: 0.7,
      maxTokens: 150, // Short responses for voice
      timeout: 10000, // 10s timeout for voice apps
      ...config,
    };
    this.baseUrl = OLLAMA_BASE_URL;
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      console.error('Ollama availability check failed:', error);
      return false;
    }
  }

  async listInstalledModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  async generateResponse(
    messages: AgentMessage[],
    model: LocalModelKey = this.config.defaultModel
  ): Promise<{
    content: string;
    model: string;
    metrics: {
      totalDuration?: number;
      loadDuration?: number;
      promptEvalDuration?: number;
      evalDuration?: number;
      evalCount?: number;
      tokensPerSecond?: number;
    };
  }> {
    const startTime = Date.now();

    try {
      // Prepare request
      const request = OllamaRequest.parse({
        model,
        messages,
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens,
        },
      });

      // Make API call
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(
          `Ollama API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const result = OllamaResponse.parse(data);

      // Calculate tokens per second
      const tokensPerSecond =
        result.eval_count && result.eval_duration
          ? result.eval_count / (result.eval_duration / 1_000_000_000)
          : undefined;

      return {
        content: result.message.content,
        model: result.model,
        metrics: {
          totalDuration: result.total_duration,
          loadDuration: result.load_duration,
          promptEvalDuration: result.prompt_eval_duration,
          evalDuration: result.eval_duration,
          evalCount: result.eval_count,
          tokensPerSecond,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Ollama generation failed after ${duration}ms:`, error);
      throw error;
    }
  }

  async generateStreamResponse(
    messages: AgentMessage[],
    model: LocalModelKey = this.config.defaultModel,
    onChunk: (chunk: string) => void
  ): Promise<{
    content: string;
    model: string;
    metrics: any;
  }> {
    const startTime = Date.now();
    let fullContent = '';

    try {
      const request = OllamaRequest.parse({
        model,
        messages,
        stream: true,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens,
        },
      });

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response stream');
      }

      const decoder = new TextDecoder();
      let finalMetrics = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              const content = data.message.content;
              fullContent += content;
              onChunk(content);
            }
            if (data.done) {
              finalMetrics = {
                totalDuration: data.total_duration,
                loadDuration: data.load_duration,
                promptEvalDuration: data.prompt_eval_duration,
                evalDuration: data.eval_duration,
                evalCount: data.eval_count,
              };
            }
          } catch (parseError) {
            // Skip invalid JSON lines
          }
        }
      }

      return {
        content: fullContent,
        model,
        metrics: finalMetrics,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Ollama streaming failed after ${duration}ms:`, error);
      throw error;
    }
  }

  // Voice-optimized quick response (for real-time conversation)
  async quickResponse(
    userMessage: string,
    model: LocalModelKey = 'qwen2.5:1.5b'
  ): Promise<string> {
    const messages: AgentMessage[] = [
      {
        role: 'system',
        content:
          'You are a helpful voice assistant. Give brief, conversational responses (1-2 sentences max). Be natural and engaging.',
      },
      {
        role: 'user',
        content: userMessage,
      },
    ];

    const result = await this.generateResponse(messages, model);
    return result.content;
  }

  // Get model recommendation based on response time requirements
  getRecommendedModel(
    targetLatency: 'ultra-fast' | 'fast' | 'balanced' | 'quality'
  ): LocalModelKey {
    switch (targetLatency) {
      case 'ultra-fast':
        return 'qwen2.5:1.5b';
      case 'fast':
        return 'llama3.2:3b';
      case 'balanced':
        return 'gemma3:4b';
      case 'quality':
        return 'llama3:latest';
      default:
        return this.config.defaultModel;
    }
  }
}

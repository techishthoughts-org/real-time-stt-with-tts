import { z } from 'zod';

export const FeatureFlags = z.object({
  gpuEnabled: z.boolean().default(false),
  openRouterEnabled: z.boolean().default(false),
  cloudTtsEnabled: z.boolean().default(false),
  externalSfuEnabled: z.boolean().default(false),
  telemetryEnabled: z.boolean().default(false),
});
export type FeatureFlags = z.infer<typeof FeatureFlags>;

export const AudioFrame = z.object({
  seq: z.number().int().nonnegative(),
  timestamp: z.number(),
  format: z.object({
    sampleRate: z.number(),
    channels: z.number(),
    encoding: z.enum(['pcm16', 'opus']),
  }),
  vad: z.enum(['silence', 'speech']).default('silence'),
  rms: z.number().nonnegative().optional(),
  data: z.any(), // Audio data buffer
});
export type AudioFrame = z.infer<typeof AudioFrame>;

export const TranscriptPartial = z.object({
  text: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  startMs: z.number().optional(),
  endMs: z.number().optional(),
  isFinal: z.boolean().default(false),
  timestamp: z.number().optional(),
});
export type TranscriptPartial = z.infer<typeof TranscriptPartial>;

export const Word = z.object({
  w: z.string(),
  startMs: z.number(),
  endMs: z.number(),
});
export type Word = z.infer<typeof Word>;

export const TranscriptFinal = TranscriptPartial.extend({
  words: z.array(Word).optional(),
  duration: z.number().optional(),
});
export type TranscriptFinal = z.infer<typeof TranscriptFinal>;

export const TTSAudioChunk = z.object({
  data: z.any(), // Audio data buffer
  timestamp: z.number(),
  isLast: z.boolean().default(false),
});
export type TTSAudioChunk = z.infer<typeof TTSAudioChunk>;

export const AgentMessage = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});
export type AgentMessage = z.infer<typeof AgentMessage>;

// LLM Response schema
export const LLMResponse = z.object({
  content: z.string(),
  source: z.enum(['local', 'cloud', 'gon-persona']),
  model: z.string(),
  latency: z.number(),
  fallbackUsed: z.boolean().default(false),
});
export type LLMResponse = z.infer<typeof LLMResponse>;

// Language support schemas
export const LanguageSchema = z.enum(['en', 'pt', 'pt-BR', 'es', 'fr', 'de', 'it', 'zh', 'ja', 'ko']);
export type Language = z.infer<typeof LanguageSchema>;

export const LanguageConfigSchema = z.object({
  language: LanguageSchema,
  model: z.string().optional(),
  voice: z.string().optional(),
  ttsVoice: z.string().optional(),
  sttLanguage: z.string().optional(),
});

export type LanguageConfig = z.infer<typeof LanguageConfigSchema>;

// Portuguese-specific configuration
export const PortugueseConfigSchema = z.object({
  language: z.literal('pt-BR'),
  model: z.string().default('claude-3-haiku-pt'),
  voice: z.string().default('pt-BR'),
  ttsVoice: z.string().default('pt_BR-amy-low'),
  sttLanguage: z.string().default('pt-BR'),
  regionalisms: z.boolean().default(true),
  formal: z.boolean().default(false),
});

export type PortugueseConfig = z.infer<typeof PortugueseConfigSchema>;

// Persona system for Gon
export const PersonaSchema = z.object({
  name: z.string(),
  personality: z.string(),
  language: LanguageSchema,
  voice: z.string(),
  greeting: z.string(),
  farewell: z.string(),
  traits: z.array(z.string()),
  interests: z.array(z.string()),
  speakingStyle: z.string(),
});

export type Persona = z.infer<typeof PersonaSchema>;

// Gon's specific configuration
export const GonPersonaSchema = z.object({
  name: z.literal('Gon'),
  personality: z.string().default('Friendly, enthusiastic, and helpful Brazilian assistant with a warm personality'),
  language: z.literal('pt-BR'),
  voice: z.string().default('pt_BR-amy-low'),
  greeting: z.string().default('Oi! Tudo bem? Eu sou o Gon, seu assistente pessoal! Como posso te ajudar hoje?'),
  farewell: z.string().default('Até logo! Foi um prazer te ajudar!'),
  traits: z.array(z.string()).default([
    'Friendly and warm',
    'Enthusiastic about helping',
    'Uses Brazilian Portuguese naturally',
    'Loves technology and innovation',
    'Patient and understanding',
    'Has a sense of humor'
  ]),
  interests: z.array(z.string()).default([
    'Technology and AI',
    'Brazilian culture',
    'Helping people',
    'Learning new things',
    'Music and creativity'
  ]),
  speakingStyle: z.string().default('Natural Brazilian Portuguese with occasional friendly slang and expressions'),
});

export type GonPersona = z.infer<typeof GonPersonaSchema>;

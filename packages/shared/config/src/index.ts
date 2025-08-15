import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { z } from 'zod';

// Load environment variables
const envFile = process.env.ENV_FILE || '.env.local';
if (existsSync(envFile)) {
  loadEnv({ path: envFile });
}

// Environment validation schema
const EnvSchema = z.object({
  // API Keys
  OPENROUTER_API_KEY: z.string().optional(),

  // Server Config
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().transform(Number).default('3030'),
  HOST: z.string().default('127.0.0.1'),

  // Feature Flags
  VOICE_GPU_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  OPENROUTER_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  TTS_CLOUD_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  WEBRTC_EXTERNAL_SFU_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  TELEMETRY_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),

  // Security
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  RATE_LIMIT_WINDOW: z.string().default('15m'),
  CORS_ORIGINS: z
    .string()
    .transform((v) => v.split(','))
    .default('http://localhost:5173,http://127.0.0.1:5173'),

  // Monitoring
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
  SENTRY_DSN: z.string().optional(),

  // Redis
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(6).default('dev-secret'),
});

// Parse and validate environment
let env: z.infer<typeof EnvSchema>;

try {
  env = EnvSchema.parse(process.env);
} catch (error) {
  console.error('❌ Invalid environment variables:');
  if (error instanceof z.ZodError) {
    error.errors.forEach((err) => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
  }
  process.exit(1);
}

// Validate required API keys when features are enabled
if (env.OPENROUTER_ENABLED && !env.OPENROUTER_API_KEY) {
  console.error(
    '❌ OPENROUTER_API_KEY is required when OPENROUTER_ENABLED=true'
  );
  process.exit(1);
}

// Export validated config
export const config = {
  env: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  server: {
    port: env.PORT,
    host: env.HOST,
  },

  features: {
    gpuEnabled: env.VOICE_GPU_ENABLED,
    openRouterEnabled: env.OPENROUTER_ENABLED,
    cloudTtsEnabled: env.TTS_CLOUD_ENABLED,
    externalSfuEnabled: env.WEBRTC_EXTERNAL_SFU_ENABLED,
    telemetryEnabled: env.TELEMETRY_ENABLED,
  },

  // Security configuration
  security: {
    cors: {
      origins: env.CORS_ORIGINS,
    },
    rateLimit: {
      max: env.RATE_LIMIT_MAX,
      window: env.RATE_LIMIT_WINDOW,
    }
  },

  apis: {
    openRouter: {
      apiKey: env.OPENROUTER_API_KEY,
    },
  },

  monitoring: {
    logLevel: env.LOG_LEVEL,
    sentryDsn: env.SENTRY_DSN,
  },

  redis: {
    url: env.REDIS_URL,
  },

  jwt: {
    secret: env.JWT_SECRET,
  },
};

// Type exports
export type Config = typeof config;
export type FeatureFlags = typeof config.features;
export type JwtConfig = typeof config.jwt;

import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { config } from '@voice/config';
import { logger } from '@voice/observability';
import Fastify from 'fastify';
import client from 'prom-client';
import { cacheService } from './cache';
import { EngineManager } from './engines';
import { healthRoutes } from './routes/health';
import { WebRTCManager } from './webrtc';

export async function buildApp() {
  const fastify = Fastify({
    logger: config.isTest
      ? false
      : {
          level: config.monitoring.logLevel,
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              ignore: 'pid,hostname',
              messageFormat: '[Server] {msg}',
            },
          },
        },
  });

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    logger.error('Request error:', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    });

    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      error: {
        message: config.isProduction ? 'Internal Server Error' : error.message,
        code: error.code || 'INTERNAL_ERROR',
        statusCode,
      },
    });
  });

  // CORS configuration
  const corsOrigins = config.security.cors.origins
  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return cb(null, true)

      // Check if origin is in allowlist
      if (corsOrigins.includes(origin)) {
        return cb(null, true)
      }

      // In development, allow localhost variations and file protocol
      if (config.isDevelopment) {
        const localhostPatterns = [
          'http://localhost:',
          'http://127.0.0.1:',
          'https://localhost:',
          'https://127.0.0.1:',
          'file://'
        ]
        if (localhostPatterns.some(pattern => origin.startsWith(pattern))) {
          return cb(null, true)
        }
      }

      // Reject unauthorized origins
      return cb(new Error('Not allowed by CORS'), false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400 // 24 hours
  })

  // Register rate limiting
  await fastify.register(rateLimit, {
    max: config.security.rateLimit.max,
    timeWindow: config.security.rateLimit.window,
    allowList: ['127.0.0.1'],
  });

  // Swagger documentation
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: 'Voice Assistant API',
        version: '0.1.0',
      },
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // JWT auth
  await fastify.register(fastifyJwt, {
    secret: config.jwt?.secret || 'fallback-secret-for-development',
  });

  // Public route to get a token (demo only)
  fastify.post('/auth/token', async (request, reply) => {
    const { username } = request.body as { username: string };
    if (!username) return reply.code(400).send({ error: 'username required' });
    const token = fastify.jwt.sign({ sub: username });
    return { token };
  });

  // Auth hook for protected routes
  fastify.addHook('onRequest', async (req, res) => {
    // Skip authentication for health endpoints and public LLM chat
    if (req.routerPath?.startsWith('/health') ||
        req.routerPath === '/llm/health' ||
        req.routerPath === '/llm/chat') {
      return;
    }

    if (req.routerPath?.startsWith('/llm')) {
      try {
        await req.jwtVerify();
      } catch (err) {
        res.code(401).send({ error: 'Unauthorized' });
      }
    }
  });

  // Prometheus metrics
  const collectDefault = client.collectDefaultMetrics;
  try {
    collectDefault();
  } catch (error) {
    // Metrics already registered, ignore error
    logger.warn('Prometheus metrics already registered');
  }

  fastify.get('/metrics', async (request, reply) => {
    reply.header('Content-Type', client.register.contentType);
    return client.register.metrics();
  });

  // Initialize engines
  const engineManager = new EngineManager(config.features);
  const webrtcManager = new WebRTCManager(engineManager);

  // Initialize cache service
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    await cacheService.connect(redisUrl);
    logger.info('Cache service initialized');
  } catch (error) {
    logger.warn('Cache service not available, continuing without caching');
  }

  // Make engine manager available to routes
  fastify.decorate('engineManager', engineManager);

  // Health routes
  await healthRoutes(fastify);

  // Setup routes
  // Note: /health and /llm/health are already registered by healthRoutes

  // LLM Chat endpoint (for testing)
  fastify.post('/llm/chat', async (request, reply) => {
    const { message, context } = request.body as { message: string; context?: string };

    if (!message || typeof message !== 'string') {
      return reply.code(400).send({ error: 'Message is required and must be a string' });
    }

    try {
      const result = await engineManager.generateAIResponse(message, context);

      return {
        response: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('AI response generation error', error);
      return reply.code(500).send({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Persona info endpoint
  fastify.get('/persona/info', async (request, reply) => {
    try {
      const personaInfo = engineManager.getPersonaInfo();
      const greeting = await engineManager.getGreeting();
      const farewell = await engineManager.getFarewell();
      const initialGreeting = engineManager.getInitialGreeting();

      return {
        persona: personaInfo,
        greeting,
        farewell,
        initialGreeting,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Persona info error', error);
      return reply.code(500).send({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // LLM Streaming Chat endpoint
  fastify.post('/llm/chat/stream', async (request, reply) => {
    try {
      const { message } = request.body as {
        message: string;
        context?: string;
      };

      if (!message || typeof message !== 'string') {
        reply.code(400);
        return { error: 'Message is required and must be a string' };
      }

      // Generate a stream ID for tracking
      const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        streamId,
        status: 'started'
      };
    } catch (error) {
      reply.code(500);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // STT Processing endpoint
  fastify.post('/stt/process', async (request, reply) => {
    try {
      const audioFrame = request.body as any;

      if (!audioFrame || !audioFrame.data) {
        reply.code(400);
        return { error: 'Audio frame data is required' };
      }

      // For now, return mock transcription
      return {
        text: 'Mock transcription',
        confidence: 0.9,
        isFinal: false,
        timestamp: Date.now()
      };
    } catch (error) {
      reply.code(500);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // TTS Synthesis endpoint
  fastify.post('/tts/synthesize', async (request, reply) => {
    try {
      const { text } = request.body as {
        text: string;
        voice?: string;
      };

      if (!text || typeof text !== 'string') {
        reply.code(400);
        return { error: 'Text is required and must be a string' };
      }

      // For now, return mock audio chunks
      return {
        audioChunks: [
          {
            data: 'bW9jayBhdWRpbyBkYXRh', // base64 encoded "mock audio data"
            timestamp: Date.now(),
            isLast: true
          }
        ]
      };
    } catch (error) {
      reply.code(500);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  webrtcManager.setupRoutes(fastify);

  return fastify;
}

export async function main() {
  const app = await buildApp();
  const { port, host } = config.server;

  try {
    await app.listen({ port, host });
    logger.info(`🚀 Server listening on http://${host}:${port}`);
    logger.info('📋 Configuration:', {
      environment: config.env,
      features: config.features,
      cors: config.security.cors.origins,
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Only start server if not imported (e.g., not in tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export default buildApp;

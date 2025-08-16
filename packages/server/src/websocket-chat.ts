import { FastifyInstance, FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import '@fastify/websocket';
import { logger, metrics } from '@voice/observability';
import { EngineManager } from './engines';
import { AgentMessage } from '@voice/schemas';
import { userRateLimiter } from './rate-limiter';
import { ErrorHandler } from './error-handler';

interface WebSocketMessage {
  type: 'voice_chunk' | 'text_message' | 'start_listening' | 'stop_listening' | 'ping' | 'pong';
  data?: any;
  userId?: string;
  conversationId?: string;
  timestamp?: number;
}

interface WebSocketResponse {
  type: 'voice_response' | 'text_response' | 'status' | 'error' | 'pong';
  data?: any;
  conversationId?: string;
  timestamp: number;
}

interface ClientConnection {
  id: string;
  userId: string;
  conversationId?: string;
  isListening: boolean;
  lastActivity: number;
  ws: WebSocket;
}

class WebSocketChatManager {
  private connections = new Map<string, ClientConnection>();
  private engineManager: EngineManager;

  constructor(engineManager: EngineManager) {
    this.engineManager = engineManager;
    this.startCleanupInterval();
  }

  handleConnection(connection: any, request: FastifyRequest) {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userId = request.headers['x-user-id'] as string || 'anonymous';
    const ws = connection.socket;

    const clientConnection: ClientConnection = {
      id: connectionId,
      userId,
      isListening: false,
      lastActivity: Date.now(),
      ws,
    };

    this.connections.set(connectionId, clientConnection);

    logger.info('WebSocket connection established', {
      connectionId,
      userId,
      totalConnections: this.connections.size,
    });

    // Send welcome message
    this.sendMessage(connectionId, {
      type: 'status',
      data: {
        message: 'Connected to Gon Voice Assistant',
        connectionId,
        userId,
      },
      timestamp: Date.now(),
    });

    // Handle incoming messages
    ws.on('message', async (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        await this.handleMessage(connectionId, message);
      } catch (error) {
        logger.error('Error handling WebSocket message', error);
        this.sendError(connectionId, 'Invalid message format');
      }
    });

    // Handle connection close
    ws.on('close', () => {
      this.handleDisconnection(connectionId);
    });

    // Handle errors
    ws.on('error', (error: any) => {
      logger.error('WebSocket error', { connectionId, error: error.message });
      this.handleDisconnection(connectionId);
    });

    // Send ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendMessage(connectionId, {
          type: 'pong',
          timestamp: Date.now(),
        });
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  }

  private async handleMessage(connectionId: string, message: WebSocketMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    connection.lastActivity = Date.now();

    try {
      switch (message.type) {
        case 'start_listening':
          await this.handleStartListening(connectionId, message);
          break;

        case 'stop_listening':
          await this.handleStopListening(connectionId, message);
          break;

        case 'voice_chunk':
          await this.handleVoiceChunk(connectionId, message);
          break;

        case 'text_message':
          await this.handleTextMessage(connectionId, message);
          break;

        case 'ping':
          this.sendMessage(connectionId, {
            type: 'pong',
            timestamp: Date.now(),
          });
          break;

        default:
          this.sendError(connectionId, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error('Error handling message', { connectionId, messageType: message.type, error });
      this.sendError(connectionId, 'Internal server error');
    }
  }

  private async handleStartListening(connectionId: string, message: WebSocketMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Rate limiting
    const rateLimitResult = await userRateLimiter.checkUserLimit(connection.userId, 'voice_stream');
    if (!rateLimitResult.allowed) {
      this.sendError(connectionId, 'Rate limit exceeded', 429);
      return;
    }

    connection.isListening = true;
    connection.conversationId = message.conversationId;

    this.sendMessage(connectionId, {
      type: 'status',
      data: {
        message: 'Started listening',
        isListening: true,
      },
      timestamp: Date.now(),
    });

    logger.info('Started listening', { connectionId, userId: connection.userId });
  }

  private async handleStopListening(connectionId: string, message: WebSocketMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.isListening = false;

    this.sendMessage(connectionId, {
      type: 'status',
      data: {
        message: 'Stopped listening',
        isListening: false,
      },
      timestamp: Date.now(),
    });

    logger.info('Stopped listening', { connectionId, userId: connection.userId });
  }

  private async handleVoiceChunk(connectionId: string, message: WebSocketMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isListening) {
      return;
    }

    try {
      // Process audio chunk with STT engine
      const audioData = message.data;
      const partial = await this.engineManager.processAudioFrame(audioData);

      if (partial && partial.text) {
        // Send partial transcription
        this.sendMessage(connectionId, {
          type: 'text_response',
          data: {
            text: partial.text,
            isPartial: true,
            confidence: partial.confidence,
          },
          conversationId: connection.conversationId,
          timestamp: Date.now(),
        });

        // If this is a final transcription, generate AI response
        if (partial.isFinal) {
          await this.generateAIResponse(connectionId, partial.text);
        }
      }
    } catch (error) {
      logger.error('Error processing voice chunk', { connectionId, error });
      this.sendError(connectionId, 'Error processing audio');
    }
  }

  private async handleTextMessage(connectionId: string, message: WebSocketMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const text = message.data?.text;
    if (!text) {
      this.sendError(connectionId, 'Text message is required');
      return;
    }

    await this.generateAIResponse(connectionId, text);
  }

  private async generateAIResponse(connectionId: string, text: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      // Rate limiting
      const rateLimitResult = await userRateLimiter.checkUserLimit(connection.userId, 'ai_response');
      if (!rateLimitResult.allowed) {
        this.sendError(connectionId, 'Rate limit exceeded', 429);
        return;
      }

      // Generate AI response
      const result = await this.engineManager.generateAIResponse(text);

      // Send text response
      this.sendMessage(connectionId, {
        type: 'text_response',
        data: {
          text: result.response,
          isPartial: false,
          model: result.model,
          persona: result.persona,
          latency: result.latency,
        },
        conversationId: connection.conversationId,
        timestamp: Date.now(),
      });

      // Generate and stream TTS audio
      await this.streamTTSAudio(connectionId, result.response);

      // Record metrics
      metrics.record('websocket_ai_response_latency_ms', result.latency);
      metrics.record('websocket_messages_total', 1);

      logger.info('AI response generated', {
        connectionId,
        userId: connection.userId,
        textLength: text.length,
        responseLength: result.response.length,
        latency: result.latency,
      });

    } catch (error) {
      logger.error('Error generating AI response', { connectionId, error });
      this.sendError(connectionId, 'Error generating response');
    }
  }

  private async streamTTSAudio(connectionId: string, text: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      // Generate TTS audio
      const audioChunks = await this.engineManager.speakText(text);

      for await (const chunk of audioChunks) {
        this.sendMessage(connectionId, {
          type: 'voice_response',
          data: {
            audioData: chunk.data,
            isLast: chunk.isLast,
            timestamp: chunk.timestamp,
          },
          timestamp: Date.now(),
        });

        // Small delay to prevent overwhelming the client
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      logger.info('TTS audio streamed', { connectionId, textLength: text.length });

    } catch (error) {
      logger.error('Error streaming TTS audio', { connectionId, error });
      this.sendError(connectionId, 'Error generating speech');
    }
  }

  private sendMessage(connectionId: string, response: WebSocketResponse) {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      connection.ws.send(JSON.stringify(response));
    } catch (error) {
      logger.error('Error sending WebSocket message', { connectionId, error });
      this.handleDisconnection(connectionId);
    }
  }

  private sendError(connectionId: string, message: string, statusCode: number = 500) {
    this.sendMessage(connectionId, {
      type: 'error',
      data: {
        message,
        statusCode,
      },
      timestamp: Date.now(),
    });
  }

  private handleDisconnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    this.connections.delete(connectionId);

    logger.info('WebSocket connection closed', {
      connectionId,
      userId: connection.userId,
      totalConnections: this.connections.size,
    });

    // Record metrics
    metrics.record('websocket_connections_total', -1);
  }

  private startCleanupInterval() {
    // Clean up inactive connections every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const inactiveTimeout = 5 * 60 * 1000; // 5 minutes

      for (const [connectionId, connection] of this.connections.entries()) {
        if (now - connection.lastActivity > inactiveTimeout) {
          logger.info('Cleaning up inactive connection', { connectionId, userId: connection.userId });
          connection.ws.close();
          this.connections.delete(connectionId);
        }
      }
    }, 5 * 60 * 1000);
  }

  getStats() {
    return {
      totalConnections: this.connections.size,
      activeConnections: Array.from(this.connections.values()).filter(c => c.isListening).length,
      connections: Array.from(this.connections.values()).map(c => ({
        id: c.id,
        userId: c.userId,
        isListening: c.isListening,
        lastActivity: c.lastActivity,
      })),
    };
  }
}

export function setupWebSocketChat(fastify: FastifyInstance, engineManager: EngineManager) {
  const wsManager = new WebSocketChatManager(engineManager);

  // WebSocket endpoint
  fastify.get('/ws/chat', { websocket: true }, (connection, req) => {
    wsManager.handleConnection(connection, req);
  });

  // Stats endpoint
  fastify.get('/ws/stats', async (request, reply) => {
    return wsManager.getStats();
  });

  logger.info('WebSocket chat manager initialized');
}

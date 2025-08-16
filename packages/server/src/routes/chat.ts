import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EngineManager } from '../engines';
import { logger, metrics } from '@voice/observability';
import { AgentMessage, FeatureFlags } from '@voice/schemas';
import { userRateLimiter } from '../rate-limiter';
import { ErrorHandler } from '../error-handler';

interface ChatRequest {
  message: string;
  context?: string;
  conversationId?: string;
  userId?: string;
  language?: string;
  voiceSettings?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: string;
  };
  aiSettings?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    persona?: string;
  };
}

interface ChatResponse {
  response: string;
  conversationId: string;
  timestamp: string;
  latency: number;
  model: string;
  persona: string;
  metadata?: {
    confidence?: number;
    language?: string;
    tokens?: number;
  };
}

interface ConversationHistory {
  id: string;
  userId: string;
  messages: AgentMessage[];
  createdAt: string;
  updatedAt: string;
  metadata?: {
    language?: string;
    totalTokens?: number;
    duration?: number;
  };
}

// In-memory conversation storage (replace with database in production)
const conversations = new Map<string, ConversationHistory>();

export async function chatRoutes(fastify: FastifyInstance, engineManager: EngineManager) {
  // Get conversation history
  fastify.get('/chat/conversations/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;
      
      // Rate limiting
      const rateLimitResult = await userRateLimiter.checkUserLimit(userId, 'conversations');
      if (!rateLimitResult.allowed) {
        return reply.code(429).send({
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.resetTime - Date.now()
        });
      }

      const userConversations = Array.from(conversations.values())
        .filter(conv => conv.userId === userId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 50); // Limit to 50 most recent conversations

      return {
        conversations: userConversations,
        count: userConversations.length
      };
    } catch (error) {
      const errorResponse = ErrorHandler.createErrorResponse(error);
      return reply.code(errorResponse.error.statusCode).send(errorResponse);
    }
  });

  // Get specific conversation
  fastify.get('/chat/conversations/:userId/:conversationId', async (
    request: FastifyRequest<{ 
      Params: { userId: string; conversationId: string } 
    }>, 
    reply: FastifyReply
  ) => {
    try {
      const { userId, conversationId } = request.params;
      
      const conversation = conversations.get(conversationId);
      
      if (!conversation || conversation.userId !== userId) {
        return reply.code(404).send({ error: 'Conversation not found' });
      }

      return conversation;
    } catch (error) {
      const errorResponse = ErrorHandler.createErrorResponse(error);
      return reply.code(errorResponse.error.statusCode).send(errorResponse);
    }
  });

  // Send message and get AI response
  fastify.post('/chat/message', async (request: FastifyRequest<{ Body: ChatRequest }>, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const { 
        message, 
        context, 
        conversationId, 
        userId = 'anonymous',
        language = 'en-US',
        voiceSettings,
        aiSettings 
      } = request.body;

      // Validate input
      if (!message || typeof message !== 'string') {
        return reply.code(400).send({ error: 'Message is required and must be a string' });
      }

      // Rate limiting
      const rateLimitResult = await userRateLimiter.checkUserLimit(userId, 'chat');
      if (!rateLimitResult.allowed) {
        return reply.code(429).send({
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.resetTime - Date.now()
        });
      }

      // Get or create conversation
      let conversation: ConversationHistory;
      if (conversationId && conversations.has(conversationId)) {
        conversation = conversations.get(conversationId)!;
        if (conversation.userId !== userId) {
          return reply.code(403).send({ error: 'Access denied to conversation' });
        }
      } else {
        const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        conversation = {
          id: newConversationId,
          userId,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { language }
        };
        conversations.set(newConversationId, conversation);
      }

      // Add user message to conversation
      const userMessage: AgentMessage = {
        role: 'user',
        content: message,
      };
      conversation.messages.push(userMessage);

      // Generate AI response with enhanced context
      const enhancedContext = buildEnhancedContext(conversation, context, aiSettings);
      const result = await engineManager.generateAIResponse(message, enhancedContext);

      // Add AI response to conversation
      const aiMessage: AgentMessage = {
        role: 'assistant',
        content: result.response,
      };
      conversation.messages.push(aiMessage);

      // Update conversation metadata
      conversation.updatedAt = new Date().toISOString();
      conversation.metadata = {
        ...conversation.metadata,
        totalTokens: (conversation.metadata?.totalTokens || 0) + (result.latency || 0),
      };

      // Record metrics
      const totalLatency = Date.now() - startTime;
      metrics.record('chat_response_latency_ms', totalLatency);
      metrics.record('chat_messages_total', 1);
      metrics.record('chat_conversations_active', conversations.size);

      logger.info('Chat message processed', {
        userId,
        conversationId: conversation.id,
        messageLength: message.length,
        responseLength: result.response.length,
        latency: totalLatency,
        model: result.model
      });

      const response: ChatResponse = {
        response: result.response,
        conversationId: conversation.id,
        timestamp: new Date().toISOString(),
        latency: totalLatency,
        model: result.model,
        persona: result.persona,
        metadata: {
          confidence: 0.95, // Mock confidence score
          language,
          tokens: result.latency // Mock token count
        }
      };

      return response;
    } catch (error) {
      const errorResponse = ErrorHandler.createErrorResponse(error);
      return reply.code(errorResponse.error.statusCode).send(errorResponse);
    }
  });

  // Stream chat response
  fastify.post('/chat/stream', async (request: FastifyRequest<{ Body: ChatRequest }>, reply: FastifyReply) => {
    try {
      const { 
        message, 
        context, 
        conversationId, 
        userId = 'anonymous',
        language = 'en-US',
        aiSettings 
      } = request.body;

      // Validate input
      if (!message || typeof message !== 'string') {
        return reply.code(400).send({ error: 'Message is required and must be a string' });
      }

      // Rate limiting
      const rateLimitResult = await userRateLimiter.checkUserLimit(userId, 'chat_stream');
      if (!rateLimitResult.allowed) {
        return reply.code(429).send({
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.resetTime - Date.now()
        });
      }

      // Set up streaming response
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Send stream start event
      reply.raw.write(`data: ${JSON.stringify({
        type: 'stream_start',
        streamId,
        timestamp: new Date().toISOString()
      })}\n\n`);

      try {
        // Get or create conversation
        let conversation: ConversationHistory;
        if (conversationId && conversations.has(conversationId)) {
          conversation = conversations.get(conversationId)!;
          if (conversation.userId !== userId) {
            throw new Error('Access denied to conversation');
          }
        } else {
          const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          conversation = {
            id: newConversationId,
            userId,
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: { language }
          };
          conversations.set(newConversationId, conversation);
        }

        // Add user message
        const userMessage: AgentMessage = {
          role: 'user',
          content: message,
        };
        conversation.messages.push(userMessage);

        // Generate streaming response
        const enhancedContext = buildEnhancedContext(conversation, context, aiSettings);
        const result = await engineManager.generateAIResponse(message, enhancedContext);

        // Send response chunks
        const words = result.response.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = words.slice(0, i + 1).join(' ');
          
          reply.raw.write(`data: ${JSON.stringify({
            type: 'chunk',
            streamId,
            content: words[i],
            partial: chunk,
            isComplete: i === words.length - 1,
            timestamp: new Date().toISOString()
          })}\n\n`);

          // Small delay for streaming effect
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Add AI response to conversation
        const aiMessage: AgentMessage = {
          role: 'assistant',
          content: result.response,
        };
        conversation.messages.push(aiMessage);

        // Update conversation
        conversation.updatedAt = new Date().toISOString();

        // Send stream end event
        reply.raw.write(`data: ${JSON.stringify({
          type: 'stream_end',
          streamId,
          conversationId: conversation.id,
          model: result.model,
          persona: result.persona,
          timestamp: new Date().toISOString()
        })}\n\n`);

      } catch (error) {
        // Send error event
        reply.raw.write(`data: ${JSON.stringify({
          type: 'error',
          streamId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        })}\n\n`);
      }

      reply.raw.end();
    } catch (error) {
      const errorResponse = ErrorHandler.createErrorResponse(error);
      return reply.code(errorResponse.error.statusCode).send(errorResponse);
    }
  });

  // Delete conversation
  fastify.delete('/chat/conversations/:userId/:conversationId', async (
    request: FastifyRequest<{ 
      Params: { userId: string; conversationId: string } 
    }>, 
    reply: FastifyReply
  ) => {
    try {
      const { userId, conversationId } = request.params;
      
      const conversation = conversations.get(conversationId);
      
      if (!conversation || conversation.userId !== userId) {
        return reply.code(404).send({ error: 'Conversation not found' });
      }

      conversations.delete(conversationId);
      
      logger.info('Conversation deleted', { userId, conversationId });
      
      return { success: true, message: 'Conversation deleted' };
    } catch (error) {
      const errorResponse = ErrorHandler.createErrorResponse(error);
      return reply.code(errorResponse.error.statusCode).send(errorResponse);
    }
  });

  // Get chat statistics
  fastify.get('/chat/stats/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;
      
      const userConversations = Array.from(conversations.values())
        .filter(conv => conv.userId === userId);

      const totalMessages = userConversations.reduce((sum, conv) => sum + conv.messages.length, 0);
      const totalTokens = userConversations.reduce((sum, conv) => sum + (conv.metadata?.totalTokens || 0), 0);
      const avgMessagesPerConversation = userConversations.length > 0 ? totalMessages / userConversations.length : 0;

      return {
        totalConversations: userConversations.length,
        totalMessages,
        totalTokens,
        avgMessagesPerConversation: Math.round(avgMessagesPerConversation * 100) / 100,
        lastActivity: userConversations.length > 0 
          ? Math.max(...userConversations.map(c => new Date(c.updatedAt).getTime()))
          : null
      };
    } catch (error) {
      const errorResponse = ErrorHandler.createErrorResponse(error);
      return reply.code(errorResponse.error.statusCode).send(errorResponse);
    }
  });
}

// Helper function to build enhanced context
function buildEnhancedContext(
  conversation: ConversationHistory, 
  additionalContext?: string, 
  aiSettings?: ChatRequest['aiSettings']
): string {
  const recentMessages = conversation.messages.slice(-10); // Last 10 messages
  const conversationContext = recentMessages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  let context = `Conversation History:\n${conversationContext}\n\n`;
  
  if (additionalContext) {
    context += `Additional Context: ${additionalContext}\n\n`;
  }

  if (aiSettings?.persona) {
    context += `Persona: ${aiSettings.persona}\n`;
  }

  if (conversation.metadata?.language) {
    context += `Language: ${conversation.metadata.language}\n`;
  }

  return context;
}

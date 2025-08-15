import { logger } from '@voice/observability';
import { cacheService } from './cache';

export interface ConversationEvent {
  sessionId: string;
  userId?: string;
  eventType: 'start' | 'message' | 'response' | 'error' | 'end';
  timestamp: number;
  data: any;
  duration?: number;
}

export interface ConversationMetrics {
  totalConversations: number;
  averageDuration: number;
  totalMessages: number;
  averageResponseTime: number;
  errorRate: number;
  userSatisfaction: number;
  popularTopics: string[];
  peakUsageHours: number[];
}

export interface UserInsights {
  userId: string;
  totalSessions: number;
  averageSessionDuration: number;
  favoriteTopics: string[];
  usagePattern: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  responseQuality: number;
  lastActive: number;
}

export class AnalyticsService {
  private events: ConversationEvent[] = [];
  private readonly MAX_EVENTS = 10000; // Keep last 10k events in memory
  private readonly FLUSH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.startPeriodicFlush();
  }

  recordEvent(event: ConversationEvent): void {
    this.events.push(event);

    // Keep only the latest events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Log important events
    if (event.eventType === 'error') {
      logger.error('Analytics error event:', event);
    }
  }

  recordConversationStart(sessionId: string, userId?: string): void {
    this.recordEvent({
      sessionId,
      userId,
      eventType: 'start',
      timestamp: Date.now(),
      data: { sessionId },
    });
  }

  recordMessage(sessionId: string, userId: string, message: string, responseTime: number): void {
    this.recordEvent({
      sessionId,
      userId,
      eventType: 'message',
      timestamp: Date.now(),
      data: {
        message,
        responseTime,
        messageLength: message.length,
      },
    });
  }

  recordResponse(sessionId: string, userId: string, response: string, duration: number): void {
    this.recordEvent({
      sessionId,
      userId,
      eventType: 'response',
      timestamp: Date.now(),
      data: {
        response,
        duration,
        responseLength: response.length,
      },
    });
  }

  recordError(sessionId: string, userId: string, error: string, errorType: string): void {
    this.recordEvent({
      sessionId,
      userId,
      eventType: 'error',
      timestamp: Date.now(),
      data: {
        error,
        errorType,
      },
    });
  }

  recordConversationEnd(sessionId: string, userId: string, duration: number, messageCount: number): void {
    this.recordEvent({
      sessionId,
      userId,
      eventType: 'end',
      timestamp: Date.now(),
      data: {
        duration,
        messageCount,
      },
    });
  }

  getConversationMetrics(timeRange: { start: number; end: number }): ConversationMetrics {
    const eventsInRange = this.events.filter(
      event => event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    );

    const conversations = this.groupEventsBySession(eventsInRange);
    const totalConversations = conversations.size;

    let totalDuration = 0;
    let totalMessages = 0;
    let totalResponseTime = 0;
    let totalErrors = 0;
    let responseCount = 0;

    for (const [sessionId, sessionEvents] of conversations) {
      const startEvent = sessionEvents.find(e => e.eventType === 'start');
      const endEvent = sessionEvents.find(e => e.eventType === 'end');

      if (startEvent && endEvent) {
        totalDuration += endEvent.data.duration || 0;
      }

      const messages = sessionEvents.filter(e => e.eventType === 'message');
      const responses = sessionEvents.filter(e => e.eventType === 'response');
      const errors = sessionEvents.filter(e => e.eventType === 'error');

      totalMessages += messages.length;
      totalErrors += errors.length;
      responseCount += responses.length;

      responses.forEach(response => {
        totalResponseTime += response.data.duration || 0;
      });
    }

    const averageDuration = totalConversations > 0 ? totalDuration / totalConversations : 0;
    const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
    const errorRate = totalMessages > 0 ? totalErrors / totalMessages : 0;

    return {
      totalConversations,
      averageDuration,
      totalMessages,
      averageResponseTime,
      errorRate,
      userSatisfaction: this.calculateUserSatisfaction(eventsInRange),
      popularTopics: this.extractPopularTopics(eventsInRange),
      peakUsageHours: this.calculatePeakUsageHours(eventsInRange),
    };
  }

  getUserInsights(userId: string, timeRange: { start: number; end: number }): UserInsights {
    const userEvents = this.events.filter(
      event => event.userId === userId &&
      event.timestamp >= timeRange.start &&
      event.timestamp <= timeRange.end
    );

    const sessions = this.groupEventsBySession(userEvents);
    const totalSessions = sessions.size;

    let totalDuration = 0;
    let totalMessages = 0;
    let totalResponseTime = 0;
    let responseCount = 0;

    for (const [sessionId, sessionEvents] of sessions) {
      const endEvent = sessionEvents.find(e => e.eventType === 'end');
      if (endEvent) {
        totalDuration += endEvent.data.duration || 0;
      }

      const messages = sessionEvents.filter(e => e.eventType === 'message');
      const responses = sessionEvents.filter(e => e.eventType === 'response');

      totalMessages += messages.length;
      responseCount += responses.length;

      responses.forEach(response => {
        totalResponseTime += response.data.duration || 0;
      });
    }

    const averageSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
    const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

    return {
      userId,
      totalSessions,
      averageSessionDuration,
      favoriteTopics: this.extractUserTopics(userEvents),
      usagePattern: this.calculateUsagePattern(userEvents),
      responseQuality: this.calculateResponseQuality(userEvents),
      lastActive: Math.max(...userEvents.map(e => e.timestamp), 0),
    };
  }

  getSystemPerformance(timeRange: { start: number; end: number }): any {
    const eventsInRange = this.events.filter(
      event => event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    );

    const responseTimes = eventsInRange
      .filter(e => e.eventType === 'response')
      .map(e => e.data.duration || 0);

    const errors = eventsInRange.filter(e => e.eventType === 'error');
    const totalRequests = eventsInRange.filter(e => e.eventType === 'message').length;

    return {
      averageResponseTime: responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      errorRate: totalRequests > 0 ? errors.length / totalRequests : 0,
      totalRequests,
      totalErrors: errors.length,
      errorTypes: this.groupErrorsByType(errors),
    };
  }

  private groupEventsBySession(events: ConversationEvent[]): Map<string, ConversationEvent[]> {
    const sessions = new Map<string, ConversationEvent[]>();

    for (const event of events) {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, []);
      }
      sessions.get(event.sessionId)!.push(event);
    }

    return sessions;
  }

  private calculateUserSatisfaction(events: ConversationEvent[]): number {
    // Simplified satisfaction calculation based on conversation length and error rate
    const conversations = this.groupEventsBySession(events);
    let satisfaction = 0;
    let count = 0;

    for (const [sessionId, sessionEvents] of conversations) {
      const messages = sessionEvents.filter(e => e.eventType === 'message');
      const errors = sessionEvents.filter(e => e.eventType === 'error');
      const endEvent = sessionEvents.find(e => e.eventType === 'end');

      if (messages.length > 0 && endEvent) {
        const errorRate = errors.length / messages.length;
        const duration = endEvent.data.duration || 0;
        const messageCount = endEvent.data.messageCount || 0;

        // Higher satisfaction for longer conversations with fewer errors
        const sessionSatisfaction = Math.max(0,
          (1 - errorRate) * Math.min(1, messageCount / 10) * Math.min(1, duration / 300000)
        );

        satisfaction += sessionSatisfaction;
        count++;
      }
    }

    return count > 0 ? satisfaction / count : 0;
  }

  private extractPopularTopics(events: ConversationEvent[]): string[] {
    const messages = events
      .filter(e => e.eventType === 'message')
      .map(e => e.data.message || '')
      .filter(msg => msg.length > 0);

    // Simple keyword extraction (in a real implementation, use NLP)
    const keywords = new Map<string, number>();

    for (const message of messages) {
      const words = message.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 3) { // Filter out short words
          keywords.set(word, (keywords.get(word) || 0) + 1);
        }
      }
    }

    return Array.from(keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private extractUserTopics(events: ConversationEvent[]): string[] {
    return this.extractPopularTopics(events);
  }

  private calculatePeakUsageHours(events: ConversationEvent[]): number[] {
    const hourCounts = new Array(24).fill(0);

    for (const event of events) {
      const hour = new Date(event.timestamp).getHours();
      hourCounts[hour]++;
    }

    const maxCount = Math.max(...hourCounts);
    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter(({ count }) => count >= maxCount * 0.8) // Hours with 80%+ of peak usage
      .map(({ hour }) => hour);
  }

  private calculateUsagePattern(events: ConversationEvent[]): { daily: number; weekly: number; monthly: number } {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;

    const daily = events.filter(e => now - e.timestamp < dayMs).length;
    const weekly = events.filter(e => now - e.timestamp < weekMs).length;
    const monthly = events.filter(e => now - e.timestamp < monthMs).length;

    return { daily, weekly, monthly };
  }

  private calculateResponseQuality(events: ConversationEvent[]): number {
    const responses = events.filter(e => e.eventType === 'response');
    if (responses.length === 0) return 0;

    let totalQuality = 0;
    for (const response of responses) {
      const duration = response.data.duration || 0;
      const length = response.data.responseLength || 0;

      // Quality based on response time and length (simplified)
      const timeQuality = Math.max(0, 1 - duration / 10000); // Prefer faster responses
      const lengthQuality = Math.min(1, length / 100); // Prefer longer responses

      totalQuality += (timeQuality + lengthQuality) / 2;
    }

    return totalQuality / responses.length;
  }

  private groupErrorsByType(errors: ConversationEvent[]): Record<string, number> {
    const errorTypes: Record<string, number> = {};

    for (const error of errors) {
      const type = error.data.errorType || 'unknown';
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    }

    return errorTypes;
  }

  private async startPeriodicFlush(): Promise<void> {
    setInterval(async () => {
      await this.flushToStorage();
    }, this.FLUSH_INTERVAL);
  }

  private async flushToStorage(): Promise<void> {
    try {
      const key = `analytics:events:${Date.now()}`;
      await cacheService.set(key, JSON.stringify(this.events), 86400 * 7); // 7 days

      // Clear memory after flushing
      this.events = [];

      logger.info('📊 Analytics data flushed to storage');
    } catch (error) {
      logger.error('Failed to flush analytics data:', error);
    }
  }

  getStats(): any {
    const now = Date.now();
    const last24Hours = { start: now - 24 * 60 * 60 * 1000, end: now };

    return {
      totalEvents: this.events.length,
      last24Hours: this.getConversationMetrics(last24Hours),
      systemPerformance: this.getSystemPerformance(last24Hours),
    };
  }
}

export const analyticsService = new AnalyticsService();

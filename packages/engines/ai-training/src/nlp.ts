import {
    ConversationContext,
    ConversationTurn,
    Entity,
    Intent,
    NLPAnalysis
} from './types';

export class NLPProcessor {
  private intents: Map<string, Intent> = new Map();
  private conversationContexts: Map<string, ConversationContext> = new Map();

  constructor() {
    this.initializeDefaultIntents();
  }

  private initializeDefaultIntents(): void {
    const defaultIntents: Intent[] = [
      {
        id: 'greeting',
        name: 'Greeting',
        description: 'User is greeting the assistant',
        examples: [
          'Hello',
          'Hi',
          'Good morning',
          'Good afternoon',
          'Good evening',
          'Hey there',
          'How are you?'
        ],
        confidence: 0.9,
        entities: []
      },
      {
        id: 'farewell',
        name: 'Farewell',
        description: 'User is saying goodbye',
        examples: [
          'Goodbye',
          'Bye',
          'See you later',
          'Take care',
          'Have a good day',
          'Good night'
        ],
        confidence: 0.9,
        entities: []
      },
      {
        id: 'weather_query',
        name: 'Weather Query',
        description: 'User is asking about weather',
        examples: [
          'What is the weather like?',
          'How is the weather today?',
          'Is it going to rain?',
          'What is the temperature?',
          'Weather forecast'
        ],
        confidence: 0.85,
        entities: [
          {
            id: 'location',
            name: 'location',
            type: 'location',
            value: '',
            confidence: 0.8,
            start: 0,
            end: 0
          }
        ]
      },
      {
        id: 'time_query',
        name: 'Time Query',
        description: 'User is asking about time',
        examples: [
          'What time is it?',
          'What is the current time?',
          'Time please',
          'Tell me the time'
        ],
        confidence: 0.9,
        entities: []
      },
      {
        id: 'help_request',
        name: 'Help Request',
        description: 'User is asking for help',
        examples: [
          'Help',
          'I need help',
          'Can you help me?',
          'What can you do?',
          'How do I use this?'
        ],
        confidence: 0.8,
        entities: []
      }
    ];

    defaultIntents.forEach(intent => {
      this.intents.set(intent.id, intent);
    });
  }

  async analyzeText(text: string, sessionId?: string): Promise<NLPAnalysis> {
    const normalizedText = text.toLowerCase().trim();

    // Intent recognition
    const recognizedIntents = await this.recognizeIntents(normalizedText);

    // Entity extraction
    const entities = await this.extractEntities(normalizedText);

    // Sentiment analysis
    const sentiment = await this.analyzeSentiment(normalizedText);

    // Language detection (simplified)
    const language = await this.detectLanguage(normalizedText);

    // Overall confidence
    const confidence = recognizedIntents.length > 0
      ? Math.max(...recognizedIntents.map(i => i.confidence))
      : 0.5;

    const analysis: NLPAnalysis = {
      text,
      intents: recognizedIntents,
      entities,
      sentiment,
      language,
      confidence
    };

    // Update conversation context if sessionId is provided
    if (sessionId) {
      await this.updateConversationContext(sessionId, analysis);
    }

    return analysis;
  }

  private async recognizeIntents(text: string): Promise<Intent[]> {
    const recognizedIntents: Intent[] = [];

    for (const intent of this.intents.values()) {
      const confidence = this.calculateIntentConfidence(text, intent);
      if (confidence > 0.6) {
        recognizedIntents.push({
          ...intent,
          confidence
        });
      }
    }

    // Sort by confidence (highest first)
    return recognizedIntents.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateIntentConfidence(text: string, intent: Intent): number {
    let maxConfidence = 0;

    for (const example of intent.examples) {
      const exampleLower = example.toLowerCase();

      // Exact match
      if (text === exampleLower) {
        maxConfidence = Math.max(maxConfidence, 0.95);
        continue;
      }

      // Contains example
      if (text.includes(exampleLower) || exampleLower.includes(text)) {
        maxConfidence = Math.max(maxConfidence, 0.8);
        continue;
      }

      // Word overlap
      const textWords = text.split(/\s+/);
      const exampleWords = exampleLower.split(/\s+/);
      const commonWords = textWords.filter(word => exampleWords.includes(word));

      if (commonWords.length > 0) {
        const overlapRatio = commonWords.length / Math.max(textWords.length, exampleWords.length);
        maxConfidence = Math.max(maxConfidence, overlapRatio * 0.7);
      }
    }

    return maxConfidence;
  }

  private async extractEntities(text: string): Promise<Entity[]> {
    const entities: Entity[] = [];

    // Extract time entities
    const timePatterns = [
      /\b\d{1,2}:\d{2}\s*(am|pm)?\b/gi,
      /\b\d{1,2}\s*(am|pm)\b/gi,
      /\b(morning|afternoon|evening|night)\b/gi
    ];

    timePatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        entities.push({
          id: `time_${Date.now()}_${Math.random()}`,
          name: 'time',
          type: 'time',
          value: match[0],
          confidence: 0.9,
          start: match.index || 0,
          end: (match.index || 0) + match[0].length
        });
      }
    });

    // Extract date entities
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
      /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g,
      /\b(today|tomorrow|yesterday|next week|last week)\b/gi
    ];

    datePatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        entities.push({
          id: `date_${Date.now()}_${Math.random()}`,
          name: 'date',
          type: 'date',
          value: match[0],
          confidence: 0.9,
          start: match.index || 0,
          end: (match.index || 0) + match[0].length
        });
      }
    });

    // Extract number entities
    const numberPattern = /\b\d+(\.\d+)?\b/g;
    const numberMatches = text.matchAll(numberPattern);
    for (const match of numberMatches) {
      entities.push({
        id: `number_${Date.now()}_${Math.random()}`,
        name: 'number',
        type: 'number',
        value: match[0],
        confidence: 0.95,
        start: match.index || 0,
        end: (match.index || 0) + match[0].length
      });
    }

    return entities;
  }

  private async analyzeSentiment(text: string): Promise<{
    score: number;
    label: 'positive' | 'neutral' | 'negative';
    confidence: number;
  }> {
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'love', 'like', 'happy', 'joy', 'pleased', 'satisfied', 'perfect'
    ];

    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike',
      'sad', 'angry', 'frustrated', 'disappointed', 'upset', 'worried'
    ];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });

    const total = words.length;
    const positiveScore = positiveCount / total;
    const negativeScore = negativeCount / total;
    const neutralScore = 1 - positiveScore - negativeScore;

    let label: 'positive' | 'neutral' | 'negative';
    let score: number;
    let confidence: number;

    if (positiveScore > negativeScore && positiveScore > neutralScore) {
      label = 'positive';
      score = positiveScore;
      confidence = 0.7 + positiveScore * 0.3;
    } else if (negativeScore > positiveScore && negativeScore > neutralScore) {
      label = 'negative';
      score = negativeScore;
      confidence = 0.7 + negativeScore * 0.3;
    } else {
      label = 'neutral';
      score = neutralScore;
      confidence = 0.8;
    }

    return { score, label, confidence };
  }

  private async detectLanguage(text: string): Promise<string> {
    // Simplified language detection
    // In a real implementation, you would use a proper language detection library

    const portugueseWords = ['olá', 'oi', 'bom', 'boa', 'como', 'está', 'você', 'não', 'sim'];
    const spanishWords = ['hola', 'bueno', 'como', 'estás', 'tú', 'no', 'sí'];

    const words = text.toLowerCase().split(/\s+/);

    const portugueseCount = words.filter(word => portugueseWords.includes(word)).length;
    const spanishCount = words.filter(word => spanishWords.includes(word)).length;

    if (portugueseCount > spanishCount && portugueseCount > 0) {
      return 'pt-BR';
    } else if (spanishCount > 0) {
      return 'es';
    } else {
      return 'en';
    }
  }

  private async updateConversationContext(
    sessionId: string,
    analysis: NLPAnalysis
  ): Promise<void> {
    let context = this.conversationContexts.get(sessionId);

    if (!context) {
      context = {
        sessionId,
        userId: 'unknown',
        history: [],
        entities: [],
        sentiment: 'neutral',
        confidence: 0.5
      };
      this.conversationContexts.set(sessionId, context);
    }

    // Add new turn to history
    const turn: ConversationTurn = {
      id: `turn_${Date.now()}`,
      timestamp: new Date(),
      speaker: 'user',
      message: analysis.text,
      intent: analysis.intents[0],
      entities: analysis.entities,
      confidence: analysis.confidence
    };

    context.history.push(turn);

    // Update context
    context.currentIntent = analysis.intents[0];
    context.entities = [...context.entities, ...analysis.entities];
    context.sentiment = analysis.sentiment.label;
    context.confidence = analysis.confidence;

    // Keep only last 10 turns for memory management
    if (context.history.length > 10) {
      context.history = context.history.slice(-10);
    }
  }

  async getConversationContext(sessionId: string): Promise<ConversationContext | null> {
    return this.conversationContexts.get(sessionId) || null;
  }

  async addIntent(intent: Omit<Intent, 'id'>): Promise<Intent> {
    const newIntent: Intent = {
      ...intent,
      id: `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.intents.set(newIntent.id, newIntent);
    return newIntent;
  }

  async getIntent(intentId: string): Promise<Intent | null> {
    return this.intents.get(intentId) || null;
  }

  async getAllIntents(): Promise<Intent[]> {
    return Array.from(this.intents.values());
  }

  async updateIntent(intentId: string, updates: Partial<Intent>): Promise<Intent | null> {
    const intent = this.intents.get(intentId);
    if (!intent) return null;

    const updatedIntent = { ...intent, ...updates };
    this.intents.set(intentId, updatedIntent);
    return updatedIntent;
  }

  async deleteIntent(intentId: string): Promise<boolean> {
    return this.intents.delete(intentId);
  }

  async clearConversationContext(sessionId: string): Promise<void> {
    this.conversationContexts.delete(sessionId);
  }
}

import { logger } from '@voice/observability';
import { GonPersona, Language } from '@voice/schemas';

export class PersonaManager {
  private currentPersona: GonPersona;
  private conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }> = [];

  constructor() {
    // Initialize Gon as the default persona
    this.currentPersona = {
      name: 'Gon',
      personality: 'Friendly, enthusiastic, and helpful Brazilian assistant with a warm personality',
      language: 'pt-BR',
      voice: 'pt_BR-amy-low',
      greeting: 'Oi! Tudo bem? Eu sou o Gon, seu assistente pessoal! Como posso te ajudar hoje?',
      farewell: 'Até logo! Foi um prazer te ajudar!',
      traits: [
        'Friendly and warm',
        'Enthusiastic about helping',
        'Uses Brazilian Portuguese naturally',
        'Loves technology and innovation',
        'Patient and understanding',
        'Has a sense of humor'
      ],
      interests: [
        'Technology and AI',
        'Brazilian culture',
        'Helping people',
        'Learning new things',
        'Music and creativity'
      ],
      speakingStyle: 'Natural Brazilian Portuguese with occasional friendly slang and expressions',
    };

    logger.info('🎭 Gon persona initialized');
  }

  // Get Gon's system prompt
  getSystemPrompt(): string {
    return `Você é o Gon, um assistente pessoal brasileiro muito amigável e entusiasta.

PERSONALIDADE:
- Você é caloroso, prestativo e tem um senso de humor leve
- Fala português brasileiro de forma natural e coloquial
- Usa gírias brasileiras ocasionalmente (como "beleza", "valeu", "massa", "daora")
- É paciente e entende bem as pessoas
- Adora tecnologia e inovação
- Tem interesse em cultura brasileira

ESTILO DE FALA:
- Respostas curtas e naturais para interação por voz
- Tom amigável e acolhedor
- Usa expressões brasileiras quando apropriado
- Mantém o entusiasmo e energia positiva
- Responde como se fosse um amigo brasileiro conversando

INTERESSES:
- Tecnologia e IA
- Cultura brasileira
- Ajudar pessoas
- Aprender coisas novas
- Música e criatividade

Lembre-se: Você é o Gon, não um assistente genérico. Mantenha sua personalidade única e brasileira em todas as respostas!`;
  }

  // Get Gon's greeting
  getGreeting(): string {
    return this.currentPersona.greeting;
  }

  // Get Gon's farewell
  getFarewell(): string {
    return this.currentPersona.farewell;
  }

  // Add conversation to history
  addToHistory(role: 'user' | 'assistant', content: string) {
    this.conversationHistory.push({
      role,
      content,
      timestamp: new Date(),
    });

    // Keep only last 10 conversations to manage memory
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }
  }

  // Get conversation context
  getConversationContext(): string {
    if (this.conversationHistory.length === 0) {
      return '';
    }

    const recentConversations = this.conversationHistory
      .slice(-5) // Last 5 conversations
      .map(conv => `${conv.role}: ${conv.content}`)
      .join('\n');

    return `Contexto da conversa recente:\n${recentConversations}`;
  }

  // Get Gon's personality traits
  getTraits(): string[] {
    return this.currentPersona.traits;
  }

  // Get Gon's interests
  getInterests(): string[] {
    return this.currentPersona.interests;
  }

  // Get current persona
  getCurrentPersona(): GonPersona {
    return this.currentPersona;
  }

  // Update persona (for future customization)
  updatePersona(updates: Partial<GonPersona>) {
    this.currentPersona = { ...this.currentPersona, ...updates };
    logger.info('🎭 Gon persona updated', updates);
  }

  // Get language
  getLanguage(): Language {
    return this.currentPersona.language;
  }

  // Get voice configuration
  getVoice(): string {
    return this.currentPersona.voice;
  }

  // Generate contextual response
  generateContextualResponse(userMessage: string): string {
    const context = this.getConversationContext();
    const systemPrompt = this.getSystemPrompt();

    return `${systemPrompt}

${context ? `Contexto da conversa:\n${context}\n` : ''}

Usuário: ${userMessage}

Gon:`;
  }

  // Check if message is a greeting
  isGreeting(message: string): boolean {
    const greetings = [
      'oi', 'olá', 'bom dia', 'boa tarde', 'boa noite',
      'hey', 'hi', 'hello', 'good morning', 'good afternoon', 'good evening'
    ];

    const lowerMessage = message.toLowerCase().trim();

    // Only return true if the message is primarily a greeting
    // Check if the message starts with a greeting or is very short
    return greetings.some(greeting =>
      lowerMessage.startsWith(greeting) ||
      (lowerMessage.length < 20 && lowerMessage.includes(greeting))
    );
  }

  // Check if message is a farewell
  isFarewell(message: string): boolean {
    const farewells = [
      'tchau', 'até logo', 'até mais', 'até a próxima', 'bye', 'goodbye',
      'see you', 'see you later', 'take care'
    ];

    return farewells.some(farewell =>
      message.toLowerCase().includes(farewell)
    );
  }

  // Get appropriate response for greetings/farewells
  getAppropriateResponse(message: string): string | null {
    if (this.isGreeting(message)) {
      return this.getGreeting();
    }

    if (this.isFarewell(message)) {
      return this.getFarewell();
    }

    return null;
  }
}

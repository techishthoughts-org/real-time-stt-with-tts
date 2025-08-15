import { beforeEach, describe, expect, it } from 'vitest';
import { NLPProcessor } from './nlp';

describe('NLPProcessor', () => {
  let nlp: NLPProcessor;

  beforeEach(() => {
    nlp = new NLPProcessor();
  });

  describe('analyzeText', () => {
    it('should analyze greeting text correctly', async () => {
      const analysis = await nlp.analyzeText('Hello, how are you?');

      expect(analysis).toBeDefined();
      expect(analysis.text).toBe('Hello, how are you?');
      expect(analysis.intents.length).toBeGreaterThan(0);
      expect(analysis.intents[0].name).toBe('Greeting');
      expect(analysis.confidence).toBeGreaterThan(0.6);
      expect(analysis.language).toBe('en');
    });

    it('should analyze weather query correctly', async () => {
      const analysis = await nlp.analyzeText('What is the weather like today?');

      expect(analysis.intents.length).toBeGreaterThan(0);
      expect(analysis.intents[0].name).toBe('Weather Query');
      expect(analysis.confidence).toBeGreaterThan(0.6);
    });

    it('should extract time entities', async () => {
      const analysis = await nlp.analyzeText('What time is it? It is 3:30 PM');

      expect(analysis.entities.length).toBeGreaterThan(0);
      const timeEntity = analysis.entities.find(e => e.type === 'time');
      expect(timeEntity).toBeDefined();
      expect(timeEntity?.value).toBe('3:30 PM');
    });

    it('should extract date entities', async () => {
      const analysis = await nlp.analyzeText('Meeting tomorrow at 2 PM');

      expect(analysis.entities.length).toBeGreaterThan(0);
      const dateEntity = analysis.entities.find(e => e.type === 'date');
      expect(dateEntity).toBeDefined();
      expect(dateEntity?.value).toBe('tomorrow');
    });

    it('should extract number entities', async () => {
      const analysis = await nlp.analyzeText('I need 5 apples and 3 oranges');

      expect(analysis.entities.length).toBeGreaterThan(0);
      const numberEntities = analysis.entities.filter(e => e.type === 'number');
      expect(numberEntities.length).toBe(2);
      expect(numberEntities[0].value).toBe('5');
      expect(numberEntities[1].value).toBe('3');
    });

    it('should analyze sentiment correctly', async () => {
      const positiveAnalysis = await nlp.analyzeText('I love this amazing product!');
      expect(positiveAnalysis.sentiment.label).toBe('positive');

      const negativeAnalysis = await nlp.analyzeText('I hate this terrible service');
      expect(negativeAnalysis.sentiment.label).toBe('negative');

      const neutralAnalysis = await nlp.analyzeText('What time is it?');
      expect(neutralAnalysis.sentiment.label).toBe('neutral');
    });

    it('should detect Portuguese language', async () => {
      const analysis = await nlp.analyzeText('Olá, como você está?');
      expect(analysis.language).toBe('pt-BR');
    });

    it('should detect Spanish language', async () => {
      const analysis = await nlp.analyzeText('Hola, ¿cómo estás?');
      expect(analysis.language).toBe('es');
    });
  });

  describe('conversation context', () => {
    it('should create and update conversation context', async () => {
      const sessionId = 'test-session-123';

      const analysis1 = await nlp.analyzeText('Hello', sessionId);
      const context1 = await nlp.getConversationContext(sessionId);

      expect(context1).toBeDefined();
      expect(context1?.sessionId).toBe(sessionId);
      expect(context1?.history.length).toBe(1);
      expect(context1?.history[0].message).toBe('Hello');

      const analysis2 = await nlp.analyzeText('How are you?', sessionId);
      const context2 = await nlp.getConversationContext(sessionId);

      expect(context2?.history.length).toBe(2);
      expect(context2?.history[1].message).toBe('How are you?');
    });

    it('should limit conversation history to 10 turns', async () => {
      const sessionId = 'test-session-456';

      // Add 12 turns
      for (let i = 1; i <= 12; i++) {
        await nlp.analyzeText(`Message ${i}`, sessionId);
      }

      const context = await nlp.getConversationContext(sessionId);
      expect(context?.history.length).toBe(10);
      expect(context?.history[0].message).toBe('Message 3'); // First 2 should be removed
      expect(context?.history[9].message).toBe('Message 12');
    });
  });

  describe('intent management', () => {
    it('should add new intent', async () => {
      const newIntent = await nlp.addIntent({
        name: 'Custom Intent',
        description: 'A custom intent for testing',
        examples: ['custom example', 'test example'],
        confidence: 0.8,
        entities: []
      });

      expect(newIntent).toBeDefined();
      expect(newIntent.name).toBe('Custom Intent');
      expect(newIntent.id).toBeDefined();

      const retrievedIntent = await nlp.getIntent(newIntent.id);
      expect(retrievedIntent).toEqual(newIntent);
    });

    it('should get all intents', async () => {
      const intents = await nlp.getAllIntents();
      expect(Array.isArray(intents)).toBe(true);
      expect(intents.length).toBeGreaterThan(0);
    });

    it('should update intent', async () => {
      const intents = await nlp.getAllIntents();
      const firstIntent = intents[0];

      const updatedIntent = await nlp.updateIntent(firstIntent.id, {
        description: 'Updated description'
      });

      expect(updatedIntent).toBeDefined();
      expect(updatedIntent?.description).toBe('Updated description');
    });

    it('should delete intent', async () => {
      const intents = await nlp.getAllIntents();
      const firstIntent = intents[0];

      const deleted = await nlp.deleteIntent(firstIntent.id);
      expect(deleted).toBe(true);

      const retrievedIntent = await nlp.getIntent(firstIntent.id);
      expect(retrievedIntent).toBeNull();
    });
  });

  describe('conversation context management', () => {
    it('should clear conversation context', async () => {
      const sessionId = 'test-session-clear';

      await nlp.analyzeText('Hello', sessionId);
      const context1 = await nlp.getConversationContext(sessionId);
      expect(context1).toBeDefined();

      await nlp.clearConversationContext(sessionId);
      const context2 = await nlp.getConversationContext(sessionId);
      expect(context2).toBeNull();
    });
  });
});

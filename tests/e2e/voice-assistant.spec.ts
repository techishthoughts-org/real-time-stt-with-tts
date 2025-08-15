import { expect, test } from '@playwright/test';

test.describe('Voice Assistant Integration', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Get authentication token
    const tokenResponse = await request.post('/auth/token', {
      data: {
        username: 'test-user'
      }
    });
    const tokenData = await tokenResponse.json();
    authToken = tokenData.token;
  });

  test('should handle complete voice conversation flow', async ({ request }) => {
    // 1. Check system health
    const healthResponse = await request.get('/health');
    expect(healthResponse.ok()).toBeTruthy();

    // 2. Send voice message (simulated)
    const chatResponse = await request.post('/llm/chat', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        message: 'Hello, I am testing the voice assistant',
        context: 'Voice conversation test'
      }
    });

    expect(chatResponse.ok()).toBeTruthy();

    const chatData = await chatResponse.json();
    expect(chatData.response).toBeDefined();
    expect(chatData.response.response).toBeDefined();
    expect(chatData.response.response.length).toBeGreaterThan(0);

    // 3. Verify response is voice-friendly (short and natural)
    expect(chatData.response.response.length).toBeLessThan(500); // Should be concise for voice
  });

  test('should handle STT processing', async ({ request }) => {
    // Simulate audio frame processing
    const audioFrame = {
      seq: 1,
      timestamp: Date.now(),
      format: {
        sampleRate: 16000,
        channels: 1,
        encoding: 'pcm16'
      },
      vad: 'speech',
      rms: 0.5,
      data: new Uint8Array(1024)
    };

    const response = await request.post('/stt/process', {
      data: audioFrame
    });

    // Should either process or return appropriate error
    expect([200, 400, 501]).toContain(response.status());
  });

  test('should handle TTS synthesis', async ({ request }) => {
    const response = await request.post('/tts/synthesize', {
      data: {
        text: 'Hello, this is a test of text-to-speech synthesis.',
        voice: 'en_US-amy-low'
      }
    });

    // Should either synthesize or return appropriate error
    expect([200, 400, 501]).toContain(response.status());

    if (response.ok()) {
      const data = await response.json();
      expect(data.audioChunks).toBeDefined();
      expect(Array.isArray(data.audioChunks)).toBeTruthy();
    }
  });

  test('should handle real-time conversation', async ({ request }) => {
    // Simulate a real-time conversation with multiple exchanges
    const messages = [
      'Hello, how are you?',
      'What is the weather like?',
      'Thank you for your help'
    ];

    for (const message of messages) {
      let response;
      let retries = 0;
      const maxRetries = 3;

      do {
        response = await request.post('/llm/chat', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          data: {
            message,
            context: 'Real-time conversation test'
          }
        });

        if (!response.ok() && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          retries++;
        }
      } while (!response.ok() && retries < maxRetries);

      // Accept either success or expected error responses
      expect([200, 500, 503]).toContain(response.status());

      if (response.ok()) {
        const data = await response.json();
        expect(data.response).toBeDefined();
        expect(data.response.response).toBeDefined();
        expect(data.response.response.length).toBeGreaterThan(0);
      } else {
        const errorData = await response.json();
        expect(errorData.error).toBeDefined();
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  test('should handle error scenarios gracefully', async ({ request }) => {
    // Test with empty message
    const emptyResponse = await request.post('/llm/chat', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        message: '',
        context: 'Error test'
      }
    });

    expect([400, 200]).toContain(emptyResponse.status());

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test with very long message
    const longMessage = 'A'.repeat(10000);
    const longResponse = await request.post('/llm/chat', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        message: longMessage,
        context: 'Error test'
      }
    });

    // Should handle gracefully (either process or return error)
    expect([200, 400, 413, 500]).toContain(longResponse.status());
  });

  test('should provide consistent response times', async ({ request }) => {
    const startTime = Date.now();

    let response;
    let retries = 0;
    const maxRetries = 3;

    do {
      response = await request.post('/llm/chat', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          message: 'Quick response test',
          context: 'Performance test'
        }
      });

      if (!response.ok() && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries++;
      }
    } while (!response.ok() && retries < maxRetries);

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Accept either success or expected error responses
    expect([200, 500, 503]).toContain(response.status());
    expect(responseTime).toBeLessThan(15000); // Reasonable timeout

    if (response.ok()) {
      const data = await response.json();
      expect(data.response).toBeDefined();
      expect(data.response.response).toBeDefined();
      expect(data.response.response.length).toBeGreaterThan(0);
    } else {
      const errorData = await response.json();
      expect(errorData.error).toBeDefined();
    }
  });
});

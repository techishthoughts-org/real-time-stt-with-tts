import { expect, test } from '@playwright/test';

test.describe('LLM API Endpoints', () => {
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

  test('should handle LLM chat request', async ({ request }) => {
    const response = await request.post('/llm/chat', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        message: 'Hello, how are you?',
        context: 'Test conversation'
      }
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.response).toBeDefined();
    expect(data.response.response).toBeDefined();
    expect(typeof data.response.response).toBe('string');
    expect(data.response.response.length).toBeGreaterThan(0);
  });

  test('should handle streaming LLM response', async ({ request }) => {
    const response = await request.post('/llm/chat/stream', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        message: 'Tell me a short story',
        context: 'Test streaming'
      }
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.streamId).toBeDefined();
    expect(typeof data.streamId).toBe('string');
  });

  test('should validate required fields', async ({ request }) => {
    const response = await request.post('/llm/chat', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        // Missing message field
        context: 'Test validation'
      }
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  test('should handle authentication', async ({ request }) => {
    // Test without authentication
    const response = await request.post('/llm/chat', {
      data: {
        message: 'Hello'
      }
    });

    // Should require authentication
    expect(response.status()).toBe(401);
  });

  test('should handle rate limiting', async ({ request }) => {
    const requests = Array.from({ length: 10 }, () =>
      request.post('/llm/chat', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          message: 'Rate limit test'
        }
      })
    );

    const responses = await Promise.all(requests);
    const statusCodes = responses.map(r => r.status());

    // Should not all be 429 (rate limited)
    expect(statusCodes.some(code => code !== 429)).toBeTruthy();
  });
});

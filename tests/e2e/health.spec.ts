import { expect, test } from '@playwright/test';

test.describe('Health Endpoints', () => {
  test('should respond to basic health check', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
    expect(data.version).toBeDefined();
    expect(data.environment).toBeDefined();
    expect(data.features).toBeDefined();
  });

  test('should respond to liveness probe', async ({ request }) => {
    const response = await request.get('/health/live');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('alive');
    expect(data.timestamp).toBeDefined();
  });

  test('should respond to readiness probe', async ({ request }) => {
    const response = await request.get('/health/ready');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ready');
    expect(data.timestamp).toBeDefined();
    expect(data.checks).toBeDefined();
    expect(data.checks.server).toBe('ok');
  });

  test('should respond to LLM health check', async ({ request }) => {
    const response = await request.get('/llm/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
    expect(data.provider).toBe('OpenRouter');
    expect(data.features).toBeDefined();
  });
});

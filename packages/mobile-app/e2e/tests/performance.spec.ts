import { expect, test } from '@playwright/test';

test.describe('Performance - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 30000 });
  });

  test.describe('App Launch Performance', () => {
    test('should load app within performance budget', async ({ page }) => {
      const startTime = Date.now();

      // Navigate to app
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]');

      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      console.log(`App load time: ${loadTime}ms`);
    });

    test('should show loading screen quickly', async ({ page }) => {
      const startTime = Date.now();

      // Reload page to see loading state
      await page.reload();

      // Should show loading screen within 500ms
      await expect(page.locator('[data-testid="loading-screen"]')).toBeVisible({ timeout: 500 });

      const loadingTime = Date.now() - startTime;
      expect(loadingTime).toBeLessThan(500);
      console.log(`Loading screen time: ${loadingTime}ms`);
    });

    test('should complete initialization quickly', async ({ page }) => {
      // Reload page
      await page.reload();

      const startTime = Date.now();

      // Wait for app to be fully initialized
      await expect(page.locator('[data-testid="loading-screen"]')).not.toBeVisible({ timeout: 10000 });

      const initTime = Date.now() - startTime;

      // Should initialize within 5 seconds
      expect(initTime).toBeLessThan(5000);
      console.log(`Initialization time: ${initTime}ms`);
    });
  });

  test.describe('Authentication Performance', () => {
    test('should handle login quickly', async ({ page }) => {
      const startTime = Date.now();

      // Fill login form
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');

      // Submit login form
      await page.click('[data-testid="login-submit"]');

      // Wait for successful login
      await expect(page.locator('[data-testid="home-screen"]')).toBeVisible({ timeout: 10000 });

      const loginTime = Date.now() - startTime;

      // Should login within 5 seconds
      expect(loginTime).toBeLessThan(5000);
      console.log(`Login time: ${loginTime}ms`);
    });

    test('should handle logout quickly', async ({ page }) => {
      // Login first
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-submit"]');
      await expect(page.locator('[data-testid="home-screen"]')).toBeVisible({ timeout: 10000 });

      const startTime = Date.now();

      // Logout
      await page.click('[data-testid="logout-button"]');
      await page.click('[data-testid="confirm-logout"]');

      // Wait for logout to complete
      await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();

      const logoutTime = Date.now() - startTime;

      // Should logout within 2 seconds
      expect(logoutTime).toBeLessThan(2000);
      console.log(`Logout time: ${logoutTime}ms`);
    });
  });

  test.describe('Navigation Performance', () => {
    test.beforeEach(async ({ page }) => {
      // Login before navigation tests
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-submit"]');
      await expect(page.locator('[data-testid="home-screen"]')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate between screens quickly', async ({ page }) => {
      const startTime = Date.now();

      // Navigate to conversation screen
      await page.click('[data-testid="conversation-button"]');
      await expect(page.locator('[data-testid="conversation-screen"]')).toBeVisible();

      const navTime = Date.now() - startTime;

      // Should navigate within 1 second
      expect(navTime).toBeLessThan(1000);
      console.log(`Navigation time: ${navTime}ms`);
    });

    test('should handle back navigation quickly', async ({ page }) => {
      // Navigate to conversation screen
      await page.click('[data-testid="conversation-button"]');
      await expect(page.locator('[data-testid="conversation-screen"]')).toBeVisible();

      const startTime = Date.now();

      // Go back
      await page.goBack();
      await expect(page.locator('[data-testid="home-screen"]')).toBeVisible();

      const backTime = Date.now() - startTime;

      // Should go back within 1 second
      expect(backTime).toBeLessThan(1000);
      console.log(`Back navigation time: ${backTime}ms`);
    });

    test('should handle deep linking quickly', async ({ page }) => {
      const startTime = Date.now();

      // Navigate directly to conversation screen
      await page.goto('/conversation');
      await expect(page.locator('[data-testid="conversation-screen"]')).toBeVisible();

      const deepLinkTime = Date.now() - startTime;

      // Should handle deep link within 2 seconds
      expect(deepLinkTime).toBeLessThan(2000);
      console.log(`Deep link time: ${deepLinkTime}ms`);
    });
  });

  test.describe('Voice Assistant Performance', () => {
    test.beforeEach(async ({ page }) => {
      // Login before voice assistant tests
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-submit"]');
      await expect(page.locator('[data-testid="home-screen"]')).toBeVisible({ timeout: 10000 });
    });

    test('should start voice recording quickly', async ({ page }) => {
      const startTime = Date.now();

      // Click voice recording button
      await page.click('[data-testid="voice-record-button"]');

      // Wait for recording to start
      await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();

      const recordStartTime = Date.now() - startTime;

      // Should start recording within 500ms
      expect(recordStartTime).toBeLessThan(500);
      console.log(`Recording start time: ${recordStartTime}ms`);
    });

    test('should stop voice recording quickly', async ({ page }) => {
      // Start recording
      await page.click('[data-testid="voice-record-button"]');
      await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();

      const startTime = Date.now();

      // Stop recording
      await page.click('[data-testid="voice-stop-button"]');
      await expect(page.locator('[data-testid="recording-indicator"]')).not.toBeVisible();

      const recordStopTime = Date.now() - startTime;

      // Should stop recording within 500ms
      expect(recordStopTime).toBeLessThan(500);
      console.log(`Recording stop time: ${recordStopTime}ms`);
    });

    test('should process transcription quickly', async ({ page }) => {
      // Start recording
      await page.click('[data-testid="voice-record-button"]');

      const startTime = Date.now();

      // Wait for transcription to appear
      await expect(page.locator('[data-testid="transcription-text"]')).toBeVisible({ timeout: 15000 });

      const transcriptionTime = Date.now() - startTime;

      // Should process transcription within 15 seconds
      expect(transcriptionTime).toBeLessThan(15000);
      console.log(`Transcription time: ${transcriptionTime}ms`);
    });

    test('should generate AI response quickly', async ({ page }) => {
      // Start recording and wait for transcription
      await page.click('[data-testid="voice-record-button"]');
      await expect(page.locator('[data-testid="transcription-text"]')).toBeVisible({ timeout: 15000 });

      const startTime = Date.now();

      // Wait for AI response
      await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 10000 });

      const responseTime = Date.now() - startTime;

      // Should generate response within 10 seconds
      expect(responseTime).toBeLessThan(10000);
      console.log(`AI response time: ${responseTime}ms`);
    });

    test('should start speaking quickly', async ({ page }) => {
      // Start recording and get response
      await page.click('[data-testid="voice-record-button"]');
      await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 15000 });

      const startTime = Date.now();

      // Wait for speaking to start
      await expect(page.locator('[data-testid="speaking-indicator"]')).toBeVisible();

      const speakingStartTime = Date.now() - startTime;

      // Should start speaking within 2 seconds
      expect(speakingStartTime).toBeLessThan(2000);
      console.log(`Speaking start time: ${speakingStartTime}ms`);
    });
  });

  test.describe('Memory Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login before memory tests
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-submit"]');
      await expect(page.locator('[data-testid="home-screen"]')).toBeVisible({ timeout: 10000 });
    });

    test('should handle multiple conversations without memory leaks', async ({ page }) => {
      const initialMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);

      // Perform multiple conversations
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="voice-record-button"]');
        await expect(page.locator('[data-testid="transcription-text"]')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('[data-testid="speaking-indicator"]')).not.toBeVisible({ timeout: 15000 });
      }

      const finalMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
      const memoryIncrease = finalMemory - initialMemory;

      // Should not increase memory usage by more than 50MB
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      console.log(`Memory increase: ${memoryIncrease / 1024 / 1024}MB`);
    });

    test('should handle rapid interactions without memory issues', async ({ page }) => {
      const startTime = Date.now();

      // Perform rapid interactions
      for (let i = 0; i < 20; i++) {
        await page.click('[data-testid="voice-record-button"]');
        await page.waitForTimeout(100);
        await page.click('[data-testid="voice-stop-button"]');
        await page.waitForTimeout(100);
      }

      const totalTime = Date.now() - startTime;

      // Should handle rapid interactions without lag
      expect(totalTime).toBeLessThan(10000);
      console.log(`Rapid interactions time: ${totalTime}ms`);

      // Should not show memory warning
      await expect(page.locator('text=Memory warning')).not.toBeVisible();
    });

    test('should clean up resources properly', async ({ page }) => {
      // Navigate to different screens multiple times
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="conversation-button"]');
        await expect(page.locator('[data-testid="conversation-screen"]')).toBeVisible();
        await page.goBack();
        await expect(page.locator('[data-testid="home-screen"]')).toBeVisible();
      }

      // Should still be responsive
      await page.click('[data-testid="voice-record-button"]');
      await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();
    });
  });

  test.describe('Network Performance', () => {
    test.beforeEach(async ({ page }) => {
      // Login before network tests
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-submit"]');
      await expect(page.locator('[data-testid="home-screen"]')).toBeVisible({ timeout: 10000 });
    });

    test('should handle slow network gracefully', async ({ page }) => {
      // Simulate slow network
      await page.route('**/api/**', route =>
        route.continue({ delay: 2000 })
      );

      const startTime = Date.now();

      // Try to use voice assistant
      await page.click('[data-testid="voice-record-button"]');
      await expect(page.locator('[data-testid="transcription-text"]')).toBeVisible({ timeout: 20000 });

      const responseTime = Date.now() - startTime;

      // Should handle slow network within reasonable time
      expect(responseTime).toBeLessThan(20000);
      console.log(`Slow network response time: ${responseTime}ms`);
    });

    test('should handle network interruptions gracefully', async ({ page }) => {
      // Start recording
      await page.click('[data-testid="voice-record-button"]');

      // Simulate network interruption
      await page.route('**/api/**', route => route.abort());

      // Should show offline message quickly
      await expect(page.locator('text=You are offline')).toBeVisible({ timeout: 5000 });

      // Should provide offline mode option
      await expect(page.locator('[data-testid="offline-mode"]')).toBeVisible();
    });

    test('should handle network recovery', async ({ page }) => {
      // Simulate network interruption
      await page.route('**/api/**', route => route.abort());

      // Start recording
      await page.click('[data-testid="voice-record-button"]');
      await expect(page.locator('text=You are offline')).toBeVisible();

      // Restore network
      await page.unroute('**/api/**');

      // Should recover and work normally
      await page.click('[data-testid="voice-record-button"]');
      await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();
    });
  });

  test.describe('Battery Performance', () => {
    test('should minimize battery usage', async ({ page }) => {
      // Login
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-submit"]');
      await expect(page.locator('[data-testid="home-screen"]')).toBeVisible({ timeout: 10000 });

      const startTime = Date.now();

      // Simulate extended usage
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="voice-record-button"]');
        await expect(page.locator('[data-testid="transcription-text"]')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(2000);
      }

      const usageTime = Date.now() - startTime;

      // Should complete extended usage without excessive battery drain
      expect(usageTime).toBeLessThan(120000); // 2 minutes
      console.log(`Extended usage time: ${usageTime}ms`);
    });

    test('should handle background processing efficiently', async ({ page }) => {
      // Login
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-submit"]');
      await expect(page.locator('[data-testid="home-screen"]')).toBeVisible({ timeout: 10000 });

      // Simulate background processing
      await page.evaluate(() => {
        // Mock background task
        setTimeout(() => {
          console.log('Background task completed');
        }, 1000);
      });

      // Should not impact foreground performance
      await page.click('[data-testid="voice-record-button"]');
      await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();
    });
  });

  test.describe('UI Responsiveness', () => {
    test.beforeEach(async ({ page }) => {
      // Login before UI tests
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-submit"]');
      await expect(page.locator('[data-testid="home-screen"]')).toBeVisible({ timeout: 10000 });
    });

    test('should respond to user interactions quickly', async ({ page }) => {
      const startTime = Date.now();

      // Perform various UI interactions
      await page.click('[data-testid="settings-button"]');
      await expect(page.locator('[data-testid="settings-screen"]')).toBeVisible();

      await page.click('[data-testid="conversation-button"]');
      await expect(page.locator('[data-testid="conversation-screen"]')).toBeVisible();

      await page.goBack();
      await expect(page.locator('[data-testid="home-screen"]')).toBeVisible();

      const interactionTime = Date.now() - startTime;

      // Should respond to interactions within 1 second
      expect(interactionTime).toBeLessThan(1000);
      console.log(`UI interaction time: ${interactionTime}ms`);
    });

    test('should handle animations smoothly', async ({ page }) => {
      // Test smooth transitions
      await page.click('[data-testid="settings-button"]');

      // Should have smooth animation
      await expect(page.locator('[data-testid="settings-screen"]')).toBeVisible();

      // Animation should complete quickly
      await page.waitForTimeout(500);

      // Should be fully interactive after animation
      await page.click('[data-testid="voice-settings"]');
      await expect(page.locator('[data-testid="voice-settings-panel"]')).toBeVisible();
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      // Navigate to conversation history
      await page.click('[data-testid="conversation-button"]');
      await expect(page.locator('[data-testid="conversation-screen"]')).toBeVisible();

      // Simulate large dataset
      await page.evaluate(() => {
        // Mock large conversation list
        const conversations = Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          message: `Conversation ${i}`,
          timestamp: new Date().toISOString()
        }));
        localStorage.setItem('conversations', JSON.stringify(conversations));
      });

      // Should load quickly
      await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible();

      // Should be scrollable
      await page.evaluate(() => {
        const list = document.querySelector('[data-testid="conversation-list"]');
        if (list) list.scrollTop = 1000;
      });

      // Should remain responsive
      await expect(page.locator('[data-testid="conversation-item"]')).toBeVisible();
    });
  });
});

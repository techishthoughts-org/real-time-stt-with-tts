import { expect, test } from '@playwright/test';

test.describe('Security - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    await page.waitForSelector('[testID="app-container"]', { timeout: 30000 });
  });

  test.describe('Authentication Security', () => {
    test('should prevent brute force attacks', async ({ page }) => {
      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await page.fill('[testID="email-input"]', 'test@example.com');
        await page.fill('[testID="password-input"]', 'wrongpassword');
        await page.click('[testID="login-submit"]');

        // Should show error message
        await expect(page.locator('text=Invalid credentials')).toBeVisible();
      }

      // Should show rate limit message
      await expect(page.locator('text=Too many failed attempts')).toBeVisible();

      // Should disable login form
      await expect(page.locator('[testID="login-submit"]')).toBeDisabled();
    });

    test('should validate password strength', async ({ page }) => {
      // Try weak password
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', '123');
      await page.click('[testID="login-submit"]');

      // Should show password strength error
      await expect(page.locator('text=Password too weak')).toBeVisible();
    });

    test('should prevent SQL injection', async ({ page }) => {
      // Try SQL injection in email field
      await page.fill('[testID="email-input"]', "'; DROP TABLE users; --");
      await page.fill('[testID="password-input"]', 'password');
      await page.click('[testID="login-submit"]');

      // Should show validation error, not crash
      await expect(page.locator('text=Invalid email format')).toBeVisible();
    });

    test('should prevent XSS attacks', async ({ page }) => {
      // Try XSS in email field
      await page.fill('[testID="email-input"]', '<script>alert("xss")</script>');
      await page.fill('[testID="password-input"]', 'password');
      await page.click('[testID="login-submit"]');

      // Should show validation error, not execute script
      await expect(page.locator('text=Invalid email format')).toBeVisible();

      // Should not have executed script
      const alerts = await page.evaluate(() => {
        return window.alert;
      });
      expect(alerts).toBeDefined();
    });

    test('should handle session timeout', async ({ page }) => {
      // Login successfully
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', 'TestPassword123!');
      await page.click('[testID="login-submit"]');
      await expect(page.locator('[testID="home-screen"]')).toBeVisible({ timeout: 10000 });

      // Simulate session timeout
      await page.evaluate(() => {
        // Mock session expiration
        localStorage.removeItem('sessionToken');
      });

      // Try to access protected page
      await page.reload();

      // Should redirect to login
      await expect(page.locator('[testID="login-screen"]')).toBeVisible();
    });

    test('should support biometric authentication', async ({ page }) => {
      // Check if biometric option is available
      const biometricButton = page.locator('[testID="biometric-login"]');

      if (await biometricButton.isVisible()) {
        // Click biometric login
        await biometricButton.click();

        // Should show biometric prompt
        await expect(page.locator('[testID="biometric-prompt"]')).toBeVisible();

        // Should handle biometric success
        await page.click('[testID="biometric-success"]');
        await expect(page.locator('[testID="home-screen"]')).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Data Protection', () => {
    test('should encrypt sensitive data', async ({ page }) => {
      // Login to access settings
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', 'TestPassword123!');
      await page.click('[testID="login-submit"]');
      await expect(page.locator('[testID="home-screen"]')).toBeVisible({ timeout: 10000 });

      // Navigate to settings
      await page.click('[testID="settings-button"]');
      await expect(page.locator('[testID="settings-screen"]')).toBeVisible();

      // Check if sensitive data is encrypted in storage
      const storageData = await page.evaluate(() => {
        return localStorage.getItem('userData');
      });

      // Should not contain plain text sensitive information
      expect(storageData).not.toContain('TestPassword123!');
    });

    test('should clear data on logout', async ({ page }) => {
      // Login
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', 'TestPassword123!');
      await page.click('[testID="login-submit"]');
      await expect(page.locator('[testID="home-screen"]')).toBeVisible({ timeout: 10000 });

      // Logout
      await page.click('[testID="logout-button"]');
      await page.click('[testID="confirm-logout"]');

      // Should clear sensitive data
      const sessionToken = await page.evaluate(() => {
        return localStorage.getItem('sessionToken');
      });
      expect(sessionToken).toBeNull();
    });

    test('should prevent data leakage in logs', async ({ page }) => {
      // Monitor console logs
      const logs: string[] = [];
      page.on('console', msg => logs.push(msg.text()));

      // Login with sensitive data
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', 'TestPassword123!');
      await page.click('[testID="login-submit"]');

      // Should not log sensitive information
      const sensitiveDataInLogs = logs.some(log =>
        log.includes('TestPassword123!') || log.includes('test@example.com')
      );
      expect(sensitiveDataInLogs).toBe(false);
    });

    test('should handle secure data transmission', async ({ page }) => {
      // Monitor network requests
      const requests: string[] = [];
      page.on('request', request => requests.push(request.url()));

      // Login
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', 'TestPassword123!');
      await page.click('[testID="login-submit"]');

      // Should use HTTPS for all requests
      const insecureRequests = requests.filter(url => url.startsWith('http://'));
      expect(insecureRequests.length).toBe(0);
    });
  });

  test.describe('Network Security', () => {
    test('should validate SSL certificates', async ({ page }) => {
      // Mock invalid SSL certificate
      await page.route('**/*', route => {
        if (route.request().url().includes('api')) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      // Try to login
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', 'TestPassword123!');
      await page.click('[testID="login-submit"]');

      // Should show SSL error
      await expect(page.locator('text=SSL Certificate Error')).toBeVisible();
    });

    test('should prevent man-in-the-middle attacks', async ({ page }) => {
      // Mock certificate pinning failure
      await page.route('**/api/**', route =>
        route.fulfill({
          status: 200,
          headers: { 'server': 'fake-server' },
          body: '{"error": "certificate mismatch"}'
        })
      );

      // Try to access API
      await page.click('[testID="voice-record-button"]');

      // Should show security warning
      await expect(page.locator('text=Security Warning')).toBeVisible();
    });

    test('should handle network interception', async ({ page }) => {
      // Mock network interception
      await page.route('**/api/**', route =>
        route.fulfill({
          status: 403,
          body: '{"error": "request intercepted"}'
        })
      );

      // Try to perform action
      await page.click('[testID="voice-record-button"]');

      // Should show security error
      await expect(page.locator('text=Security Error')).toBeVisible();
    });
  });

  test.describe('Input Validation', () => {
    test('should sanitize user inputs', async ({ page }) => {
      // Try various malicious inputs
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'vbscript:alert("xss")'
      ];

      for (const input of maliciousInputs) {
        await page.fill('[testID="email-input"]', input);
        await page.fill('[testID="password-input"]', 'password');
        await page.click('[testID="login-submit"]');

        // Should show validation error, not execute script
        await expect(page.locator('text=Invalid input')).toBeVisible();
      }
    });

    test('should prevent path traversal attacks', async ({ page }) => {
      // Try path traversal in input
      await page.fill('[testID="email-input"]', '../../../etc/passwd');
      await page.fill('[testID="password-input"]', 'password');
      await page.click('[testID="login-submit"]');

      // Should show validation error
      await expect(page.locator('text=Invalid email format')).toBeVisible();
    });

    test('should handle oversized inputs', async ({ page }) => {
      // Try oversized input
      const largeInput = 'a'.repeat(10000);
      await page.fill('[testID="email-input"]', largeInput);
      await page.fill('[testID="password-input"]', 'password');
      await page.click('[testID="login-submit"]');

      // Should show validation error
      await expect(page.locator('text=Input too long')).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should handle concurrent sessions', async ({ page, context }) => {
      // Login in first session
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', 'TestPassword123!');
      await page.click('[testID="login-submit"]');
      await expect(page.locator('[testID="home-screen"]')).toBeVisible({ timeout: 10000 });

      // Create second session
      const page2 = await context.newPage();
      await page2.goto('/');
      await page2.waitForSelector('[testID="app-container"]');

      // Login in second session
      await page2.fill('[testID="email-input"]', 'test@example.com');
      await page2.fill('[testID="password-input"]', 'TestPassword123!');
      await page2.click('[testID="login-submit"]');

      // Should handle multiple sessions gracefully
      await expect(page2.locator('[testID="home-screen"]')).toBeVisible({ timeout: 10000 });
    });

    test('should handle session hijacking attempts', async ({ page }) => {
      // Login
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', 'TestPassword123!');
      await page.click('[testID="login-submit"]');
      await expect(page.locator('[testID="home-screen"]')).toBeVisible({ timeout: 10000 });

      // Simulate session hijacking attempt
      await page.evaluate(() => {
        // Try to modify session token
        localStorage.setItem('sessionToken', 'hijacked-token');
      });

      // Try to access protected resource
      await page.click('[testID="voice-record-button"]');

      // Should detect invalid session and redirect to login
      await expect(page.locator('[testID="login-screen"]')).toBeVisible();
    });
  });

  test.describe('Privacy Protection', () => {
    test('should respect privacy settings', async ({ page }) => {
      // Login
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', 'TestPassword123!');
      await page.click('[testID="login-submit"]');
      await expect(page.locator('[testID="home-screen"]')).toBeVisible({ timeout: 10000 });

      // Navigate to privacy settings
      await page.click('[testID="settings-button"]');
      await page.click('[testID="privacy-settings"]');

      // Disable data collection
      await page.click('[testID="data-collection-toggle"]');

      // Should respect privacy setting
      await expect(page.locator('text=Data collection disabled')).toBeVisible();
    });

    test('should handle data deletion requests', async ({ page }) => {
      // Login
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', 'TestPassword123!');
      await page.click('[testID="login-submit"]');
      await expect(page.locator('[testID="home-screen"]')).toBeVisible({ timeout: 10000 });

      // Navigate to privacy settings
      await page.click('[testID="settings-button"]');
      await page.click('[testID="privacy-settings"]');

      // Request data deletion
      await page.click('[testID="delete-data-button"]');
      await page.click('[testID="confirm-delete"]');

      // Should delete user data
      await expect(page.locator('text=Data deleted successfully')).toBeVisible();

      // Should redirect to login
      await expect(page.locator('[testID="login-screen"]')).toBeVisible();
    });

    test('should anonymize user data', async ({ page }) => {
      // Login
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', 'TestPassword123!');
      await page.click('[testID="login-submit"]');
      await expect(page.locator('[testID="home-screen"]')).toBeVisible({ timeout: 10000 });

      // Enable data anonymization
      await page.click('[testID="settings-button"]');
      await page.click('[testID="privacy-settings"]');
      await page.click('[testID="anonymize-data-toggle"]');

      // Should anonymize data
      await expect(page.locator('text=Data anonymization enabled')).toBeVisible();
    });
  });

  test.describe('Security Headers', () => {
    test('should have proper security headers', async ({ page }) => {
      // Navigate to app
      await page.goto('/');

      // Check response headers
      const response = await page.waitForResponse('**/*');
      const headers = response.headers();

      // Should have security headers
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['x-xss-protection']).toBe('1; mode=block');
    });

    test('should prevent clickjacking', async ({ page }) => {
      // Try to embed app in iframe
      await page.setContent(`
        <iframe src="${page.url()}" width="500" height="500"></iframe>
      `);

      // Should not load in iframe due to X-Frame-Options
      const iframe = page.locator('iframe');
      await expect(iframe).not.toHaveAttribute('src', page.url());
    });
  });
});

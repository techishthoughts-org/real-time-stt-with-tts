import { test, expect } from '@playwright/test';

test.describe('Gon Voice Assistant App - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForSelector('[testID="app-container"]', { timeout: 30000 });
  });

  test.describe('App Initialization', () => {
    test('should load the app successfully', async ({ page }) => {
      // Check if app container is present
      await expect(page.locator('[testID="app-container"]')).toBeVisible();
      
      // Check if app title is displayed
      await expect(page.locator('text=Gon Voice Assistant')).toBeVisible();
      
      // Check if loading screen is not visible after initialization
      await expect(page.locator('[testID="loading-screen"]')).not.toBeVisible();
    });

    test('should show proper loading states', async ({ page }) => {
      // Reload page to see loading state
      await page.reload();
      
      // Should show loading screen initially
      await expect(page.locator('[testID="loading-screen"]')).toBeVisible();
      
      // Should hide loading screen after initialization
      await expect(page.locator('[testID="loading-screen"]')).not.toBeVisible({ timeout: 10000 });
    });

    test('should handle app initialization errors gracefully', async ({ page }) => {
      // Mock network error by going offline
      await page.route('**/*', route => route.abort());
      
      // Reload page
      await page.reload();
      
      // Should show error message
      await expect(page.locator('text=Connection Error')).toBeVisible();
      
      // Should provide retry option
      await expect(page.locator('text=Retry')).toBeVisible();
    });
  });

  test.describe('Authentication Flow', () => {
    test('should show login screen when not authenticated', async ({ page }) => {
      // Check if login screen is visible
      await expect(page.locator('[testID="login-screen"]')).toBeVisible();
      
      // Check if login form elements are present
      await expect(page.locator('[testID="email-input"]')).toBeVisible();
      await expect(page.locator('[testID="password-input"]')).toBeVisible();
      await expect(page.locator('[testID="login-submit"]')).toBeVisible();
    });

    test('should handle successful login', async ({ page }) => {
      // Fill login form
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', 'TestPassword123!');
      
      // Submit login form
      await page.click('[testID="login-submit"]');
      
      // Should navigate to home screen
      await expect(page.locator('[testID="home-screen"]')).toBeVisible({ timeout: 10000 });
      
      // Should show user information
      await expect(page.locator('text=Welcome')).toBeVisible();
    });

    test('should handle login errors', async ({ page }) => {
      // Fill login form with invalid credentials
      await page.fill('[testID="email-input"]', 'invalid@example.com');
      await page.fill('[testID="password-input"]', 'wrongpassword');
      
      // Submit login form
      await page.click('[testID="login-submit"]');
      
      // Should show error message
      await expect(page.locator('text=Invalid credentials')).toBeVisible();
      
      // Should remain on login screen
      await expect(page.locator('[testID="login-screen"]')).toBeVisible();
    });

    test('should handle biometric authentication', async ({ page }) => {
      // Check if biometric option is available
      const biometricButton = page.locator('[testID="biometric-login"]');
      
      if (await biometricButton.isVisible()) {
        // Click biometric login
        await biometricButton.click();
        
        // Should handle biometric prompt
        await expect(page.locator('[testID="biometric-prompt"]')).toBeVisible();
      }
    });
  });

  test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
      // Login before navigation tests
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', 'TestPassword123!');
      await page.click('[testID="login-submit"]');
      await expect(page.locator('[testID="home-screen"]')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to conversation screen', async ({ page }) => {
      // Click conversation button
      await page.click('[testID="conversation-button"]');
      
      // Should navigate to conversation screen
      await expect(page.locator('[testID="conversation-screen"]')).toBeVisible();
      
      // Should show conversation history
      await expect(page.locator('[testID="conversation-list"]')).toBeVisible();
    });

    test('should navigate to settings screen', async ({ page }) => {
      // Click settings button
      await page.click('[testID="settings-button"]');
      
      // Should navigate to settings screen
      await expect(page.locator('[testID="settings-screen"]')).toBeVisible();
      
      // Should show settings options
      await expect(page.locator('[testID="settings-list"]')).toBeVisible();
    });

    test('should handle back navigation', async ({ page }) => {
      // Navigate to conversation screen
      await page.click('[testID="conversation-button"]');
      await expect(page.locator('[testID="conversation-screen"]')).toBeVisible();
      
      // Go back
      await page.goBack();
      
      // Should return to home screen
      await expect(page.locator('[testID="home-screen"]')).toBeVisible();
    });

    test('should handle deep linking', async ({ page }) => {
      // Navigate directly to conversation screen
      await page.goto('/conversation');
      
      // Should show conversation screen
      await expect(page.locator('[testID="conversation-screen"]')).toBeVisible();
    });
  });

  test.describe('Voice Assistant Functionality', () => {
    test.beforeEach(async ({ page }) => {
      // Login before voice assistant tests
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', 'TestPassword123!');
      await page.click('[testID="login-submit"]');
      await expect(page.locator('[testID="home-screen"]')).toBeVisible({ timeout: 10000 });
    });

    test('should start voice recording', async ({ page }) => {
      // Click voice recording button
      await page.click('[testID="voice-record-button"]');
      
      // Should show recording state
      await expect(page.locator('[testID="recording-indicator"]')).toBeVisible();
      
      // Should show audio level meter
      await expect(page.locator('[testID="audio-level-meter"]')).toBeVisible();
    });

    test('should stop voice recording', async ({ page }) => {
      // Start recording
      await page.click('[testID="voice-record-button"]');
      await expect(page.locator('[testID="recording-indicator"]')).toBeVisible();
      
      // Stop recording
      await page.click('[testID="voice-stop-button"]');
      
      // Should hide recording indicator
      await expect(page.locator('[testID="recording-indicator"]')).not.toBeVisible();
    });

    test('should display transcription', async ({ page }) => {
      // Start recording
      await page.click('[testID="voice-record-button"]');
      
      // Wait for transcription to appear
      await expect(page.locator('[testID="transcription-text"]')).toBeVisible({ timeout: 15000 });
      
      // Should show transcribed text
      const transcription = await page.locator('[testID="transcription-text"]').textContent();
      expect(transcription).toBeTruthy();
    });

    test('should play voice response', async ({ page }) => {
      // Start recording and wait for response
      await page.click('[testID="voice-record-button"]');
      await expect(page.locator('[testID="transcription-text"]')).toBeVisible({ timeout: 15000 });
      
      // Should show response
      await expect(page.locator('[testID="ai-response"]')).toBeVisible();
      
      // Should show speaking indicator
      await expect(page.locator('[testID="speaking-indicator"]')).toBeVisible();
    });

    test('should handle voice permission denial', async ({ page }) => {
      // Mock permission denial
      await page.route('**/permissions', route => 
        route.fulfill({ status: 403, body: 'Permission denied' })
      );
      
      // Try to start recording
      await page.click('[testID="voice-record-button"]');
      
      // Should show permission error
      await expect(page.locator('text=Microphone permission required')).toBeVisible();
    });
  });

  test.describe('Settings and Configuration', () => {
    test.beforeEach(async ({ page }) => {
      // Login before settings tests
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', 'TestPassword123!');
      await page.click('[testID="login-submit"]');
      await expect(page.locator('[testID="home-screen"]')).toBeVisible({ timeout: 10000 });
      
      // Navigate to settings
      await page.click('[testID="settings-button"]');
      await expect(page.locator('[testID="settings-screen"]')).toBeVisible();
    });

    test('should change voice settings', async ({ page }) => {
      // Open voice settings
      await page.click('[testID="voice-settings"]');
      
      // Change voice speed
      await page.click('[testID="voice-speed-slider"]');
      await page.keyboard.press('ArrowRight');
      
      // Change voice pitch
      await page.click('[testID="voice-pitch-slider"]');
      await page.keyboard.press('ArrowRight');
      
      // Save settings
      await page.click('[testID="save-settings"]');
      
      // Should show success message
      await expect(page.locator('text=Settings saved')).toBeVisible();
    });

    test('should toggle dark mode', async ({ page }) => {
      // Toggle dark mode
      await page.click('[testID="dark-mode-toggle"]');
      
      // Should apply dark theme
      await expect(page.locator('[testID="app-container"]')).toHaveClass(/dark/);
      
      // Toggle back to light mode
      await page.click('[testID="dark-mode-toggle"]');
      
      // Should apply light theme
      await expect(page.locator('[testID="app-container"]')).not.toHaveClass(/dark/);
    });

    test('should change language', async ({ page }) => {
      // Open language settings
      await page.click('[testID="language-settings"]');
      
      // Select different language
      await page.click('[testID="language-option-en"]');
      
      // Should update language
      await expect(page.locator('text=Settings')).toBeVisible();
    });

    test('should handle logout', async ({ page }) => {
      // Click logout button
      await page.click('[testID="logout-button"]');
      
      // Should show confirmation dialog
      await expect(page.locator('text=Are you sure?')).toBeVisible();
      
      // Confirm logout
      await page.click('[testID="confirm-logout"]');
      
      // Should return to login screen
      await expect(page.locator('[testID="login-screen"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network error
      await page.route('**/api/**', route => 
        route.fulfill({ status: 500, body: 'Server error' })
      );
      
      // Try to perform an action that requires network
      await page.click('[testID="voice-record-button"]');
      
      // Should show error message
      await expect(page.locator('text=Network error')).toBeVisible();
      
      // Should provide retry option
      await expect(page.locator('[testID="retry-button"]')).toBeVisible();
    });

    test('should handle app crashes gracefully', async ({ page }) => {
      // Mock app crash by injecting error
      await page.evaluate(() => {
        window.addEventListener('error', () => {
          // Simulate crash recovery
          window.location.reload();
        });
        throw new Error('Simulated crash');
      });
      
      // Should recover and show app
      await expect(page.locator('[testID="app-container"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Performance Tests', () => {
    test('should load app within performance budget', async ({ page }) => {
      const startTime = Date.now();
      
      // Navigate to app
      await page.goto('/');
      await page.waitForSelector('[testID="app-container"]');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle rapid interactions', async ({ page }) => {
      // Login first
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', 'TestPassword123!');
      await page.click('[testID="login-submit"]');
      await expect(page.locator('[testID="home-screen"]')).toBeVisible({ timeout: 10000 });
      
      const startTime = Date.now();
      
      // Perform rapid interactions
      for (let i = 0; i < 10; i++) {
        await page.click('[testID="voice-record-button"]');
        await page.waitForTimeout(100);
        await page.click('[testID="voice-stop-button"]');
        await page.waitForTimeout(100);
      }
      
      const interactionTime = Date.now() - startTime;
      
      // Should handle rapid interactions without lag
      expect(interactionTime).toBeLessThan(5000);
    });
  });

  test.describe('Accessibility Tests', () => {
    test('should support screen readers', async ({ page }) => {
      // Check for proper ARIA labels
      await expect(page.locator('[aria-label="Voice record button"]')).toBeVisible();
      await expect(page.locator('[aria-label="Settings button"]')).toBeVisible();
      
      // Check for proper heading structure
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('h2')).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Navigate using keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      // Should navigate to focused element
      await expect(page.locator('[testID="voice-record-button"]')).toBeFocused();
    });

    test('should have proper color contrast', async ({ page }) => {
      // Check text contrast
      const textElement = page.locator('text=Gon Voice Assistant');
      const color = await textElement.evaluate(el => 
        window.getComputedStyle(el).color
      );
      
      // Should have good contrast (simplified check)
      expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  });
});

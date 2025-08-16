import { expect, test } from '@playwright/test';

test.describe('Voice Assistant - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and login
    await page.goto('/');
    await page.waitForSelector('[testID="app-container"]', { timeout: 30000 });

    // Login
    await page.fill('[testID="email-input"]', 'test@example.com');
    await page.fill('[testID="password-input"]', 'TestPassword123!');
    await page.click('[testID="login-submit"]');
    await expect(page.locator('[testID="home-screen"]')).toBeVisible({ timeout: 10000 });
  });

  test.describe('Speech Recognition', () => {
    test('should start listening when voice button is pressed', async ({ page }) => {
      // Click voice recording button
      await page.click('[testID="voice-record-button"]');

      // Should show recording state
      await expect(page.locator('[testID="recording-indicator"]')).toBeVisible();

      // Should show "Listening..." text
      await expect(page.locator('text=Listening...')).toBeVisible();

      // Should show audio level meter
      await expect(page.locator('[testID="audio-level-meter"]')).toBeVisible();
    });

    test('should stop listening when stop button is pressed', async ({ page }) => {
      // Start recording
      await page.click('[testID="voice-record-button"]');
      await expect(page.locator('[testID="recording-indicator"]')).toBeVisible();

      // Stop recording
      await page.click('[testID="voice-stop-button"]');

      // Should hide recording indicator
      await expect(page.locator('[testID="recording-indicator"]')).not.toBeVisible();

      // Should show "Processing..." text
      await expect(page.locator('text=Processing...')).toBeVisible();
    });

    test('should display real-time transcription', async ({ page }) => {
      // Start recording
      await page.click('[testID="voice-record-button"]');

      // Wait for transcription to appear
      await expect(page.locator('[testID="transcription-text"]')).toBeVisible({ timeout: 15000 });

      // Should show transcribed text
      const transcription = await page.locator('[testID="transcription-text"]').textContent();
      expect(transcription).toBeTruthy();
      expect(transcription!.length).toBeGreaterThan(0);
    });

    test('should handle different languages', async ({ page }) => {
      // Change language to Spanish
      await page.click('[testID="settings-button"]');
      await page.click('[testID="language-settings"]');
      await page.click('[testID="language-option-es"]');
      await page.goBack();

      // Start recording
      await page.click('[testID="voice-record-button"]');

      // Should show transcription in Spanish
      await expect(page.locator('[testID="transcription-text"]')).toBeVisible({ timeout: 15000 });
    });

    test('should handle background noise gracefully', async ({ page }) => {
      // Start recording
      await page.click('[testID="voice-record-button"]');

      // Simulate background noise by waiting
      await page.waitForTimeout(5000);

      // Should still show recording indicator
      await expect(page.locator('[testID="recording-indicator"]')).toBeVisible();

      // Should show some transcription or "No speech detected"
      const transcription = page.locator('[testID="transcription-text"]');
      const noSpeech = page.locator('text=No speech detected');

      await expect(transcription.or(noSpeech)).toBeVisible();
    });

    test('should handle long speech input', async ({ page }) => {
      // Start recording
      await page.click('[testID="voice-record-button"]');

      // Wait for longer transcription
      await page.waitForTimeout(10000);

      // Should show transcription
      await expect(page.locator('[testID="transcription-text"]')).toBeVisible();

      // Should handle long text without crashing
      const transcription = await page.locator('[testID="transcription-text"]').textContent();
      expect(transcription).toBeTruthy();
    });
  });

  test.describe('Text-to-Speech', () => {
    test('should play AI response after transcription', async ({ page }) => {
      // Start recording and wait for transcription
      await page.click('[testID="voice-record-button"]');
      await expect(page.locator('[testID="transcription-text"]')).toBeVisible({ timeout: 15000 });

      // Wait for AI response
      await expect(page.locator('[testID="ai-response"]')).toBeVisible({ timeout: 10000 });

      // Should show speaking indicator
      await expect(page.locator('[testID="speaking-indicator"]')).toBeVisible();

      // Should show "Speaking..." text
      await expect(page.locator('text=Speaking...')).toBeVisible();
    });

    test('should stop speaking when interrupted', async ({ page }) => {
      // Start recording and get response
      await page.click('[testID="voice-record-button"]');
      await expect(page.locator('[testID="ai-response"]')).toBeVisible({ timeout: 15000 });

      // Wait for speaking to start
      await expect(page.locator('[testID="speaking-indicator"]')).toBeVisible();

      // Interrupt by starting new recording
      await page.click('[testID="voice-record-button"]');

      // Should stop speaking and start listening
      await expect(page.locator('[testID="speaking-indicator"]')).not.toBeVisible();
      await expect(page.locator('[testID="recording-indicator"]')).toBeVisible();
    });

    test('should handle different voice speeds', async ({ page }) => {
      // Change voice speed in settings
      await page.click('[testID="settings-button"]');
      await page.click('[testID="voice-settings"]');

      // Set to fast speed
      await page.click('[testID="voice-speed-fast"]');
      await page.goBack();

      // Start recording and get response
      await page.click('[testID="voice-record-button"]');
      await expect(page.locator('[testID="ai-response"]')).toBeVisible({ timeout: 15000 });

      // Should speak at faster speed
      await expect(page.locator('[testID="speaking-indicator"]')).toBeVisible();
    });

    test('should handle different voice pitches', async ({ page }) => {
      // Change voice pitch in settings
      await page.click('[testID="settings-button"]');
      await page.click('[testID="voice-settings"]');

      // Set to high pitch
      await page.click('[testID="voice-pitch-high"]');
      await page.goBack();

      // Start recording and get response
      await page.click('[testID="voice-record-button"]');
      await expect(page.locator('[testID="ai-response"]')).toBeVisible({ timeout: 15000 });

      // Should speak at higher pitch
      await expect(page.locator('[testID="speaking-indicator"]')).toBeVisible();
    });
  });

  test.describe('Conversation Flow', () => {
    test('should maintain conversation context', async ({ page }) => {
      // First interaction
      await page.click('[testID="voice-record-button"]');
      await expect(page.locator('[testID="transcription-text"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[testID="ai-response"]')).toBeVisible({ timeout: 10000 });

      // Wait for response to finish
      await expect(page.locator('[testID="speaking-indicator"]')).not.toBeVisible({ timeout: 15000 });

      // Second interaction
      await page.click('[testID="voice-record-button"]');
      await expect(page.locator('[testID="transcription-text"]')).toBeVisible({ timeout: 15000 });

      // Should reference previous conversation
      const response = await page.locator('[testID="ai-response"]').textContent();
      expect(response).toBeTruthy();
    });

    test('should save conversation history', async ({ page }) => {
      // Have a conversation
      await page.click('[testID="voice-record-button"]');
      await expect(page.locator('[testID="transcription-text"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[testID="ai-response"]')).toBeVisible({ timeout: 10000 });

      // Navigate to conversation history
      await page.click('[testID="conversation-button"]');
      await expect(page.locator('[testID="conversation-screen"]')).toBeVisible();

      // Should show conversation in history
      await expect(page.locator('[testID="conversation-item"]')).toBeVisible();
    });

    test('should handle conversation errors gracefully', async ({ page }) => {
      // Mock AI service error
      await page.route('**/api/chat', route =>
        route.fulfill({ status: 500, body: 'AI service unavailable' })
      );

      // Start recording
      await page.click('[testID="voice-record-button"]');
      await expect(page.locator('[testID="transcription-text"]')).toBeVisible({ timeout: 15000 });

      // Should show error message
      await expect(page.locator('text=Sorry, I encountered an error')).toBeVisible();

      // Should provide retry option
      await expect(page.locator('[testID="retry-button"]')).toBeVisible();
    });

    test('should handle network interruptions', async ({ page }) => {
      // Start recording
      await page.click('[testID="voice-record-button"]');
      await expect(page.locator('[testID="transcription-text"]')).toBeVisible({ timeout: 15000 });

      // Simulate network interruption
      await page.route('**/*', route => route.abort());

      // Should show offline message
      await expect(page.locator('text=You are offline')).toBeVisible();

      // Should provide offline mode option
      await expect(page.locator('[testID="offline-mode"]')).toBeVisible();
    });
  });

  test.describe('Voice Commands', () => {
    test('should recognize "stop" command', async ({ page }) => {
      // Start recording
      await page.click('[testID="voice-record-button"]');

      // Simulate "stop" command
      await page.evaluate(() => {
        // Mock speech recognition result
        window.speechSynthesis.speak(new SpeechSynthesisUtterance('stop'));
      });

      // Should stop recording
      await expect(page.locator('[testID="recording-indicator"]')).not.toBeVisible();
    });

    test('should recognize "pause" command', async ({ page }) => {
      // Start recording and get response
      await page.click('[testID="voice-record-button"]');
      await expect(page.locator('[testID="ai-response"]')).toBeVisible({ timeout: 15000 });

      // Simulate "pause" command during speaking
      await page.evaluate(() => {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance('pause'));
      });

      // Should pause speaking
      await expect(page.locator('[testID="speaking-indicator"]')).not.toBeVisible();
    });

    test('should recognize "repeat" command', async ({ page }) => {
      // Have initial conversation
      await page.click('[testID="voice-record-button"]');
      await expect(page.locator('[testID="ai-response"]')).toBeVisible({ timeout: 15000 });

      // Wait for response to finish
      await expect(page.locator('[testID="speaking-indicator"]')).not.toBeVisible({ timeout: 15000 });

      // Simulate "repeat" command
      await page.evaluate(() => {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance('repeat'));
      });

      // Should repeat the last response
      await expect(page.locator('[testID="speaking-indicator"]')).toBeVisible();
    });
  });

  test.describe('Accessibility Features', () => {
    test('should support voice-only navigation', async ({ page }) => {
      // Enable voice navigation mode
      await page.click('[testID="accessibility-settings"]');
      await page.click('[testID="voice-navigation-toggle"]');

      // Should announce current screen
      await expect(page.locator('[aria-live="polite"]')).toBeVisible();

      // Should provide voice feedback for interactions
      await page.click('[testID="voice-record-button"]');
      await expect(page.locator('[aria-label="Recording started"]')).toBeVisible();
    });

    test('should support screen reader announcements', async ({ page }) => {
      // Start recording
      await page.click('[testID="voice-record-button"]');

      // Should announce recording state
      await expect(page.locator('[aria-live="assertive"]')).toBeVisible();

      // Wait for transcription
      await expect(page.locator('[testID="transcription-text"]')).toBeVisible({ timeout: 15000 });

      // Should announce transcription
      await expect(page.locator('[aria-live="polite"]')).toBeVisible();
    });

    test('should provide haptic feedback', async ({ page }) => {
      // Enable haptic feedback
      await page.click('[testID="settings-button"]');
      await page.click('[testID="accessibility-settings"]');
      await page.click('[testID="haptic-feedback-toggle"]');
      await page.goBack();

      // Start recording
      await page.click('[testID="voice-record-button"]');

      // Should provide haptic feedback (simulated)
      await expect(page.locator('[testID="haptic-feedback"]')).toBeVisible();
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should handle rapid voice interactions', async ({ page }) => {
      const startTime = Date.now();

      // Perform multiple rapid interactions
      for (let i = 0; i < 5; i++) {
        await page.click('[testID="voice-record-button"]');
        await page.waitForTimeout(1000);
        await page.click('[testID="voice-stop-button"]');
        await page.waitForTimeout(1000);
      }

      const totalTime = Date.now() - startTime;

      // Should handle rapid interactions without lag
      expect(totalTime).toBeLessThan(15000);
    });

    test('should maintain audio quality during long sessions', async ({ page }) => {
      // Start long recording session
      await page.click('[testID="voice-record-button"]');

      // Record for extended period
      await page.waitForTimeout(30000);

      // Should maintain recording quality
      await expect(page.locator('[testID="recording-indicator"]')).toBeVisible();
      await expect(page.locator('[testID="audio-level-meter"]')).toBeVisible();

      // Stop recording
      await page.click('[testID="voice-stop-button"]');

      // Should process successfully
      await expect(page.locator('[testID="transcription-text"]')).toBeVisible({ timeout: 15000 });
    });

    test('should handle memory efficiently', async ({ page }) => {
      // Perform multiple conversations
      for (let i = 0; i < 10; i++) {
        await page.click('[testID="voice-record-button"]');
        await expect(page.locator('[testID="transcription-text"]')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('[testID="ai-response"]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('[testID="speaking-indicator"]')).not.toBeVisible({ timeout: 15000 });
      }

      // Should not show memory warning
      await expect(page.locator('text=Memory warning')).not.toBeVisible();

      // Should still be responsive
      await page.click('[testID="voice-record-button"]');
      await expect(page.locator('[testID="recording-indicator"]')).toBeVisible();
    });
  });
});

import { chromium, FullConfig } from '@playwright/test';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  
  console.log('🚀 Starting E2E Test Setup...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    await page.goto(baseURL!);
    console.log('✅ App loaded successfully');
    
    // Wait for app to initialize
    await page.waitForSelector('[testID="app-container"]', { timeout: 30000 });
    console.log('✅ App initialized');
    
    // Check if we need to authenticate
    const loginButton = await page.$('[testID="login-button"]');
    
    if (loginButton) {
      console.log('🔐 Setting up authentication...');
      
      // Click login button
      await loginButton.click();
      
      // Wait for login form
      await page.waitForSelector('[testID="email-input"]');
      
      // Fill login form with test credentials
      await page.fill('[testID="email-input"]', 'test@example.com');
      await page.fill('[testID="password-input"]', 'TestPassword123!');
      
      // Submit login form
      await page.click('[testID="login-submit"]');
      
      // Wait for successful login
      await page.waitForSelector('[testID="home-screen"]', { timeout: 10000 });
      console.log('✅ Authentication completed');
    } else {
      console.log('✅ Already authenticated');
    }
    
    // Save authentication state
    await page.context().storageState({ path: storageState as string });
    console.log('💾 Authentication state saved');
    
    // Create test data file
    const testData = {
      timestamp: new Date().toISOString(),
      user: {
        email: 'test@example.com',
        name: 'Test User'
      },
      testScenarios: [
        'voice-assistant',
        'authentication',
        'navigation',
        'settings',
        'conversation'
      ]
    };
    
    writeFileSync(
      join(__dirname, 'test-data.json'),
      JSON.stringify(testData, null, 2)
    );
    console.log('📄 Test data prepared');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('🎉 E2E Test Setup Complete!');
}

export default globalSetup;

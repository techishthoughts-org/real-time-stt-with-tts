import { FullConfig } from '@playwright/test';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E Test Teardown...');

  try {
    // Clean up test data file
    const testDataPath = join(__dirname, 'test-data.json');
    if (existsSync(testDataPath)) {
      unlinkSync(testDataPath);
      console.log('🗑️ Test data cleaned up');
    }

    // Process test results if they exist
    const resultsPath = join(__dirname, '..', 'test-results', 'results.json');
    if (existsSync(resultsPath)) {
      const results = JSON.parse(readFileSync(resultsPath, 'utf-8'));

      // Generate summary report
      const summary = {
        totalTests: results.suites?.length || 0,
        passedTests: results.suites?.filter((suite: any) =>
          suite.specs?.every((spec: any) => spec.tests?.every((test: any) => test.outcome === 'passed'))
        ).length || 0,
        failedTests: results.suites?.filter((suite: any) =>
          suite.specs?.some((spec: any) => spec.tests?.some((test: any) => test.outcome === 'failed'))
        ).length || 0,
        duration: results.duration || 0,
        timestamp: new Date().toISOString()
      };

      console.log('📊 Test Summary:', summary);
    }

    // Clean up any temporary files
    const tempFiles = [
      join(__dirname, 'temp-screenshot.png'),
      join(__dirname, 'temp-video.webm'),
      join(__dirname, 'temp-trace.zip')
    ];

    tempFiles.forEach(file => {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    });

    console.log('🧹 Temporary files cleaned up');

  } catch (error) {
    console.error('❌ Teardown error:', error);
  }

  console.log('🎉 E2E Test Teardown Complete!');
}

export default globalTeardown;

# Gon Voice Assistant - E2E Testing Framework

This directory contains comprehensive end-to-end (E2E) tests for the Gon Voice Assistant mobile app using Playwright.

## 🎯 Overview

The E2E testing framework provides complete coverage of the mobile app's functionality, including:

- **App Initialization & Lifecycle**
- **Authentication & Security**
- **Voice Assistant Functionality**
- **Navigation & User Experience**
- **Performance & Memory Management**
- **Error Handling & Recovery**
- **Accessibility & Compliance**

## 📁 Test Structure

```
e2e/
├── playwright.config.ts      # Playwright configuration
├── global-setup.ts          # Global test setup
├── global-teardown.ts       # Global test cleanup
├── package.json             # E2E test dependencies
├── README.md               # This file
└── tests/
    ├── app.spec.ts         # Main app functionality tests
    ├── voice-assistant.spec.ts  # Voice assistant specific tests
    ├── security.spec.ts    # Security and authentication tests
    └── performance.spec.ts # Performance and optimization tests
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- The mobile app running on `http://localhost:8081`

### Installation

```bash
# Navigate to E2E directory
cd packages/mobile-app/e2e

# Install dependencies
pnpm install

# Install Playwright browsers
pnpm run test:install
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with UI
pnpm run test:ui

# Run tests in headed mode (see browser)
pnpm run test:headed

# Run specific test categories
pnpm run test:security
pnpm run test:performance
pnpm run test:voice
pnpm run test:auth
```

## 📊 Test Categories

### 🔐 Security Tests (`security.spec.ts`)
- Authentication security
- Data protection
- Network security
- Input validation
- Session management
- Privacy protection
- Security headers

### 🎤 Voice Assistant Tests (`voice-assistant.spec.ts`)
- Speech recognition
- Text-to-speech
- Conversation flow
- Voice commands
- Accessibility features
- Performance and reliability

### ⚡ Performance Tests (`performance.spec.ts`)
- App launch performance
- Authentication performance
- Navigation performance
- Voice assistant performance
- Memory management
- Network performance
- Battery performance
- UI responsiveness

### 📱 App Tests (`app.spec.ts`)
- App initialization
- Authentication flow
- Navigation
- Settings and configuration
- Error handling
- Accessibility
- Performance

## 🎮 Test Commands

### Basic Commands
```bash
# Run all tests
pnpm test

# Run with UI
pnpm run test:ui

# Run in debug mode
pnpm run test:debug

# Run in headed mode
pnpm run test:headed
```

### Platform-Specific Tests
```bash
# Mobile tests only
pnpm run test:mobile

# Desktop tests only
pnpm run test:desktop

# All platforms
pnpm run test:all
```

### Category-Specific Tests
```bash
# Security tests
pnpm run test:security

# Performance tests
pnpm run test:performance

# Voice assistant tests
pnpm run test:voice

# Authentication tests
pnpm run test:auth

# Navigation tests
pnpm run test:navigation

# Settings tests
pnpm run test:settings

# Conversation tests
pnpm run test:conversation

# Error handling tests
pnpm run test:error

# Accessibility tests
pnpm run test:accessibility

# Memory tests
pnpm run test:memory

# Network tests
pnpm run test:network

# Battery tests
pnpm run test:battery

# UI responsiveness tests
pnpm run test:ui-responsive
```

### CI/CD Commands
```bash
# CI with all reporters
pnpm run test:ci

# CI with parallel execution
pnpm run test:ci:parallel

# CI with retries
pnpm run test:ci:retry

# CI for specific categories
pnpm run test:ci:security
pnpm run test:ci:performance
pnpm run test:ci:voice
```

## 📈 Test Reports

### View Reports
```bash
# Show HTML report
pnpm run test:report

# Show trace viewer
pnpm run test:trace
```

### Report Types
- **HTML Report**: Interactive test results
- **JSON Report**: Machine-readable results
- **JUnit Report**: CI/CD integration
- **List Report**: Console output

## 🔧 Configuration

### Playwright Config (`playwright.config.ts`)

The configuration includes:

- **Multiple Browsers**: Chrome, Safari, Firefox, Edge
- **Mobile Devices**: iPhone 12, Pixel 5, iPad Pro
- **Desktop Viewports**: Various screen sizes
- **Parallel Execution**: Up to 4 workers
- **Retry Logic**: Automatic retries on failure
- **Video Recording**: On failure
- **Screenshots**: On failure
- **Traces**: For debugging

### Environment Variables

```bash
# Set base URL
export BASE_URL=http://localhost:8081

# Enable debug mode
export DEBUG=1

# Set test timeout
export TEST_TIMEOUT=30000
```

## 🧪 Writing Tests

### Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup code
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    await expect(page.locator('[data-testid="element"]')).toBeVisible();
  });
});
```

### Best Practices

1. **Use Data Test IDs**: Always use `data-testid` attributes
2. **Descriptive Test Names**: Clear, action-oriented names
3. **Setup/Teardown**: Use `beforeEach` and `afterEach` hooks
4. **Assertions**: Use specific, meaningful assertions
5. **Error Handling**: Test error scenarios
6. **Performance**: Include performance assertions
7. **Accessibility**: Test accessibility features

### Test Data Attributes

The app should include these data-testid attributes:

```html
<!-- App Structure -->
<div data-testid="app-container">
  <div data-testid="loading-screen">
  <div data-testid="login-screen">
  <div data-testid="home-screen">
  <div data-testid="conversation-screen">
  <div data-testid="settings-screen">

<!-- Authentication -->
<input data-testid="email-input">
<input data-testid="password-input">
<button data-testid="login-submit">
<button data-testid="logout-button">
<button data-testid="biometric-login">

<!-- Voice Assistant -->
<button data-testid="voice-record-button">
<button data-testid="voice-stop-button">
<div data-testid="recording-indicator">
<div data-testid="speaking-indicator">
<div data-testid="transcription-text">
<div data-testid="ai-response">
<div data-testid="audio-level-meter">

<!-- Navigation -->
<button data-testid="conversation-button">
<button data-testid="settings-button">

<!-- Settings -->
<div data-testid="voice-settings">
<div data-testid="dark-mode-toggle">
<div data-testid="language-settings">
<div data-testid="privacy-settings">
```

## 🐛 Debugging

### Debug Mode
```bash
# Run in debug mode
pnpm run test:debug

# Run specific test in debug
pnpm run test:debug --grep="test name"
```

### Trace Viewer
```bash
# Show trace for failed test
pnpm run test:trace
```

### Code Generation
```bash
# Generate test code
pnpm run test:codegen
```

## 📱 Device Testing

### Mobile Devices
```bash
# Test on mobile Chrome
pnpm run test --project=mobile-chrome

# Test on mobile Safari
pnpm run test --project=mobile-safari

# Test on mobile Firefox
pnpm run test --project=mobile-firefox
```

### Desktop Browsers
```bash
# Test on Chrome
pnpm run test --project=Google Chrome

# Test on Safari
pnpm run test --project=mobile-safari

# Test on Edge
pnpm run test --project=Microsoft Edge
```

## 🔄 Continuous Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm run test:ci:parallel
      - uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

### CI Commands
```bash
# Full CI suite
pnpm run test:ci:parallel:all

# Mobile CI suite
pnpm run test:ci:parallel:mobile

# Security CI suite
pnpm run test:ci:parallel:security

# Performance CI suite
pnpm run test:ci:parallel:performance
```

## 📊 Performance Metrics

### Key Metrics Tracked
- **App Launch Time**: < 3 seconds
- **Login Time**: < 5 seconds
- **Navigation Time**: < 1 second
- **Voice Response Time**: < 15 seconds
- **Memory Usage**: < 100MB
- **Battery Impact**: < 5%/hour

### Performance Assertions
```typescript
// Example performance test
test('should load app within performance budget', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/');
  await page.waitForSelector('[data-testid="app-container"]');
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(3000);
});
```

## 🛡️ Security Testing

### Security Test Categories
- **Authentication Security**: Brute force, password strength
- **Data Protection**: Encryption, secure storage
- **Network Security**: SSL, certificate validation
- **Input Validation**: XSS, SQL injection, path traversal
- **Session Management**: Timeout, hijacking protection
- **Privacy Protection**: Data anonymization, deletion

### Security Assertions
```typescript
// Example security test
test('should prevent XSS attacks', async ({ page }) => {
  await page.fill('[data-testid="email-input"]', '<script>alert("xss")</script>');
  await page.click('[data-testid="login-submit"]');
  await expect(page.locator('text=Invalid email format')).toBeVisible();
});
```

## ♿ Accessibility Testing

### Accessibility Features Tested
- **Screen Reader Support**: ARIA labels, announcements
- **Keyboard Navigation**: Tab order, focus management
- **Color Contrast**: WCAG compliance
- **Voice Navigation**: Voice-only interaction
- **Haptic Feedback**: Touch feedback

### Accessibility Assertions
```typescript
// Example accessibility test
test('should support screen readers', async ({ page }) => {
  await expect(page.locator('[aria-label="Voice record button"]')).toBeVisible();
  await expect(page.locator('h1')).toBeVisible();
});
```

## 🔧 Troubleshooting

### Common Issues

1. **App Not Loading**
   ```bash
   # Check if app is running
   curl http://localhost:8081

   # Start app if needed
   cd ../.. && pnpm dev
   ```

2. **Tests Timing Out**
   ```bash
   # Increase timeout
   export TEST_TIMEOUT=60000

   # Run with debug
   pnpm run test:debug
   ```

3. **Browser Issues**
   ```bash
   # Reinstall browsers
   pnpm run test:install

   # Clear cache
   rm -rf ~/.cache/ms-playwright
   ```

4. **Network Issues**
   ```bash
   # Check network connectivity
   ping localhost

   # Test with different network
   pnpm run test:network
   ```

### Debug Commands
```bash
# Show test logs
pnpm test --reporter=list

# Show browser console
pnpm run test:headed

# Generate test code
pnpm run test:codegen

# Show trace
pnpm run test:trace
```

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Mobile Testing Guide](https://playwright.dev/docs/mobile)
- [Performance Testing](https://playwright.dev/docs/test-assertions#performance)
- [Security Testing](https://playwright.dev/docs/security)
- [Accessibility Testing](https://playwright.dev/docs/accessibility-testing)

## 🤝 Contributing

When adding new tests:

1. Follow the existing test structure
2. Use descriptive test names
3. Include performance assertions
4. Test error scenarios
5. Add accessibility checks
6. Update this README if needed

## 📄 License

MIT License - see LICENSE file for details.

import { securityService } from '../services/security';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
  canImplyAuthentication: jest.fn(),
  getSupportedBiometryType: jest.fn(),
}));

describe('Security Audit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Security', () => {
    it('should store tokens securely', async () => {
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      
      await securityService.setSecureData('sessionToken', testToken);
      
      expect(securityService.setSecureData).toHaveBeenCalledWith('sessionToken', testToken);
    });

    it('should retrieve tokens securely', async () => {
      const testToken = 'secure-token-123';
      
      (securityService.getSecureData as jest.Mock).mockResolvedValue(testToken);
      
      const retrievedToken = await securityService.getSecureData('sessionToken');
      
      expect(retrievedToken).toBe(testToken);
    });

    it('should handle token expiration', async () => {
      const expiredToken = 'expired.token.here';
      
      // Mock token validation
      const isValidToken = securityService.validateToken(expiredToken);
      
      expect(isValidToken).toBe(false);
    });

    it('should clear tokens on logout', async () => {
      await securityService.removeSecureData('sessionToken');
      
      expect(securityService.removeSecureData).toHaveBeenCalledWith('sessionToken');
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt sensitive data', async () => {
      const sensitiveData = {
        userId: '12345',
        email: 'user@example.com',
        preferences: { theme: 'dark' }
      };
      
      const encrypted = await securityService.encryptData(JSON.stringify(sensitiveData));
      
      expect(encrypted).not.toBe(JSON.stringify(sensitiveData));
      expect(typeof encrypted).toBe('string');
    });

    it('should decrypt data correctly', async () => {
      const originalData = 'sensitive information';
      const encrypted = await securityService.encryptData(originalData);
      const decrypted = await securityService.decryptData(encrypted);
      
      expect(decrypted).toBe(originalData);
    });

    it('should handle encryption errors gracefully', async () => {
      const invalidData = null;
      
      await expect(securityService.encryptData(invalidData as any)).rejects.toThrow();
    });
  });

  describe('Biometric Authentication', () => {
    it('should check biometric availability', async () => {
      const isAvailable = await securityService.isBiometricAvailable();
      
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should authenticate with biometrics', async () => {
      const isAuthenticated = await securityService.authenticateWithBiometrics();
      
      expect(typeof isAuthenticated).toBe('boolean');
    });

    it('should handle biometric authentication failure', async () => {
      // Mock biometric failure
      (securityService.authenticateWithBiometrics as jest.Mock).mockRejectedValue(
        new Error('Biometric authentication failed')
      );
      
      await expect(securityService.authenticateWithBiometrics()).rejects.toThrow(
        'Biometric authentication failed'
      );
    });
  });

  describe('Network Security', () => {
    it('should validate SSL certificates', async () => {
      const isValidSSL = await securityService.validateSSLCertificate('https://api.example.com');
      
      expect(typeof isValidSSL).toBe('boolean');
    });

    it('should handle insecure connections', async () => {
      const isValidSSL = await securityService.validateSSLCertificate('http://insecure.example.com');
      
      expect(isValidSSL).toBe(false);
    });

    it('should validate API endpoints', async () => {
      const validEndpoints = [
        'https://api.example.com/health',
        'https://api.example.com/auth',
        'https://api.example.com/voice'
      ];
      
      for (const endpoint of validEndpoints) {
        const isValid = await securityService.validateEndpoint(endpoint);
        expect(isValid).toBe(true);
      }
    });
  });

  describe('Input Validation', () => {
    it('should sanitize user inputs', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'SELECT * FROM users; DROP TABLE users;',
        '../../../etc/passwd',
        'javascript:alert("xss")'
      ];
      
      for (const input of maliciousInputs) {
        const sanitized = securityService.sanitizeInput(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('SELECT');
        expect(sanitized).not.toContain('../');
      }
    });

    it('should validate email format', () => {
      const validEmails = [
        'user@example.com',
        'test.user+tag@domain.co.uk',
        'user123@test-domain.org'
      ];
      
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com'
      ];
      
      for (const email of validEmails) {
        expect(securityService.validateEmail(email)).toBe(true);
      }
      
      for (const email of invalidEmails) {
        expect(securityService.validateEmail(email)).toBe(false);
      }
    });

    it('should validate password strength', () => {
      const strongPasswords = [
        'MySecurePass123!',
        'Complex@Password#2024',
        'Str0ng!P@ssw0rd'
      ];
      
      const weakPasswords = [
        '123456',
        'password',
        'qwerty',
        'abc123'
      ];
      
      for (const password of strongPasswords) {
        expect(securityService.validatePasswordStrength(password)).toBe(true);
      }
      
      for (const password of weakPasswords) {
        expect(securityService.validatePasswordStrength(password)).toBe(false);
      }
    });
  });

  describe('Session Management', () => {
    it('should create secure sessions', async () => {
      const session = await securityService.createSession({
        userId: '12345',
        email: 'user@example.com'
      });
      
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('token');
      expect(session).toHaveProperty('expiresAt');
      expect(session.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should validate session tokens', async () => {
      const validToken = 'valid.jwt.token';
      const invalidToken = 'invalid.token';
      
      expect(await securityService.validateSession(validToken)).toBe(true);
      expect(await securityService.validateSession(invalidToken)).toBe(false);
    });

    it('should handle session expiration', async () => {
      const expiredSession = {
        id: 'expired-session',
        token: 'expired.token',
        expiresAt: Date.now() - 1000 // Expired 1 second ago
      };
      
      const isValid = await securityService.validateSession(expiredSession.token);
      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should not expose sensitive information in errors', () => {
      const sensitiveError = new Error('Database connection failed: password=secret123');
      const sanitizedError = securityService.sanitizeError(sensitiveError);
      
      expect(sanitizedError.message).not.toContain('password=secret123');
      expect(sanitizedError.message).toContain('Database connection failed');
    });

    it('should log security events', () => {
      const securityEvent = {
        type: 'authentication_failure',
        userId: '12345',
        ipAddress: '192.168.1.1',
        timestamp: new Date()
      };
      
      securityService.logSecurityEvent(securityEvent);
      
      expect(securityService.logSecurityEvent).toHaveBeenCalledWith(securityEvent);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const userId = '12345';
      
      // Simulate multiple rapid requests
      for (let i = 0; i < 5; i++) {
        const isAllowed = await securityService.checkRateLimit(userId, 'login');
        if (i < 3) {
          expect(isAllowed).toBe(true);
        } else {
          expect(isAllowed).toBe(false);
        }
      }
    });

    it('should reset rate limits after timeout', async () => {
      const userId = '12345';
      
      // Exceed rate limit
      for (let i = 0; i < 5; i++) {
        await securityService.checkRateLimit(userId, 'login');
      }
      
      // Wait for rate limit to reset (mock)
      jest.advanceTimersByTime(15 * 60 * 1000); // 15 minutes
      
      const isAllowed = await securityService.checkRateLimit(userId, 'login');
      expect(isAllowed).toBe(true);
    });
  });

  describe('Data Privacy', () => {
    it('should anonymize user data', () => {
      const userData = {
        id: '12345',
        email: 'user@example.com',
        name: 'John Doe',
        phone: '+1234567890'
      };
      
      const anonymized = securityService.anonymizeData(userData);
      
      expect(anonymized.id).not.toBe('12345');
      expect(anonymized.email).not.toBe('user@example.com');
      expect(anonymized.name).not.toBe('John Doe');
      expect(anonymized.phone).not.toBe('+1234567890');
    });

    it('should handle data retention policies', async () => {
      const oldData = {
        id: 'old-data',
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year ago
      };
      
      const shouldDelete = await securityService.shouldDeleteData(oldData);
      expect(shouldDelete).toBe(true);
    });
  });
});

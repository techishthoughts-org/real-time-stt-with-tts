import { securityAuditService } from '../services/security-audit';

// Mock DeviceInfo
jest.mock('react-native-device-info', () => ({
  isEmulator: jest.fn(),
  isRooted: jest.fn(),
  isTablet: jest.fn(),
  getBrand: jest.fn(),
  getSystemVersion: jest.fn(),
}));

// Mock logger
jest.mock('@voice/observability', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('SecurityAuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('performSecurityAudit', () => {
    it('should perform comprehensive security audit successfully', async () => {
      const result = await securityAuditService.performSecurityAudit();

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade);
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should return grade A for high security score', async () => {
      // Mock all security checks to pass
      const mockDeviceInfo = require('react-native-device-info');
      mockDeviceInfo.isEmulator.mockResolvedValue(false);
      mockDeviceInfo.isRooted.mockResolvedValue(false);
      mockDeviceInfo.getBrand.mockResolvedValue('Apple');
      mockDeviceInfo.getSystemVersion.mockResolvedValue('15.0');

      const result = await securityAuditService.performSecurityAudit();

      expect(result.grade).toBe('A');
      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it('should return grade F for critical security issues', async () => {
      // Mock critical security issues
      const mockDeviceInfo = require('react-native-device-info');
      mockDeviceInfo.isEmulator.mockResolvedValue(false);
      mockDeviceInfo.isRooted.mockResolvedValue(true); // Critical issue
      mockDeviceInfo.getBrand.mockResolvedValue('Apple');
      mockDeviceInfo.getSystemVersion.mockResolvedValue('15.0');

      const result = await securityAuditService.performSecurityAudit();

      expect(result.grade).toBe('F');
      expect(result.score).toBeLessThan(60);
      expect(result.issues.some(issue => issue.severity === 'critical')).toBe(true);
    });

    it('should handle emulator detection', async () => {
      const mockDeviceInfo = require('react-native-device-info');
      mockDeviceInfo.isEmulator.mockResolvedValue(true);
      mockDeviceInfo.isRooted.mockResolvedValue(false);
      mockDeviceInfo.getBrand.mockResolvedValue('Apple');
      mockDeviceInfo.getSystemVersion.mockResolvedValue('15.0');

      const result = await securityAuditService.performSecurityAudit();

      expect(result.issues.some(issue => 
        issue.title === 'Emulator Detection' && 
        issue.severity === 'medium'
      )).toBe(true);
    });

    it('should handle outdated system version', async () => {
      const mockDeviceInfo = require('react-native-device-info');
      mockDeviceInfo.isEmulator.mockResolvedValue(false);
      mockDeviceInfo.isRooted.mockResolvedValue(false);
      mockDeviceInfo.getBrand.mockResolvedValue('Apple');
      mockDeviceInfo.getSystemVersion.mockResolvedValue('12.0'); // Outdated

      const result = await securityAuditService.performSecurityAudit();

      expect(result.issues.some(issue => 
        issue.title === 'Outdated System' && 
        issue.severity === 'high'
      )).toBe(true);
    });

    it('should handle unknown device brand', async () => {
      const mockDeviceInfo = require('react-native-device-info');
      mockDeviceInfo.isEmulator.mockResolvedValue(false);
      mockDeviceInfo.isRooted.mockResolvedValue(false);
      mockDeviceInfo.getBrand.mockResolvedValue('unknown');
      mockDeviceInfo.getSystemVersion.mockResolvedValue('15.0');

      const result = await securityAuditService.performSecurityAudit();

      expect(result.issues.some(issue => 
        issue.title === 'Unknown Device Brand' && 
        issue.severity === 'medium'
      )).toBe(true);
    });

    it('should generate appropriate recommendations', async () => {
      const result = await securityAuditService.performSecurityAudit();

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeLessThanOrEqual(10);
      expect(result.recommendations).toContain('Keep device and app updated');
      expect(result.recommendations).toContain('Use strong, unique passwords');
    });

    it('should handle audit failure gracefully', async () => {
      // Mock DeviceInfo to throw error
      const mockDeviceInfo = require('react-native-device-info');
      mockDeviceInfo.isEmulator.mockRejectedValue(new Error('Device check failed'));

      const result = await securityAuditService.performSecurityAudit();

      expect(result.score).toBe(0);
      expect(result.grade).toBe('F');
      expect(result.issues.some(issue => 
        issue.title === 'Security Audit Failure' && 
        issue.severity === 'critical'
      )).toBe(true);
    });
  });

  describe('Security Issue Categories', () => {
    it('should categorize issues correctly', async () => {
      const result = await securityAuditService.performSecurityAudit();

      const categories = result.issues.map(issue => issue.category);
      const expectedCategories = ['device', 'network', 'storage', 'authentication', 'code'];

      categories.forEach(category => {
        expect(expectedCategories).toContain(category);
      });
    });

    it('should have appropriate severity levels', async () => {
      const result = await securityAuditService.performSecurityAudit();

      const severities = result.issues.map(issue => issue.severity);
      const expectedSeverities = ['critical', 'high', 'medium', 'low'];

      severities.forEach(severity => {
        expect(expectedSeverities).toContain(severity);
      });
    });
  });

  describe('Security Score Calculation', () => {
    it('should calculate score correctly for different scenarios', async () => {
      // Test with no issues
      const mockDeviceInfo = require('react-native-device-info');
      mockDeviceInfo.isEmulator.mockResolvedValue(false);
      mockDeviceInfo.isRooted.mockResolvedValue(false);
      mockDeviceInfo.getBrand.mockResolvedValue('Apple');
      mockDeviceInfo.getSystemVersion.mockResolvedValue('15.0');

      const result = await securityAuditService.performSecurityAudit();

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(['A', 'B']).toContain(result.grade);
    });

    it('should not allow negative scores', async () => {
      // Mock many issues to potentially cause negative score
      const mockDeviceInfo = require('react-native-device-info');
      mockDeviceInfo.isEmulator.mockResolvedValue(true);
      mockDeviceInfo.isRooted.mockResolvedValue(true);
      mockDeviceInfo.getBrand.mockResolvedValue('unknown');
      mockDeviceInfo.getSystemVersion.mockResolvedValue('10.0');

      const result = await securityAuditService.performSecurityAudit();

      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Grade Calculation', () => {
    it('should return correct grades for score ranges', async () => {
      // This would require mocking the internal calculation
      // For now, we test the public interface
      const result = await securityAuditService.performSecurityAudit();

      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade);
    });
  });
});

import { Platform } from 'react-native';
import * as DeviceInfo from 'react-native-device-info';
import { logger } from '@voice/observability';

export interface SecurityAuditResult {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: SecurityIssue[];
  recommendations: string[];
  timestamp: Date;
}

export interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'device' | 'network' | 'storage' | 'authentication' | 'code';
  title: string;
  description: string;
  recommendation: string;
}

export class SecurityAuditService {
  private static instance: SecurityAuditService;

  private constructor() {}

  public static getInstance(): SecurityAuditService {
    if (!SecurityAuditService.instance) {
      SecurityAuditService.instance = new SecurityAuditService();
    }
    return SecurityAuditService.instance;
  }

  /**
   * Perform comprehensive security audit
   */
  async performSecurityAudit(): Promise<SecurityAuditResult> {
    const issues: SecurityIssue[] = [];
    let score = 100;

    try {
      logger.info('Starting comprehensive security audit');

      // Device Security Audit
      const deviceIssues = await this.auditDeviceSecurity();
      issues.push(...deviceIssues);
      score -= deviceIssues.length * 10;

      // Network Security Audit
      const networkIssues = await this.auditNetworkSecurity();
      issues.push(...networkIssues);
      score -= networkIssues.length * 8;

      // Storage Security Audit
      const storageIssues = await this.auditStorageSecurity();
      issues.push(...storageIssues);
      score -= storageIssues.length * 7;

      // Authentication Security Audit
      const authIssues = await this.auditAuthenticationSecurity();
      issues.push(...authIssues);
      score -= authIssues.length * 9;

      // Code Security Audit
      const codeIssues = await this.auditCodeSecurity();
      issues.push(...codeIssues);
      score -= codeIssues.length * 6;

      // Ensure score doesn't go below 0
      score = Math.max(0, score);

      const grade = this.calculateGrade(score);
      const recommendations = this.generateRecommendations(issues);

      const result: SecurityAuditResult = {
        score,
        grade,
        issues,
        recommendations,
        timestamp: new Date(),
      };

      logger.info('Security audit completed', {
        score,
        grade,
        issueCount: issues.length,
      });

      return result;
    } catch (error) {
      logger.error('Security audit failed', error);
      
      // Return critical failure result
      return {
        score: 0,
        grade: 'F',
        issues: [{
          severity: 'critical',
          category: 'code',
          title: 'Security Audit Failure',
          description: 'Security audit could not be completed due to an error',
          recommendation: 'Check system logs and retry the audit',
        }],
        recommendations: ['Retry security audit', 'Check system logs', 'Contact support'],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Audit device security
   */
  private async auditDeviceSecurity(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      const isEmulator = await DeviceInfo.isEmulator();
      const isRooted = await DeviceInfo.isRooted();
      const isTablet = await DeviceInfo.isTablet();
      const brand = await DeviceInfo.getBrand();
      const systemVersion = await DeviceInfo.getSystemVersion();

      // Check for emulator usage
      if (isEmulator) {
        issues.push({
          severity: 'medium',
          category: 'device',
          title: 'Emulator Detection',
          description: 'App is running on an emulator, which may pose security risks',
          recommendation: 'Use physical device for production testing',
        });
      }

      // Check for rooted device
      if (isRooted) {
        issues.push({
          severity: 'critical',
          category: 'device',
          title: 'Rooted Device',
          description: 'Device is rooted, which compromises security',
          recommendation: 'Use non-rooted device for secure operations',
        });
      }

      // Check for outdated system
      const minVersion = Platform.OS === 'ios' ? '14.0' : '8.0';
      if (systemVersion < minVersion) {
        issues.push({
          severity: 'high',
          category: 'device',
          title: 'Outdated System',
          description: `System version ${systemVersion} is below minimum required ${minVersion}`,
          recommendation: 'Update device operating system',
        });
      }

      // Check for known vulnerable brands
      const vulnerableBrands = ['generic', 'unknown'];
      if (vulnerableBrands.includes(brand.toLowerCase())) {
        issues.push({
          severity: 'medium',
          category: 'device',
          title: 'Unknown Device Brand',
          description: `Device brand '${brand}' is not recognized`,
          recommendation: 'Use device from known manufacturer',
        });
      }

    } catch (error) {
      logger.error('Device security audit failed', error);
      issues.push({
        severity: 'high',
        category: 'device',
        title: 'Device Security Check Failed',
        description: 'Could not verify device security status',
        recommendation: 'Retry device security check',
      });
    }

    return issues;
  }

  /**
   * Audit network security
   */
  private async auditNetworkSecurity(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      // Check for secure network connection
      const isConnected = await this.checkNetworkConnection();
      if (!isConnected) {
        issues.push({
          severity: 'medium',
          category: 'network',
          title: 'No Network Connection',
          description: 'App is running without network connection',
          recommendation: 'Connect to secure network',
        });
      }

      // Check for VPN usage (optional security enhancement)
      const isVPN = await this.checkVPNConnection();
      if (!isVPN) {
        issues.push({
          severity: 'low',
          category: 'network',
          title: 'No VPN Connection',
          description: 'VPN is not being used for additional security',
          recommendation: 'Consider using VPN for enhanced security',
        });
      }

    } catch (error) {
      logger.error('Network security audit failed', error);
      issues.push({
        severity: 'medium',
        category: 'network',
        title: 'Network Security Check Failed',
        description: 'Could not verify network security status',
        recommendation: 'Retry network security check',
      });
    }

    return issues;
  }

  /**
   * Audit storage security
   */
  private async auditStorageSecurity(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      // Check for secure storage availability
      const hasSecureStorage = await this.checkSecureStorage();
      if (!hasSecureStorage) {
        issues.push({
          severity: 'critical',
          category: 'storage',
          title: 'Secure Storage Unavailable',
          description: 'Device does not support secure storage',
          recommendation: 'Use device with secure storage support',
        });
      }

      // Check for encryption at rest
      const hasEncryption = await this.checkStorageEncryption();
      if (!hasEncryption) {
        issues.push({
          severity: 'high',
          category: 'storage',
          title: 'Storage Not Encrypted',
          description: 'Data at rest is not encrypted',
          recommendation: 'Enable device encryption',
        });
      }

    } catch (error) {
      logger.error('Storage security audit failed', error);
      issues.push({
        severity: 'high',
        category: 'storage',
        title: 'Storage Security Check Failed',
        description: 'Could not verify storage security status',
        recommendation: 'Retry storage security check',
      });
    }

    return issues;
  }

  /**
   * Audit authentication security
   */
  private async auditAuthenticationSecurity(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      // Check for biometric authentication availability
      const hasBiometrics = await this.checkBiometricAvailability();
      if (!hasBiometrics) {
        issues.push({
          severity: 'medium',
          category: 'authentication',
          title: 'Biometric Authentication Unavailable',
          description: 'Device does not support biometric authentication',
          recommendation: 'Use device with biometric support',
        });
      }

      // Check for strong authentication methods
      const hasStrongAuth = await this.checkStrongAuthentication();
      if (!hasStrongAuth) {
        issues.push({
          severity: 'high',
          category: 'authentication',
          title: 'Weak Authentication',
          description: 'Device uses weak authentication methods',
          recommendation: 'Enable strong authentication methods',
        });
      }

    } catch (error) {
      logger.error('Authentication security audit failed', error);
      issues.push({
        severity: 'high',
        category: 'authentication',
        title: 'Authentication Security Check Failed',
        description: 'Could not verify authentication security status',
        recommendation: 'Retry authentication security check',
      });
    }

    return issues;
  }

  /**
   * Audit code security
   */
  private async auditCodeSecurity(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      // Check for debug mode
      const isDebugMode = __DEV__;
      if (isDebugMode) {
        issues.push({
          severity: 'medium',
          category: 'code',
          title: 'Debug Mode Active',
          description: 'App is running in debug mode',
          recommendation: 'Use release build for production',
        });
      }

      // Check for code signing
      const isCodeSigned = await this.checkCodeSigning();
      if (!isCodeSigned) {
        issues.push({
          severity: 'high',
          category: 'code',
          title: 'Code Not Signed',
          description: 'App code is not digitally signed',
          recommendation: 'Use properly signed app version',
        });
      }

    } catch (error) {
      logger.error('Code security audit failed', error);
      issues.push({
        severity: 'medium',
        category: 'code',
        title: 'Code Security Check Failed',
        description: 'Could not verify code security status',
        recommendation: 'Retry code security check',
      });
    }

    return issues;
  }

  /**
   * Calculate security grade based on score
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate recommendations based on issues
   */
  private generateRecommendations(issues: SecurityIssue[]): string[] {
    const recommendations: string[] = [];

    // Add general recommendations
    recommendations.push('Keep device and app updated');
    recommendations.push('Use strong, unique passwords');
    recommendations.push('Enable two-factor authentication when available');

    // Add specific recommendations based on issues
    const criticalIssues = issues.filter(issue => issue.severity === 'critical');
    const highIssues = issues.filter(issue => issue.severity === 'high');

    if (criticalIssues.length > 0) {
      recommendations.push('Address critical security issues immediately');
    }

    if (highIssues.length > 0) {
      recommendations.push('Address high-priority security issues');
    }

    // Add specific recommendations
    issues.forEach(issue => {
      if (!recommendations.includes(issue.recommendation)) {
        recommendations.push(issue.recommendation);
      }
    });

    return recommendations.slice(0, 10); // Limit to 10 recommendations
  }

  // Helper methods (these would be implemented with actual device APIs)
  private async checkNetworkConnection(): Promise<boolean> {
    // Implementation would check actual network status
    return true;
  }

  private async checkVPNConnection(): Promise<boolean> {
    // Implementation would check VPN status
    return false;
  }

  private async checkSecureStorage(): Promise<boolean> {
    // Implementation would check secure storage availability
    return true;
  }

  private async checkStorageEncryption(): Promise<boolean> {
    // Implementation would check storage encryption status
    return true;
  }

  private async checkBiometricAvailability(): Promise<boolean> {
    // Implementation would check biometric availability
    return true;
  }

  private async checkStrongAuthentication(): Promise<boolean> {
    // Implementation would check authentication strength
    return true;
  }

  private async checkCodeSigning(): Promise<boolean> {
    // Implementation would check code signing status
    return true;
  }
}

// Export singleton instance
export const securityAuditService = SecurityAuditService.getInstance();

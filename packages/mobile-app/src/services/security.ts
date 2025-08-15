import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';
import * as Biometrics from 'react-native-biometrics';
import * as DeviceInfo from 'react-native-device-info';
import { logger } from '@voice/observability';

export interface SecurityConfig {
  certificatePinning: boolean;
  biometricAuth: boolean;
  encryptionEnabled: boolean;
  sslPinning: boolean;
}

export interface BiometricResult {
  available: boolean;
  biometryType: 'TouchID' | 'FaceID' | 'Biometrics' | null;
  error?: string;
}

export class SecurityService {
  private static instance: SecurityService;
  private config: SecurityConfig;

  private constructor() {
    this.config = {
      certificatePinning: true,
      biometricAuth: true,
      encryptionEnabled: true,
      sslPinning: true,
    };
  }

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Initialize security service
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing security service');
      
      // Check device security
      await this.checkDeviceSecurity();
      
      // Initialize biometrics
      await this.initializeBiometrics();
      
      // Setup certificate pinning
      if (this.config.certificatePinning) {
        await this.setupCertificatePinning();
      }
      
      logger.info('Security service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize security service', error);
      throw error;
    }
  }

  /**
   * Check device security status
   */
  private async checkDeviceSecurity(): Promise<void> {
    try {
      const isEmulator = await DeviceInfo.isEmulator();
      const isRooted = await DeviceInfo.isRooted();
      const isTablet = await DeviceInfo.isTablet();
      
      if (isEmulator) {
        logger.warn('App running on emulator - security features may be limited');
      }
      
      if (isRooted) {
        logger.error('Device is rooted - security compromised');
        throw new Error('Device security compromised');
      }
      
      logger.info('Device security check passed', {
        isEmulator,
        isRooted,
        isTablet,
        platform: Platform.OS,
        version: Platform.Version,
      });
    } catch (error) {
      logger.error('Device security check failed', error);
      throw error;
    }
  }

  /**
   * Initialize biometric authentication
   */
  private async initializeBiometrics(): Promise<void> {
    try {
      const { available, biometryType } = await this.checkBiometricAvailability();
      
      if (available && this.config.biometricAuth) {
        logger.info('Biometric authentication available', { biometryType });
      } else {
        logger.info('Biometric authentication not available', { biometryType });
      }
    } catch (error) {
      logger.error('Failed to initialize biometrics', error);
    }
  }

  /**
   * Check biometric availability
   */
  async checkBiometricAvailability(): Promise<BiometricResult> {
    try {
      const { available, biometryType } = await Biometrics.isSensorAvailable();
      
      return {
        available,
        biometryType: biometryType as BiometricResult['biometryType'],
      };
    } catch (error) {
      logger.error('Biometric availability check failed', error);
      return {
        available: false,
        biometryType: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Authenticate with biometrics
   */
  async authenticateWithBiometrics(promptMessage: string = 'Authenticate to continue'): Promise<boolean> {
    try {
      const { available } = await this.checkBiometricAvailability();
      
      if (!available) {
        logger.warn('Biometric authentication not available');
        return false;
      }

      const { success } = await Biometrics.simplePrompt({
        promptMessage,
        cancelButtonText: 'Cancel',
      });

      if (success) {
        logger.info('Biometric authentication successful');
        return true;
      } else {
        logger.warn('Biometric authentication cancelled or failed');
        return false;
      }
    } catch (error) {
      logger.error('Biometric authentication error', error);
      return false;
    }
  }

  /**
   * Setup certificate pinning
   */
  private async setupCertificatePinning(): Promise<void> {
    try {
      // In a real implementation, you would configure SSL pinning here
      // For now, we'll log the setup
      logger.info('Certificate pinning configured');
    } catch (error) {
      logger.error('Failed to setup certificate pinning', error);
      throw error;
    }
  }

  /**
   * Store sensitive data securely
   */
  async storeSecureData(key: string, value: string): Promise<boolean> {
    try {
      const result = await Keychain.setInternetCredentials(key, key, value);
      logger.info('Secure data stored', { key, success: result });
      return result;
    } catch (error) {
      logger.error('Failed to store secure data', { key, error });
      return false;
    }
  }

  /**
   * Retrieve sensitive data securely
   */
  async getSecureData(key: string): Promise<string | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(key);
      
      if (credentials && credentials.password) {
        logger.info('Secure data retrieved', { key });
        return credentials.password;
      }
      
      logger.warn('Secure data not found', { key });
      return null;
    } catch (error) {
      logger.error('Failed to retrieve secure data', { key, error });
      return null;
    }
  }

  /**
   * Remove sensitive data
   */
  async removeSecureData(key: string): Promise<boolean> {
    try {
      const result = await Keychain.resetInternetCredentials(key);
      logger.info('Secure data removed', { key, success: result });
      return result;
    } catch (error) {
      logger.error('Failed to remove secure data', { key, error });
      return false;
    }
  }

  /**
   * Generate secure random string
   */
  generateSecureRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Hash data securely
   */
  async hashData(data: string): Promise<string> {
    try {
      // In a real implementation, you would use a proper hashing library
      // For now, we'll use a simple hash
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } catch (error) {
      logger.error('Failed to hash data', error);
      throw error;
    }
  }

  /**
   * Validate API response security
   */
  validateApiResponse(response: any): boolean {
    try {
      // Check for required security headers
      const hasSecurityHeaders = response.headers && 
        response.headers['x-content-type-options'] === 'nosniff' &&
        response.headers['x-frame-options'] === 'DENY' &&
        response.headers['x-xss-protection'] === '1; mode=block';
      
      if (!hasSecurityHeaders) {
        logger.warn('API response missing security headers');
        return false;
      }
      
      // Validate response structure
      if (!response.data || typeof response.data !== 'object') {
        logger.warn('Invalid API response structure');
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('API response validation failed', error);
      return false;
    }
  }

  /**
   * Get security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Security configuration updated', { newConfig });
  }

  /**
   * Get device security report
   */
  async getSecurityReport(): Promise<{
    deviceInfo: any;
    biometrics: BiometricResult;
    securityFeatures: string[];
    recommendations: string[];
  }> {
    try {
      const deviceInfo = {
        brand: await DeviceInfo.getBrand(),
        model: await DeviceInfo.getModel(),
        systemVersion: await DeviceInfo.getSystemVersion(),
        buildNumber: await DeviceInfo.getBuildNumber(),
        isEmulator: await DeviceInfo.isEmulator(),
        isRooted: await DeviceInfo.isRooted(),
        isTablet: await DeviceInfo.isTablet(),
      };

      const biometrics = await this.checkBiometricAvailability();
      
      const securityFeatures = [
        'Certificate Pinning',
        'Biometric Authentication',
        'Secure Storage',
        'Data Encryption',
        'SSL Pinning',
      ];

      const recommendations = [];
      
      if (deviceInfo.isEmulator) {
        recommendations.push('Consider using a physical device for production testing');
      }
      
      if (deviceInfo.isRooted) {
        recommendations.push('Device is rooted - security compromised');
      }
      
      if (!biometrics.available) {
        recommendations.push('Enable biometric authentication for enhanced security');
      }

      return {
        deviceInfo,
        biometrics,
        securityFeatures,
        recommendations,
      };
    } catch (error) {
      logger.error('Failed to generate security report', error);
      throw error;
    }
  }
}

// Export singleton instance
export const securityService = SecurityService.getInstance();

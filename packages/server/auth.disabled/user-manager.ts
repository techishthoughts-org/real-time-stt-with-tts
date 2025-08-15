import { logger } from '@voice/observability';
import crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  createdAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  quota: UserQuota;
  preferences: UserPreferences;
}

export interface UserQuota {
  maxRequestsPerDay: number;
  maxConcurrentSessions: number;
  maxStorageGB: number;
  currentRequestsToday: number;
  currentSessions: number;
  currentStorageGB: number;
}

export interface UserPreferences {
  language: string;
  voiceSettings: {
    speed: number;
    pitch: number;
    volume: number;
  };
  notificationSettings: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
  ENTERPRISE = 'enterprise'
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  settings: TenantSettings;
  createdAt: Date;
  isActive: boolean;
}

export interface TenantSettings {
  maxUsers: number;
  features: string[];
  customBranding?: {
    logo?: string;
    colors?: {
      primary: string;
      secondary: string;
    };
  };
}

export class UserManager {
  private users: Map<string, User> = new Map();
  private tenants: Map<string, Tenant> = new Map();
  private sessions: Map<string, UserSession> = new Map();

  constructor() {
    this.initializeDefaultTenant();
  }

  private initializeDefaultTenant() {
    const defaultTenant: Tenant = {
      id: 'default',
      name: 'Default Tenant',
      domain: 'default',
      settings: {
        maxUsers: 1000,
        features: ['voice', 'llm', 'analytics']
      },
      createdAt: new Date(),
      isActive: true
    };

    this.tenants.set(defaultTenant.id, defaultTenant);
    logger.info('Default tenant initialized');
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'lastLoginAt' | 'isActive' | 'quota' | 'preferences'>): Promise<User> {
    const userId = crypto.randomUUID();
    const tenant = this.tenants.get(userData.tenantId);

    if (!tenant) {
      throw new Error(`Tenant ${userData.tenantId} not found`);
    }

    const user: User = {
      ...userData,
      id: userId,
      createdAt: new Date(),
      isActive: true,
      quota: {
        maxRequestsPerDay: 1000,
        maxConcurrentSessions: 5,
        maxStorageGB: 10,
        currentRequestsToday: 0,
        currentSessions: 0,
        currentStorageGB: 0
      },
      preferences: {
        language: 'pt-BR',
        voiceSettings: {
          speed: 1.0,
          pitch: 1.0,
          volume: 1.0
        },
        notificationSettings: {
          email: true,
          push: false,
          sms: false
        }
      }
    };

    this.users.set(userId, user);
    logger.info('User created', { userId, email: user.email, tenantId: user.tenantId });

    return user;
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const user = this.users.get(userId);
    if (!user) {
      return null;
    }

    const updatedUser = { ...user, ...updates };
    this.users.set(userId, updatedUser);

    logger.info('User updated', { userId, updates: Object.keys(updates) });
    return updatedUser;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }

    this.users.delete(userId);
    logger.info('User deleted', { userId, email: user.email });
    return true;
  }

  async createSession(userId: string, sessionData: Omit<UserSession, 'id' | 'createdAt' | 'lastActivity' | 'userId'>): Promise<UserSession> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check quota
    if (user.quota.currentSessions >= user.quota.maxConcurrentSessions) {
      throw new Error('Maximum concurrent sessions reached');
    }

    const sessionId = crypto.randomUUID();
    const session: UserSession = {
      ...sessionData,
      id: sessionId,
      userId,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.sessions.set(sessionId, session);

    // Update user quota
    user.quota.currentSessions++;
    this.users.set(userId, user);

    logger.info('Session created', { sessionId, userId });
    return session;
  }

  async getSession(sessionId: string): Promise<UserSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Update user quota
    const user = await this.getUserById(session.userId);
    if (user) {
      user.quota.currentSessions--;
      this.users.set(session.userId, user);
    }

    this.sessions.delete(sessionId);
    logger.info('Session deleted', { sessionId, userId: session.userId });
    return true;
  }

  async checkQuota(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const user = await this.getUserById(userId);
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    if (!user.isActive) {
      return { allowed: false, reason: 'User account is inactive' };
    }

    if (user.quota.currentRequestsToday >= user.quota.maxRequestsPerDay) {
      return { allowed: false, reason: 'Daily request quota exceeded' };
    }

    return { allowed: true };
  }

  async incrementRequestCount(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (user) {
      user.quota.currentRequestsToday++;
      this.users.set(userId, user);
    }
  }

  async resetDailyQuotas(): Promise<void> {
    for (const user of this.users.values()) {
      user.quota.currentRequestsToday = 0;
      this.users.set(user.id, user);
    }
    logger.info('Daily quotas reset for all users');
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.tenantId === tenantId);
  }

  async getActiveSessionsByUser(userId: string): Promise<UserSession[]> {
    return Array.from(this.sessions.values()).filter(session => session.userId === userId);
  }

  async cleanupExpiredSessions(maxAgeHours: number = 24): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < cutoff) {
        await this.deleteSession(sessionId);
        cleanedCount++;
      }
    }

    logger.info('Cleaned up expired sessions', { count: cleanedCount });
    return cleanedCount;
  }
}

export interface UserSession {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
}

export const userManager = new UserManager();

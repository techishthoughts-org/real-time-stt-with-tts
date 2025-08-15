import { beforeEach, describe, expect, it } from 'vitest';
import { UserManager, UserRole } from './user-manager';

describe('UserManager', () => {
  let userManager: UserManager;

  beforeEach(() => {
    userManager = new UserManager();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        tenantId: 'default'
      };

      const user = await userManager.createUser(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.role).toBe(userData.role);
      expect(user.tenantId).toBe(userData.tenantId);
      expect(user.isActive).toBe(true);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.quota).toBeDefined();
      expect(user.preferences).toBeDefined();
    });

    it('should throw error for non-existent tenant', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        tenantId: 'non-existent'
      };

      await expect(userManager.createUser(userData)).rejects.toThrow('Tenant non-existent not found');
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        tenantId: 'default'
      };

      const createdUser = await userManager.createUser(userData);
      const foundUser = await userManager.getUserById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe(userData.email);
    });

    it('should return null for non-existent user', async () => {
      const foundUser = await userManager.getUserById('non-existent-id');
      expect(foundUser).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        tenantId: 'default'
      };

      await userManager.createUser(userData);
      const foundUser = await userManager.getUserByEmail(userData.email);

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(userData.email);
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await userManager.getUserByEmail('nonexistent@example.com');
      expect(foundUser).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        tenantId: 'default'
      };

      const user = await userManager.createUser(userData);
      const updatedUser = await userManager.updateUser(user.id, { name: 'Updated Name' });

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.name).toBe('Updated Name');
      expect(updatedUser?.email).toBe(userData.email); // Should remain unchanged
    });

    it('should return null for non-existent user', async () => {
      const updatedUser = await userManager.updateUser('non-existent-id', { name: 'Updated Name' });
      expect(updatedUser).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        tenantId: 'default'
      };

      const user = await userManager.createUser(userData);
      const deleted = await userManager.deleteUser(user.id);

      expect(deleted).toBe(true);

      const foundUser = await userManager.getUserById(user.id);
      expect(foundUser).toBeNull();
    });

    it('should return false for non-existent user', async () => {
      const deleted = await userManager.deleteUser('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('createSession', () => {
    it('should create session successfully', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        tenantId: 'default'
      };

      const user = await userManager.createUser(userData);
      const session = await userManager.createSession(user.id, {
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent'
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(user.id);
      expect(session.ipAddress).toBe('127.0.0.1');
      expect(session.userAgent).toBe('Test Agent');
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastActivity).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent user', async () => {
      await expect(userManager.createSession('non-existent-id', {
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent'
      })).rejects.toThrow('User not found');
    });
  });

  describe('getSession', () => {
    it('should return session by ID', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        tenantId: 'default'
      };

      const user = await userManager.createUser(userData);
      const createdSession = await userManager.createSession(user.id, {
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent'
      });

      const foundSession = await userManager.getSession(createdSession.id);
      expect(foundSession).toBeDefined();
      expect(foundSession?.id).toBe(createdSession.id);
    });

    it('should return null for non-existent session', async () => {
      const foundSession = await userManager.getSession('non-existent-session');
      expect(foundSession).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete session successfully', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        tenantId: 'default'
      };

      const user = await userManager.createUser(userData);
      const session = await userManager.createSession(user.id, {
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent'
      });

      const deleted = await userManager.deleteSession(session.id);
      expect(deleted).toBe(true);

      const foundSession = await userManager.getSession(session.id);
      expect(foundSession).toBeNull();
    });

    it('should return false for non-existent session', async () => {
      const deleted = await userManager.deleteSession('non-existent-session');
      expect(deleted).toBe(false);
    });
  });

  describe('checkQuota', () => {
    it('should allow request when quota is available', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        tenantId: 'default'
      };

      const user = await userManager.createUser(userData);
      const quotaCheck = await userManager.checkQuota(user.id);

      expect(quotaCheck.allowed).toBe(true);
      expect(quotaCheck.reason).toBeUndefined();
    });

    it('should deny request when quota is exceeded', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        tenantId: 'default'
      };

      const user = await userManager.createUser(userData);

      // Set quota to exceeded
      await userManager.updateUser(user.id, {
        quota: {
          ...user.quota,
          currentRequestsToday: user.quota.maxRequestsPerDay
        }
      });

      const quotaCheck = await userManager.checkQuota(user.id);
      expect(quotaCheck.allowed).toBe(false);
      expect(quotaCheck.reason).toBe('Daily request quota exceeded');
    });

    it('should deny request for inactive user', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        tenantId: 'default'
      };

      const user = await userManager.createUser(userData);
      await userManager.updateUser(user.id, { isActive: false });

      const quotaCheck = await userManager.checkQuota(user.id);
      expect(quotaCheck.allowed).toBe(false);
      expect(quotaCheck.reason).toBe('User account is inactive');
    });

    it('should deny request for non-existent user', async () => {
      const quotaCheck = await userManager.checkQuota('non-existent-id');
      expect(quotaCheck.allowed).toBe(false);
      expect(quotaCheck.reason).toBe('User not found');
    });
  });

  describe('incrementRequestCount', () => {
    it('should increment request count', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        tenantId: 'default'
      };

      const user = await userManager.createUser(userData);
      const initialCount = user.quota.currentRequestsToday;

      await userManager.incrementRequestCount(user.id);

      const updatedUser = await userManager.getUserById(user.id);
      expect(updatedUser?.quota.currentRequestsToday).toBe(initialCount + 1);
    });
  });

  describe('resetDailyQuotas', () => {
    it('should reset daily quotas for all users', async () => {
      const userData1 = {
        email: 'test1@example.com',
        name: 'Test User 1',
        role: UserRole.USER,
        tenantId: 'default'
      };

      const userData2 = {
        email: 'test2@example.com',
        name: 'Test User 2',
        role: UserRole.USER,
        tenantId: 'default'
      };

      const user1 = await userManager.createUser(userData1);
      const user2 = await userManager.createUser(userData2);

      // Set some request counts
      await userManager.updateUser(user1.id, {
        quota: { ...user1.quota, currentRequestsToday: 50 }
      });
      await userManager.updateUser(user2.id, {
        quota: { ...user2.quota, currentRequestsToday: 100 }
      });

      await userManager.resetDailyQuotas();

      const updatedUser1 = await userManager.getUserById(user1.id);
      const updatedUser2 = await userManager.getUserById(user2.id);

      expect(updatedUser1?.quota.currentRequestsToday).toBe(0);
      expect(updatedUser2?.quota.currentRequestsToday).toBe(0);
    });
  });

  describe('getUsersByTenant', () => {
    it('should return users for specific tenant', async () => {
      const userData1 = {
        email: 'test1@example.com',
        name: 'Test User 1',
        role: UserRole.USER,
        tenantId: 'default'
      };

      const userData2 = {
        email: 'test2@example.com',
        name: 'Test User 2',
        role: UserRole.USER,
        tenantId: 'default'
      };

      await userManager.createUser(userData1);
      await userManager.createUser(userData2);

      const users = await userManager.getUsersByTenant('default');
      expect(users).toHaveLength(2);
      expect(users.every(user => user.tenantId === 'default')).toBe(true);
    });

    it('should return empty array for non-existent tenant', async () => {
      const users = await userManager.getUsersByTenant('non-existent');
      expect(users).toHaveLength(0);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        tenantId: 'default'
      };

      const user = await userManager.createUser(userData);
      const session = await userManager.createSession(user.id, {
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent'
      });

      // Manually set session to expired
      const expiredSession = await userManager.getSession(session.id);
      if (expiredSession) {
        expiredSession.lastActivity = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      }

      const cleanedCount = await userManager.cleanupExpiredSessions(24);
      expect(cleanedCount).toBeGreaterThan(0);

      const foundSession = await userManager.getSession(session.id);
      expect(foundSession).toBeNull();
    });
  });
});

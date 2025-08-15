import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SSOProvider, createSSOProvider, googleOAuth2Config } from './sso-provider';
import { userManager } from './user-manager';

// Mock userManager
vi.mock('./user-manager', () => ({
  userManager: {
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    createSession: vi.fn(),
  },
  UserRole: {
    ADMIN: 'ADMIN',
    USER: 'USER',
    GUEST: 'GUEST',
    ENTERPRISE: 'ENTERPRISE',
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('SSOProvider', () => {
  let ssoProvider: SSOProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    ssoProvider = new SSOProvider(googleOAuth2Config);
  });

  describe('OAuth2', () => {
    it('should generate OAuth2 authorization URL', () => {
      const state = 'test-state-123';
      const authUrl = ssoProvider.generateOAuth2AuthUrl(state);

      expect(authUrl).toContain('accounts.google.com');
      expect(authUrl).toContain('client_id=');
      expect(authUrl).toContain('redirect_uri=');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('scope=');
      expect(authUrl).toContain(`state=${state}`);
    });

    it('should exchange OAuth2 code for token', async () => {
      const mockTokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh-token',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const code = 'test-auth-code';
      const result = await ssoProvider.exchangeOAuth2Code(code);

      expect(result).toEqual(mockTokenResponse);
      expect(fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.any(URLSearchParams),
        })
      );
    });

    it('should get OAuth2 user info', async () => {
      const mockUserInfo = {
        sub: '123456789',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        email_verified: true,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserInfo),
      });

      const accessToken = 'test-access-token';
      const result = await ssoProvider.getOAuth2UserInfo(accessToken);

      expect(result).toEqual(mockUserInfo);
      expect(fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-access-token',
          },
        })
      );
    });

    it('should handle OAuth2 token exchange error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      });

      const code = 'invalid-code';
      await expect(ssoProvider.exchangeOAuth2Code(code)).rejects.toThrow(
        'OAuth2 token exchange failed: Bad Request'
      );
    });
  });

  describe('SAML', () => {
    it('should generate SAML request', () => {
      const samlRequest = ssoProvider.generateSAMLRequest();

      expect(samlRequest).toBeDefined();
      expect(typeof samlRequest).toBe('string');

      // Decode and check content
      const decoded = Buffer.from(samlRequest, 'base64').toString();
      expect(decoded).toContain('samlp:AuthnRequest');
      expect(decoded).toContain('xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"');
      expect(decoded).toContain('Version="2.0"');
    });

    it('should parse SAML response', () => {
      const mockSAMLResponse = `<?xml version="1.0"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
  <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
    <saml:Subject>
      <saml:NameID>test@example.com</saml:NameID>
    </saml:Subject>
    <saml:AttributeStatement>
      <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name">
        <saml:AttributeValue>Test User</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`;

      const encodedResponse = Buffer.from(mockSAMLResponse).toString('base64');
      const result = ssoProvider.parseSAMLResponse(encodedResponse);

      expect(result.nameID).toBe('test@example.com');
      expect(result.attributes).toHaveProperty(
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'
      );
      expect(result.attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']).toEqual(['Test User']);
    });
  });

  describe('User Authentication', () => {
    it('should authenticate new OAuth2 user', async () => {
      const mockUserInfo = {
        sub: '123456789',
        email: 'newuser@example.com',
        name: 'New User',
        email_verified: true,
      };

      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'ENTERPRISE',
        tenantId: 'default',
        isActive: true,
      };

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
      };

      (userManager.getUserByEmail as any).mockResolvedValue(null);
      (userManager.createUser as any).mockResolvedValue(mockUser);
      (userManager.createSession as any).mockResolvedValue(mockSession);

      const sessionId = await ssoProvider.authenticateUser(mockUserInfo);

      expect(sessionId).toBe('session-123');
      expect(userManager.getUserByEmail).toHaveBeenCalledWith('newuser@example.com');
      expect(userManager.createUser).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        name: 'New User',
        role: 'ENTERPRISE',
        tenantId: 'default',
        isActive: true,
        ssoProvider: 'oauth2',
        ssoId: '123456789',
      });
      expect(userManager.createSession).toHaveBeenCalledWith('user-123');
    });

    it('should authenticate existing OAuth2 user', async () => {
      const mockUserInfo = {
        sub: '123456789',
        email: 'existing@example.com',
        name: 'Updated Name',
        email_verified: true,
      };

      const mockUser = {
        id: 'user-123',
        email: 'existing@example.com',
        name: 'Old Name',
        role: 'ENTERPRISE',
        tenantId: 'default',
        isActive: true,
      };

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
      };

      (userManager.getUserByEmail as any).mockResolvedValue(mockUser);
      (userManager.updateUser as any).mockResolvedValue(undefined);
      (userManager.createSession as any).mockResolvedValue(mockSession);

      const sessionId = await ssoProvider.authenticateUser(mockUserInfo);

      expect(sessionId).toBe('session-123');
      expect(userManager.getUserByEmail).toHaveBeenCalledWith('existing@example.com');
      expect(userManager.updateUser).toHaveBeenCalledWith('user-123', {
        name: 'Updated Name',
        lastLoginAt: expect.any(Date),
        ssoProvider: 'oauth2',
        ssoId: '123456789',
      });
      expect(userManager.createSession).toHaveBeenCalledWith('user-123');
    });

    it('should authenticate SAML user', async () => {
      const mockSAMLData = {
        nameID: 'samluser@example.com',
        attributes: {
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': ['SAML User'],
        },
      };

      const mockUser = {
        id: 'user-123',
        email: 'samluser@example.com',
        name: 'SAML User',
        role: 'ENTERPRISE',
        tenantId: 'default',
        isActive: true,
      };

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
      };

      (userManager.getUserByEmail as any).mockResolvedValue(null);
      (userManager.createUser as any).mockResolvedValue(mockUser);
      (userManager.createSession as any).mockResolvedValue(mockSession);

      const sessionId = await ssoProvider.authenticateUser(mockSAMLData);

      expect(sessionId).toBe('session-123');
      expect(userManager.getUserByEmail).toHaveBeenCalledWith('samluser@example.com');
      expect(userManager.createUser).toHaveBeenCalledWith({
        email: 'samluser@example.com',
        name: 'SAML User',
        role: 'ENTERPRISE',
        tenantId: 'default',
        isActive: true,
        ssoProvider: 'oauth2',
        ssoId: 'samluser@example.com',
      });
    });
  });

  describe('Factory Function', () => {
    it('should create SSO provider with config', () => {
      const provider = createSSOProvider(googleOAuth2Config);
      expect(provider).toBeInstanceOf(SSOProvider);
    });
  });
});

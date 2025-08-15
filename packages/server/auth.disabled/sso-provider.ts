import { logger } from '@voice/observability';
import { userManager, UserRole } from './user-manager';

export interface SSOConfig {
  provider: 'oauth2' | 'saml';
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
}

export interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

export interface OAuth2UserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

export interface SAMLResponse {
  nameID: string;
  attributes: Record<string, string[]>;
  sessionIndex?: string;
}

export class SSOProvider {
  private config: SSOConfig;

  constructor(config: SSOConfig) {
    this.config = config;
  }

  // OAuth2 Methods
  generateOAuth2AuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scope,
      state,
    });

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeOAuth2Code(code: string): Promise<OAuth2TokenResponse> {
    try {
      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          redirect_uri: this.config.redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`OAuth2 token exchange failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('OAuth2 token exchange error', error);
      throw error;
    }
  }

  async getOAuth2UserInfo(accessToken: string): Promise<OAuth2UserInfo> {
    try {
      const response = await fetch(this.config.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`OAuth2 user info failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('OAuth2 user info error', error);
      throw error;
    }
  }

  // SAML Methods
  generateSAMLRequest(): string {
    // Generate SAML AuthnRequest
    const samlRequest = `<?xml version="1.0"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                    ID="_${this.generateId()}"
                    Version="2.0"
                    IssueInstant="${new Date().toISOString()}"
                    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                    AssertionConsumerServiceURL="${this.config.redirectUri}">
  <saml:Issuer>${this.config.clientId}</saml:Issuer>
  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
                      AllowCreate="true"/>
</samlp:AuthnRequest>`;

    return Buffer.from(samlRequest).toString('base64');
  }

  parseSAMLResponse(samlResponse: string): SAMLResponse {
    try {
      const decoded = Buffer.from(samlResponse, 'base64').toString();
      // In a real implementation, you would use a proper XML parser
      // and validate the SAML signature
      
      // Simplified parsing for demo purposes
      const nameIDMatch = decoded.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/);
      const nameID = nameIDMatch ? nameIDMatch[1] : '';

      // Extract attributes (simplified)
      const attributes: Record<string, string[]> = {};
      const attrMatches = decoded.matchAll(/<saml:Attribute[^>]*Name="([^"]+)"[^>]*>([\s\S]*?)<\/saml:Attribute>/g);
      
      for (const match of attrMatches) {
        const attrName = match[1];
        const attrValue = match[2].match(/<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/);
        if (attrValue) {
          attributes[attrName] = [attrValue[1]];
        }
      }

      return {
        nameID,
        attributes,
      };
    } catch (error) {
      logger.error('SAML response parsing error', error);
      throw error;
    }
  }

  // Common SSO Methods
  async authenticateUser(ssoData: OAuth2UserInfo | SAMLResponse): Promise<string> {
    try {
      let email: string;
      let name: string;

      if ('sub' in ssoData) {
        // OAuth2 user info
        email = ssoData.email;
        name = ssoData.name;
      } else {
        // SAML response
        email = ssoData.nameID;
        name = ssoData.attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']?.[0] || email;
      }

      // Check if user exists
      let user = await userManager.getUserByEmail(email);
      
      if (!user) {
        // Create new user
        user = await userManager.createUser({
          email,
          name,
          role: UserRole.ENTERPRISE, // SSO users are typically enterprise
          tenantId: 'default', // You might want to determine tenant from SSO data
          isActive: true,
          ssoProvider: this.config.provider,
          ssoId: 'sub' in ssoData ? ssoData.sub : ssoData.nameID,
        });
      } else {
        // Update existing user
        await userManager.updateUser(user.id, {
          name,
          lastLoginAt: new Date(),
          ssoProvider: this.config.provider,
          ssoId: 'sub' in ssoData ? ssoData.sub : ssoData.nameID,
        });
      }

      // Create session
      const session = await userManager.createSession(user.id);
      
      logger.info('SSO authentication successful', {
        userId: user.id,
        email: user.email,
        provider: this.config.provider,
      });

      return session.id;
    } catch (error) {
      logger.error('SSO authentication error', error);
      throw error;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

// Factory function to create SSO providers
export function createSSOProvider(config: SSOConfig): SSOProvider {
  return new SSOProvider(config);
}

// Pre-configured providers
export const googleOAuth2Config: SSOConfig = {
  provider: 'oauth2',
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: `${process.env.BASE_URL}/auth/google/callback`,
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
  scope: 'openid email profile',
};

export const azureADConfig: SSOConfig = {
  provider: 'oauth2',
  clientId: process.env.AZURE_CLIENT_ID || '',
  clientSecret: process.env.AZURE_CLIENT_SECRET || '',
  redirectUri: `${process.env.BASE_URL}/auth/azure/callback`,
  authorizationUrl: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize`,
  tokenUrl: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
  userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
  scope: 'openid email profile',
};

export const oktaSAMLConfig: SSOConfig = {
  provider: 'saml',
  clientId: process.env.OKTA_ENTITY_ID || '',
  clientSecret: process.env.OKTA_PRIVATE_KEY || '',
  redirectUri: `${process.env.BASE_URL}/auth/okta/callback`,
  authorizationUrl: `${process.env.OKTA_DOMAIN}/app/${process.env.OKTA_APP_ID}/sso/saml`,
  tokenUrl: '',
  userInfoUrl: '',
  scope: '',
};

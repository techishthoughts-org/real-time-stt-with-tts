import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '@voice/observability';
import { createSSOProvider, googleOAuth2Config, azureADConfig, oktaSAMLConfig } from './sso-provider';
import { auditLog } from './auth-middleware';

interface SSOAuthRequest extends FastifyRequest {
  query: {
    state?: string;
    code?: string;
    error?: string;
    SAMLResponse?: string;
    RelayState?: string;
  };
}

interface SSOCallbackRequest extends FastifyRequest {
  body: {
    SAMLResponse?: string;
    RelayState?: string;
  };
}

export async function ssoRoutes(fastify: FastifyInstance) {
  // Google OAuth2 Routes
  fastify.get('/auth/google', async (request: SSOAuthRequest, reply: FastifyReply) => {
    try {
      const state = request.query.state || Math.random().toString(36).substring(2);
      const googleProvider = createSSOProvider(googleOAuth2Config);
      const authUrl = googleProvider.generateOAuth2AuthUrl(state);
      
      await auditLog(request, reply, 'SSO_GOOGLE_INITIATED');
      
      reply.redirect(authUrl);
    } catch (error) {
      logger.error('Google OAuth2 initiation error', error);
      reply.code(500).send({ error: 'Authentication initiation failed' });
    }
  });

  fastify.get('/auth/google/callback', async (request: SSOAuthRequest, reply: FastifyReply) => {
    try {
      const { code, error, state } = request.query;

      if (error) {
        logger.error('Google OAuth2 error', { error, state });
        reply.code(400).send({ error: 'Authentication failed', reason: error });
        return;
      }

      if (!code) {
        reply.code(400).send({ error: 'Authorization code required' });
        return;
      }

      const googleProvider = createSSOProvider(googleOAuth2Config);
      
      // Exchange code for token
      const tokenResponse = await googleProvider.exchangeOAuth2Code(code);
      
      // Get user info
      const userInfo = await googleProvider.getOAuth2UserInfo(tokenResponse.access_token);
      
      // Authenticate user
      const sessionId = await googleProvider.authenticateUser(userInfo);
      
      await auditLog(request, reply, 'SSO_GOOGLE_SUCCESS');
      
      // Set session cookie and redirect
      reply.setCookie('sessionToken', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24 hours
      });
      
      reply.redirect('/dashboard');
    } catch (error) {
      logger.error('Google OAuth2 callback error', error);
      await auditLog(request, reply, 'SSO_GOOGLE_FAILED');
      reply.code(500).send({ error: 'Authentication failed' });
    }
  });

  // Azure AD OAuth2 Routes
  fastify.get('/auth/azure', async (request: SSOAuthRequest, reply: FastifyReply) => {
    try {
      const state = request.query.state || Math.random().toString(36).substring(2);
      const azureProvider = createSSOProvider(azureADConfig);
      const authUrl = azureProvider.generateOAuth2AuthUrl(state);
      
      await auditLog(request, reply, 'SSO_AZURE_INITIATED');
      
      reply.redirect(authUrl);
    } catch (error) {
      logger.error('Azure AD OAuth2 initiation error', error);
      reply.code(500).send({ error: 'Authentication initiation failed' });
    }
  });

  fastify.get('/auth/azure/callback', async (request: SSOAuthRequest, reply: FastifyReply) => {
    try {
      const { code, error, state } = request.query;

      if (error) {
        logger.error('Azure AD OAuth2 error', { error, state });
        reply.code(400).send({ error: 'Authentication failed', reason: error });
        return;
      }

      if (!code) {
        reply.code(400).send({ error: 'Authorization code required' });
        return;
      }

      const azureProvider = createSSOProvider(azureADConfig);
      
      // Exchange code for token
      const tokenResponse = await azureProvider.exchangeOAuth2Code(code);
      
      // Get user info
      const userInfo = await azureProvider.getOAuth2UserInfo(tokenResponse.access_token);
      
      // Authenticate user
      const sessionId = await azureProvider.authenticateUser(userInfo);
      
      await auditLog(request, reply, 'SSO_AZURE_SUCCESS');
      
      // Set session cookie and redirect
      reply.setCookie('sessionToken', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24 hours
      });
      
      reply.redirect('/dashboard');
    } catch (error) {
      logger.error('Azure AD OAuth2 callback error', error);
      await auditLog(request, reply, 'SSO_AZURE_FAILED');
      reply.code(500).send({ error: 'Authentication failed' });
    }
  });

  // Okta SAML Routes
  fastify.get('/auth/okta', async (request: SSOAuthRequest, reply: FastifyReply) => {
    try {
      const oktaProvider = createSSOProvider(oktaSAMLConfig);
      const samlRequest = oktaProvider.generateSAMLRequest();
      
      await auditLog(request, reply, 'SSO_OKTA_INITIATED');
      
      // Redirect to Okta with SAML request
      const redirectUrl = `${oktaSAMLConfig.authorizationUrl}?SAMLRequest=${encodeURIComponent(samlRequest)}`;
      reply.redirect(redirectUrl);
    } catch (error) {
      logger.error('Okta SAML initiation error', error);
      reply.code(500).send({ error: 'Authentication initiation failed' });
    }
  });

  fastify.post('/auth/okta/callback', async (request: SSOCallbackRequest, reply: FastifyReply) => {
    try {
      const { SAMLResponse, RelayState } = request.body;

      if (!SAMLResponse) {
        reply.code(400).send({ error: 'SAML response required' });
        return;
      }

      const oktaProvider = createSSOProvider(oktaSAMLConfig);
      
      // Parse SAML response
      const samlData = oktaProvider.parseSAMLResponse(SAMLResponse);
      
      // Authenticate user
      const sessionId = await oktaProvider.authenticateUser(samlData);
      
      await auditLog(request, reply, 'SSO_OKTA_SUCCESS');
      
      // Set session cookie and redirect
      reply.setCookie('sessionToken', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24 hours
      });
      
      reply.redirect('/dashboard');
    } catch (error) {
      logger.error('Okta SAML callback error', error);
      await auditLog(request, reply, 'SSO_OKTA_FAILED');
      reply.code(500).send({ error: 'Authentication failed' });
    }
  });

  // SSO Status endpoint
  fastify.get('/auth/sso/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const status = {
        google: {
          enabled: !!googleOAuth2Config.clientId,
          clientId: googleOAuth2Config.clientId ? 'configured' : 'not configured',
        },
        azure: {
          enabled: !!azureADConfig.clientId,
          clientId: azureADConfig.clientId ? 'configured' : 'not configured',
        },
        okta: {
          enabled: !!oktaSAMLConfig.clientId,
          clientId: oktaSAMLConfig.clientId ? 'configured' : 'not configured',
        },
      };

      reply.send(status);
    } catch (error) {
      logger.error('SSO status error', error);
      reply.code(500).send({ error: 'Failed to get SSO status' });
    }
  });

  // SSO Logout
  fastify.post('/auth/sso/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Clear session cookie
      reply.clearCookie('sessionToken');
      
      await auditLog(request, reply, 'SSO_LOGOUT');
      
      reply.send({ message: 'Logged out successfully' });
    } catch (error) {
      logger.error('SSO logout error', error);
      reply.code(500).send({ error: 'Logout failed' });
    }
  });
}

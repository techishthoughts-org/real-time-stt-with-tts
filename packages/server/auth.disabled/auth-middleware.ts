import { logger } from '@voice/observability';
import { FastifyReply, FastifyRequest } from 'fastify';
import { userManager, UserRole } from './user-manager';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    tenantId: string;
  };
  session?: {
    id: string;
    userId: string;
  };
}

export interface AuthOptions {
  requireAuth?: boolean;
  requiredRoles?: UserRole[];
  requireTenant?: boolean;
}

export async function authenticateUser(
  request: AuthenticatedRequest,
  reply: FastifyReply,
  options: AuthOptions = {}
): Promise<boolean> {
  const { requireAuth = true, requiredRoles = [], requireTenant = false } = options;

  try {
    // Get session token from header or cookie
    const sessionToken = request.headers.authorization?.replace('Bearer ', '') ||
                        (request as any).cookies?.sessionToken;

    if (!sessionToken) {
      if (requireAuth) {
        reply.code(401).send({ error: 'Authentication required' });
        return false;
      }
      return true;
    }

    // Get session
    const session = await userManager.getSession(sessionToken);
    if (!session) {
      if (requireAuth) {
        reply.code(401).send({ error: 'Invalid session' });
        return false;
      }
      return true;
    }

    // Update session activity
    await userManager.updateSessionActivity(sessionToken);

    // Get user
    const user = await userManager.getUserById(session.userId);
    if (!user) {
      reply.code(401).send({ error: 'User not found' });
      return false;
    }

    if (!user.isActive) {
      reply.code(403).send({ error: 'User account is inactive' });
      return false;
    }

    // Check role requirements
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      reply.code(403).send({ error: 'Insufficient permissions' });
      return false;
    }

    // Check quota
    const quotaCheck = await userManager.checkQuota(user.id);
    if (!quotaCheck.allowed) {
      reply.code(429).send({ error: 'Quota exceeded', reason: quotaCheck.reason });
      return false;
    }

    // Attach user and session to request
    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    };

    request.session = {
      id: session.id,
      userId: session.userId
    };

    // Increment request count
    await userManager.incrementRequestCount(user.id);

    logger.info('User authenticated', {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    });

    return true;
  } catch (error) {
    logger.error('Authentication error', error);
    reply.code(500).send({ error: 'Authentication failed' });
    return false;
  }
}

export function requireAuth(requiredRoles: UserRole[] = []): (request: AuthenticatedRequest, reply: FastifyReply) => Promise<boolean> {
  return (request: AuthenticatedRequest, reply: FastifyReply) =>
    authenticateUser(request, reply, { requireAuth: true, requiredRoles });
}

export function optionalAuth(): (request: AuthenticatedRequest, reply: FastifyReply) => Promise<boolean> {
  return (request: AuthenticatedRequest, reply: FastifyReply) =>
    authenticateUser(request, reply, { requireAuth: false });
}

export function requireRole(role: UserRole): (request: AuthenticatedRequest, reply: FastifyReply) => Promise<boolean> {
  return (request: AuthenticatedRequest, reply: FastifyReply) =>
    authenticateUser(request, reply, { requireAuth: true, requiredRoles: [role] });
}

export function requireAdmin(): (request: AuthenticatedRequest, reply: FastifyReply) => Promise<boolean> {
  return requireRole(UserRole.ADMIN);
}

export function requireEnterprise(): (request: AuthenticatedRequest, reply: FastifyReply) => Promise<boolean> {
  return requireRole(UserRole.ENTERPRISE);
}

// Rate limiting based on user quota
export async function rateLimitByUser(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<boolean> {
  if (!request.user) {
    return true; // Skip rate limiting for unauthenticated requests
  }

  try {
    const quotaCheck = await userManager.checkQuota(request.user.id);
    if (!quotaCheck.allowed) {
      reply.code(429).send({
        error: 'Rate limit exceeded',
        reason: quotaCheck.reason,
        retryAfter: 3600 // 1 hour
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Rate limiting error', error);
    return true; // Allow request if rate limiting fails
  }
}

// Tenant isolation middleware
export async function enforceTenantIsolation(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<boolean> {
  if (!request.user) {
    return true; // Skip for unauthenticated requests
  }

  const tenantId = request.headers['x-tenant-id'] as string;
  if (tenantId && tenantId !== request.user.tenantId) {
    reply.code(403).send({ error: 'Tenant access denied' });
    return false;
  }

  return true;
}

// Audit logging middleware
export async function auditLog(
  request: AuthenticatedRequest,
  reply: FastifyReply,
  action: string
): Promise<void> {
  const auditData = {
    timestamp: new Date().toISOString(),
    action,
    method: request.method,
    url: request.url,
    userId: request.user?.id,
    userEmail: request.user?.email,
    tenantId: request.user?.tenantId,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
    statusCode: reply.statusCode,
    responseTime: (reply as any).getResponseTime?.() || 0
  };

  logger.info('Audit log', auditData);
}

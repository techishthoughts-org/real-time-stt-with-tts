export class VoiceAssistantError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'VoiceAssistantError';
  }
}

export class AuthenticationError extends VoiceAssistantError {
  constructor(message: string = 'Authentication failed', details?: any) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends VoiceAssistantError {
  constructor(message: string = 'Insufficient permissions', details?: any) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}

export class RateLimitError extends VoiceAssistantError {
  constructor(message: string = 'Rate limit exceeded', details?: any) {
    super(message, 'RATE_LIMIT_ERROR', 429, details);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends VoiceAssistantError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends VoiceAssistantError {
  constructor(message: string = 'Network error', details?: any) {
    super(message, 'NETWORK_ERROR', undefined, details);
    this.name = 'NetworkError';
  }
}

export class ServiceUnavailableError extends VoiceAssistantError {
  constructor(message: string = 'Service unavailable', details?: any) {
    super(message, 'SERVICE_UNAVAILABLE', 503, details);
    this.name = 'ServiceUnavailableError';
  }
}

export class QuotaExceededError extends VoiceAssistantError {
  constructor(message: string = 'Quota exceeded', details?: any) {
    super(message, 'QUOTA_EXCEEDED', 429, details);
    this.name = 'QuotaExceededError';
  }
}

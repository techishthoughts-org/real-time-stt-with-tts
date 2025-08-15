import { logger } from '@voice/observability';

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  USER_INPUT_ERROR = 'USER_INPUT_ERROR',
}

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  code: string;
  statusCode: number;
  retryable: boolean;
  retryAfter?: number;
  fallbackMessage?: string;
}

export class ErrorHandler {
  private static errorMap: Map<ErrorType, ErrorInfo> = new Map([
    [ErrorType.NETWORK_ERROR, {
      type: ErrorType.NETWORK_ERROR,
      message: 'Network connection error',
      code: 'NETWORK_ERROR',
      statusCode: 503,
      retryable: true,
      retryAfter: 5000,
      fallbackMessage: 'Desculpe, estou com problemas de conexão. Tente novamente em alguns segundos.',
    }],
    [ErrorType.API_TIMEOUT, {
      type: ErrorType.API_TIMEOUT,
      message: 'API request timeout',
      code: 'API_TIMEOUT',
      statusCode: 408,
      retryable: true,
      retryAfter: 3000,
      fallbackMessage: 'A resposta está demorando mais que o esperado. Tente novamente.',
    }],
    [ErrorType.SERVICE_UNAVAILABLE, {
      type: ErrorType.SERVICE_UNAVAILABLE,
      message: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
      retryable: true,
      retryAfter: 10000,
      fallbackMessage: 'O serviço está temporariamente indisponível. Tente novamente em alguns minutos.',
    }],
    [ErrorType.RATE_LIMIT_EXCEEDED, {
      type: ErrorType.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      retryable: true,
      retryAfter: 60000,
      fallbackMessage: 'Muitas requisições. Aguarde um momento antes de tentar novamente.',
    }],
    [ErrorType.AUTHENTICATION_ERROR, {
      type: ErrorType.AUTHENTICATION_ERROR,
      message: 'Authentication failed',
      code: 'AUTHENTICATION_ERROR',
      statusCode: 401,
      retryable: false,
      fallbackMessage: 'Erro de autenticação. Verifique suas credenciais.',
    }],
    [ErrorType.VALIDATION_ERROR, {
      type: ErrorType.VALIDATION_ERROR,
      message: 'Invalid request data',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      retryable: false,
      fallbackMessage: 'Dados inválidos na requisição.',
    }],
    [ErrorType.INTERNAL_ERROR, {
      type: ErrorType.INTERNAL_ERROR,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      retryable: true,
      retryAfter: 5000,
      fallbackMessage: 'Erro interno do servidor. Tente novamente.',
    }],
    [ErrorType.USER_INPUT_ERROR, {
      type: ErrorType.USER_INPUT_ERROR,
      message: 'Invalid user input',
      code: 'USER_INPUT_ERROR',
      statusCode: 400,
      retryable: false,
      fallbackMessage: 'Entrada inválida. Verifique os dados fornecidos.',
    }],
  ]);

  static classifyError(error: any): ErrorInfo {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorStack = error.stack?.toLowerCase() || '';

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('connection') ||
        errorMessage.includes('fetch') || errorMessage.includes('econnrefused')) {
      return this.errorMap.get(ErrorType.NETWORK_ERROR)!;
    }

    // Timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('aborted') ||
        errorMessage.includes('timed out')) {
      return this.errorMap.get(ErrorType.API_TIMEOUT)!;
    }

    // Rate limiting
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests') ||
        errorMessage.includes('429')) {
      return this.errorMap.get(ErrorType.RATE_LIMIT_EXCEEDED)!;
    }

    // Authentication errors
    if (errorMessage.includes('unauthorized') || errorMessage.includes('401') ||
        errorMessage.includes('authentication') || errorMessage.includes('auth')) {
      return this.errorMap.get(ErrorType.AUTHENTICATION_ERROR)!;
    }

    // Validation errors
    if (errorMessage.includes('validation') || errorMessage.includes('invalid') ||
        errorMessage.includes('400')) {
      return this.errorMap.get(ErrorType.VALIDATION_ERROR)!;
    }

    // Service unavailable
    if (errorMessage.includes('service unavailable') || errorMessage.includes('503') ||
        errorMessage.includes('unavailable')) {
      return this.errorMap.get(ErrorType.SERVICE_UNAVAILABLE)!;
    }

    // Default to internal error
    return this.errorMap.get(ErrorType.INTERNAL_ERROR)!;
  }

  static createErrorResponse(error: any, isProduction: boolean = false) {
    const errorInfo = this.classifyError(error);

    logger.error('Error occurred:', {
      type: errorInfo.type,
      message: error.message,
      code: errorInfo.code,
      statusCode: errorInfo.statusCode,
      retryable: errorInfo.retryable,
      retryAfter: errorInfo.retryAfter,
    });

    return {
      error: {
        message: isProduction ? errorInfo.fallbackMessage : error.message,
        code: errorInfo.code,
        statusCode: errorInfo.statusCode,
        retryable: errorInfo.retryable,
        retryAfter: errorInfo.retryAfter,
        ...(isProduction ? {} : { stack: error.stack }),
      },
    };
  }

  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const errorInfo = this.classifyError(error);

        if (!errorInfo.retryable || attempt === maxRetries) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        logger.warn(`Retry attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms:`, {
          error: error instanceof Error ? error.message : String(error),
          type: errorInfo.type,
        });

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static getFallbackMessage(errorType: ErrorType): string {
    const errorInfo = this.errorMap.get(errorType);
    return errorInfo?.fallbackMessage || 'Ocorreu um erro inesperado. Tente novamente.';
  }

  static isRetryableError(error: any): boolean {
    const errorInfo = this.classifyError(error);
    return errorInfo.retryable;
  }

  static getRetryDelay(error: any): number {
    const errorInfo = this.classifyError(error);
    return errorInfo.retryAfter || 5000;
  }
}

// Auto-recovery service
export class AutoRecoveryService {
  private static recoveryStrategies = new Map<ErrorType, () => Promise<void>>([
    [ErrorType.NETWORK_ERROR, async () => {
      logger.info('🔄 Attempting network recovery...');
      // Could implement connection pool reset, DNS refresh, etc.
      await ErrorHandler.sleep(2000);
    }],
    [ErrorType.SERVICE_UNAVAILABLE, async () => {
      logger.info('🔄 Attempting service recovery...');
      // Could implement service health check, restart, etc.
      await ErrorHandler.sleep(5000);
    }],
    [ErrorType.RATE_LIMIT_EXCEEDED, async () => {
      logger.info('🔄 Waiting for rate limit reset...');
      await ErrorHandler.sleep(60000); // Wait 1 minute
    }],
  ]);

  static async attemptRecovery(error: any): Promise<boolean> {
    const errorInfo = ErrorHandler.classifyError(error);
    const recoveryStrategy = this.recoveryStrategies.get(errorInfo.type);

    if (recoveryStrategy) {
      try {
        await recoveryStrategy();
        logger.info(`✅ Recovery successful for ${errorInfo.type}`);
        return true;
      } catch (recoveryError) {
        logger.error(`❌ Recovery failed for ${errorInfo.type}:`, recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError)));
        return false;
      }
    }

    return false;
  }
}

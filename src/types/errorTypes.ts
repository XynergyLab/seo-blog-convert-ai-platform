/**
 * Comprehensive Error Handling Type Definitions
 * Provides standardized error management across services
 */
export enum ErrorCategory {
  AUTHENTICATION = 'AUTH',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  SYSTEM = 'SYSTEM',
  DATABASE = 'DB',
  EXTERNAL_SERVICE = 'EXTERNAL'
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface StandardError {
  category: ErrorCategory;
  code: string;
  message: string;
  timestamp?: number;
  traceId?: string;
  context?: Record<string, any>;
  stack?: string;
  source?: string;
}

export interface ErrorConfig {
  shouldRetry?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Create a standardized error with comprehensive details
 * @param params Error construction parameters
 */
export function createStandardError(
  params: Omit<StandardError, 'timestamp'> & { 
    config?: ErrorConfig 
  }
): StandardError {
  const { category, code, message, context, source, config } = params;
  
  return {
    category,
    code,
    message,
    timestamp: Date.now(),
    traceId: crypto.randomUUID(),
    context,
    source,
    stack: new Error().stack
  };
}


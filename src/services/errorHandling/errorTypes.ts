import { ErrorCategory, StandardError, LogLevel } from '../types/errorTypes';

/**
 * Centralized Error Management System
 * Provides a standardized approach to error handling across services
 */
export class ErrorService {
  private static instance: ErrorService;
  private subscribers: Set<(error: StandardError) => void> = new Set();

  private constructor() {}

  /**
   * Singleton instance management
   */
  public static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  /**
   * Log an error with comprehensive details
   * @param error StandardError object
   * @param logLevel Logging severity level
   */
  public log(error: StandardError, logLevel: LogLevel = LogLevel.ERROR): void {
    const enrichedError: StandardError = {
      ...error,
      timestamp: Date.now(),
      traceId: this.generateTraceId()
    };

    // Console logging
    this.consoleLog(enrichedError, logLevel);

    // Notify subscribers
    this.notifySubscribers(enrichedError);

    // External logging (e.g., Sentry, ELK)
    this.externalLog(enrichedError, logLevel);
  }

  /**
   * Subscribe to error events
   * @param callback Function to handle error events
   * @returns Unsubscribe function
   */
  public subscribe(callback: (error: StandardError) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(error: StandardError): void {
    this.subscribers.forEach(subscriber => subscriber(error));
  }

  private consoleLog(error: StandardError, logLevel: LogLevel): void {
    const logMethod = this.getConsoleLogMethod(logLevel);
    logMethod(JSON.stringify(error, null, 2));
  }

  private externalLog(error: StandardError, logLevel: LogLevel): void {
    // Placeholder for external logging integration (Sentry, ELK)
    // Implement based on chosen monitoring solution
  }

  private generateTraceId(): string {
    return crypto.randomUUID();
  }

  private getConsoleLogMethod(logLevel: LogLevel) {
    const logMethods = {
      [LogLevel.INFO]: console.info,
      [LogLevel.WARN]: console.warn,
      [LogLevel.ERROR]: console.error,
      [LogLevel.DEBUG]: console.debug
    };
    return logMethods[logLevel] || console.log;
  }
}

export const errorService = ErrorService.getInstance();


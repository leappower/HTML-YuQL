/**
 * Error Handler Module
 * Centralized error handling with user-friendly messages and error reporting
 */

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const ErrorType = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NOT_FOUND: 'not_found',
  SERVER: 'server',
  CLIENT: 'client',
  UNKNOWN: 'unknown',
} as const;

/**
 * Error Handler class
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: ErrorData[] = [];
  private maxQueueSize = 50;
  private reportingEnabled = true;
  private sentryDsn?: string;

  private constructor() {
    this.setupGlobalHandlers();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  configure(options: { sentryDsn?: string; reportingEnabled?: boolean }): void {
    this.sentryDsn = options.sentryDsn;
    if (options.reportingEnabled !== undefined) {
      this.reportingEnabled = options.reportingEnabled;
    }
  }

  static handle(
    error: Error | string,
    options: {
      type?: typeof ErrorType[keyof typeof ErrorType];
      severity?: typeof ErrorSeverity[keyof typeof ErrorSeverity];
      context?: string;
      showToast?: boolean;
      showUserMessage?: string;
    } = {}
  ): void {
    const handler = ErrorHandler.getInstance();
    const errorData = handler.normalizeError(error, options);
    handler.addToQueue(errorData);
    handler.logError(errorData);
    handler.reportError(errorData);

    if (options.showToast || options.showUserMessage) {
      handler.showUserFeedback(errorData, options.showUserMessage);
    }
  }

  private normalizeError(
    error: Error | string,
    options: {
      type?: typeof ErrorType[keyof typeof ErrorType];
      severity?: typeof ErrorSeverity[keyof typeof ErrorSeverity];
      context?: string;
    }
  ): ErrorData {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'object' && error.stack ? error.stack : undefined;

    return {
      type: options.type || this.inferErrorType(error),
      severity: options.severity || this.inferErrorSeverity(error),
      message: errorMessage,
      context: options.context || 'unknown',
      stack: errorStack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
  }

  private inferErrorType(error: Error | string): typeof ErrorType[keyof typeof ErrorType] {
    const errorMessage = typeof error === 'string' ? error : error.message;

    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      return ErrorType.NETWORK;
    }
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return ErrorType.VALIDATION;
    }
    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return ErrorType.AUTHENTICATION;
    }
    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      return ErrorType.AUTHORIZATION;
    }
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return ErrorType.NOT_FOUND;
    }

    return ErrorType.UNKNOWN;
  }

  private inferErrorSeverity(error: Error | string): typeof ErrorSeverity[keyof typeof ErrorSeverity] {
    const errorMessage = typeof error === 'string' ? error : error.message;

    if (errorMessage.includes('critical') || errorMessage.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }
    if (errorMessage.includes('error') || errorMessage.includes('failed')) {
      return ErrorSeverity.HIGH;
    }
    if (errorMessage.includes('warning') || errorMessage.includes('deprecated')) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  private addToQueue(errorData: ErrorData): void {
    this.errorQueue.push(errorData);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  private logError(errorData: ErrorData): void {
    const prefix = `[ErrorHandler][${errorData.severity.toUpperCase()}] ${errorData.type}`;
    if (errorData.severity === ErrorSeverity.LOW) {
      console.warn(prefix, errorData.message);
    } else {
      console.error(prefix, errorData.message, errorData);
    }
  }

  private reportError(errorData: ErrorData): void {
    if (!this.reportingEnabled || !this.sentryDsn) {
      return;
    }

    if (window.Sentry) {
      window.Sentry.captureException(new Error(errorData.message), {
        tags: {
          type: errorData.type,
          severity: errorData.severity,
          context: errorData.context,
        },
        extra: {
          timestamp: errorData.timestamp,
          url: errorData.url,
          userAgent: errorData.userAgent,
        },
      });
    }
  }

  private showUserFeedback(errorData: ErrorData, customMessage?: string): void {
    const message = customMessage || this.getUserFriendlyMessage(errorData);
    this.showToast(message, errorData.severity);
  }

  private getUserFriendlyMessage(errorData: ErrorData): string {
    const userMessages = {
      network: '网络连接失败，请检查您的网络连接',
      validation: '输入信息有误，请检查后重试',
      authentication: '登录已过期，请重新登录',
      authorization: '您没有权限执行此操作',
      not_found: '请求的资源不存在',
      server: '服务器错误，请稍后重试',
      client: '操作失败，请重试',
      unknown: '发生未知错误，请稍后重试',
    };

    return userMessages[errorData.type] || userMessages.unknown;
  }

  private showToast(message: string, severity: typeof ErrorSeverity[keyof typeof ErrorSeverity]): void {
    if (typeof window.showToast === 'function') {
      const type = this.mapSeverityToToastType(severity);
      window.showToast(message, type);
    } else if (severity === ErrorSeverity.CRITICAL) {
      alert(message);
    }
  }

  private mapSeverityToToastType(severity: typeof ErrorSeverity[keyof typeof ErrorSeverity]): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warning';
      default:
        return 'info';
    }
  }

  getErrorQueue(): ErrorData[] {
    return [...this.errorQueue];
  }

  clearErrorQueue(): void {
    this.errorQueue = [];
  }

  private setupGlobalHandlers(): void {
    window.addEventListener('unhandledrejection', (event) => {
      ErrorHandler.handle(event.reason, {
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        context: 'Unhandled Promise Rejection',
      });
    });

    window.addEventListener('error', (event) => {
      ErrorHandler.handle(event.error || event.message, {
        type: ErrorType.CLIENT,
        severity: ErrorSeverity.HIGH,
        context: 'Uncaught Error',
      });
    });
  }

  static async wrapAsync<T>(
    fn: () => Promise<T>,
    options: {
      context?: string;
      showToast?: boolean;
      fallback?: T;
    } = {}
  ): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      ErrorHandler.handle(error as Error, {
        context: options.context || 'Async Operation',
        showToast: options.showToast,
      });
      return options.fallback;
    }
  }
}

export const errorHandler = ErrorHandler.getInstance();

if (typeof window !== 'undefined') {
  (window as any).ErrorHandler = ErrorHandler;
  (window as any).errorHandler = errorHandler;
}

/**
 * Sentry Integration Module
 * Error tracking and performance monitoring
 */

/**
 * Initialize Sentry
 */
export function initSentry(dsn: string, options: {
  environment?: string;
  release?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
  enabled?: boolean;
} = {}): boolean {
  if (!options.enabled && options.enabled !== undefined) {
    console.log('Sentry monitoring is disabled');
    return false;
  }

  if (!window.Sentry) {
    console.warn('Sentry SDK is not loaded');
    return false;
  }

  try {
    window.Sentry.init({
      dsn,
      environment: options.environment || 'production',
      release: options.release,
      beforeSend(event, hint) {
        // Filter out certain errors
        if (event.exception) {
          const error = hint.originalException as any;
          // Ignore errors from extensions
          if (error && error.message && error.message.includes('extension')) {
            return null;
          }
          // Ignore script errors from unknown sources
          if (event.request && event.request.url) {
            try {
              const url = new URL(event.request.url);
              if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
                return null;
              }
            } catch (e) {
              // Invalid URL, skip filtering
            }
          }
        }
        return event;
      },
      integrations: [
        new window.Sentry.BrowserTracing(),
        new window.Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: options.tracesSampleRate || 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });

    console.log('Sentry initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
    return false;
  }
}

/**
 * Set user context
 */
export function setSentryUser(user: {
  id?: string;
  email?: string;
  username?: string;
}): void {
  if (!window.Sentry) {
    return;
  }

  try {
    window.Sentry.setUser(user);
  } catch (error) {
    console.error('Failed to set Sentry user:', error);
  }
}

/**
 * Add breadcrumb
 */
export function addSentryBreadcrumb(breadcrumb: {
  message?: string;
  category?: string;
  level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
  data?: Record<string, any>;
}): void {
  if (!window.Sentry) {
    return;
  }

  try {
    window.Sentry.addBreadcrumb(breadcrumb);
  } catch (error) {
    console.error('Failed to add Sentry breadcrumb:', error);
  }
}

/**
 * Capture exception
 */
export function captureSentryException(
  exception: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
  }
): string | undefined {
  if (!window.Sentry) {
    return undefined;
  }

  try {
    const eventId = window.Sentry.captureException(exception, context);
    return eventId;
  } catch (error) {
    console.error('Failed to capture Sentry exception:', error);
    return undefined;
  }
}

/**
 * Capture message
 */
export function captureSentryMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info'
): string | undefined {
  if (!window.Sentry) {
    return undefined;
  }

  try {
    const eventId = window.Sentry.captureMessage(message, level);
    return eventId;
  } catch (error) {
    console.error('Failed to capture Sentry message:', error);
    return undefined;
  }
}

/**
 * Set tag
 */
export function setSentryTag(key: string, value: string): void {
  if (!window.Sentry) {
    return;
  }

  try {
    window.Sentry.setTag(key, value);
  } catch (error) {
    console.error('Failed to set Sentry tag:', error);
  }
}

/**
 * Set context
 */
export function setSentryContext(key: string, context: Record<string, any>): void {
  if (!window.Sentry) {
    return;
  }

  try {
    window.Sentry.setContext(key, context);
  } catch (error) {
    console.error('Failed to set Sentry context:', error);
  }
}

/**
 * Configure scope
 */
export function configureSentryScope(callback: (scope: any) => void): void {
  if (!window.Sentry) {
    return;
  }

  try {
    window.Sentry.configureScope(callback);
  } catch (error) {
    console.error('Failed to configure Sentry scope:', error);
  }
}

/**
 * Enable performance monitoring
 */
export function enableSentryPerformance(): void {
  if (!window.Sentry) {
    return;
  }

  try {
    window.Sentry.startTransaction({
      name: 'page_load',
      op: 'navigation',
    });
  } catch (error) {
    console.error('Failed to enable Sentry performance:', error);
  }
}

/**
 * Disable Sentry
 */
export function disableSentry(): void {
  if (!window.Sentry) {
    return;
  }

  try {
    // Sentry doesn't have a direct disable method, but we can clear the client
    window.Sentry.getCurrentHub().getClient().close(2000);
  } catch (error) {
    console.error('Failed to disable Sentry:', error);
  }
}

/**
 * Get Sentry session URL (for debugging)
 */
export function getSentrySessionUrl(): string | undefined {
  if (!window.Sentry) {
    return undefined;
  }

  try {
    // This is for debugging purposes only
    return window.Sentry.getCurrentHub().getClient()?.getDsn()?.toString();
  } catch (error) {
    console.error('Failed to get Sentry session URL:', error);
    return undefined;
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).SentryUtils = {
    initSentry,
    setSentryUser,
    addSentryBreadcrumb,
    captureSentryException,
    captureSentryMessage,
    setSentryTag,
    setSentryContext,
    configureSentryScope,
    enableSentryPerformance,
    disableSentry,
  };
}

/**
 * Client-side Error Tracking Utility
 * Automatically tracks and reports errors to the monitoring API
 */

type ErrorLevel = 'error' | 'warning' | 'info';

interface ErrorContext {
  url?: string;
  userAgent?: string;
  sessionId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
}

interface ErrorReport {
  level: ErrorLevel;
  message: string;
  stack?: string;
  context?: ErrorContext;
  metadata?: Record<string, any>;
}

class ErrorTracker {
  private sessionId: string | null = null;
  private isEnabled: boolean = true;
  private queue: ErrorReport[] = [];
  private isProcessing: boolean = false;

  constructor() {
    // Get session ID if available
    if (typeof window !== 'undefined') {
      this.sessionId = this.getSessionId();
      this.setupGlobalErrorHandlers();
    }
  }

  /**
   * Enable or disable error tracking
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Track an error
   */
  async trackError(error: Error | string, context?: ErrorContext, metadata?: Record<string, any>) {
    if (!this.isEnabled) return;

    const errorReport: ErrorReport = {
      level: 'error',
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' && error.stack ? error.stack : undefined,
      context: {
        ...context,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        sessionId: this.sessionId || undefined,
      },
      metadata
    };

    await this.queueAndSend(errorReport);
  }

  /**
   * Track a warning
   */
  async trackWarning(message: string, context?: ErrorContext, metadata?: Record<string, any>) {
    if (!this.isEnabled) return;

    const errorReport: ErrorReport = {
      level: 'warning',
      message,
      context: {
        ...context,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        sessionId: this.sessionId || undefined,
      },
      metadata
    };

    await this.queueAndSend(errorReport);
  }

  /**
   * Track an info message
   */
  async trackInfo(message: string, context?: ErrorContext, metadata?: Record<string, any>) {
    if (!this.isEnabled) return;

    const errorReport: ErrorReport = {
      level: 'info',
      message,
      context: {
        ...context,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        sessionId: this.sessionId || undefined,
      },
      metadata
    };

    await this.queueAndSend(errorReport);
  }

  /**
   * Track an API error
   */
  async trackApiError(
    error: Error | string, 
    endpoint: string, 
    method: string, 
    statusCode?: number,
    metadata?: Record<string, any>
  ) {
    await this.trackError(error, {
      endpoint,
      method,
      statusCode,
    }, metadata);
  }

  /**
   * Track a user action that resulted in an error
   */
  async trackUserError(
    error: Error | string,
    action: string,
    metadata?: Record<string, any>
  ) {
    await this.trackError(error, undefined, {
      ...metadata,
      userAction: action,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Queue error report and send to API
   */
  private async queueAndSend(errorReport: ErrorReport) {
    this.queue.push(errorReport);
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  /**
   * Process the error queue
   */
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const errorReport = this.queue.shift();
      if (errorReport) {
        await this.sendToApi(errorReport);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Send error report to the monitoring API
   */
  private async sendToApi(errorReport: ErrorReport) {
    try {
      const response = await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });

      if (!response.ok) {
        console.warn('Error tracking failed:', response.status, response.statusText);
      }
    } catch (error) {
      // Fail silently - don't create infinite loops
      console.warn('Error tracking request failed:', error);
    }
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers() {
    if (typeof window === 'undefined') return;

    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError(event.error || event.message, {
        url: event.filename || window.location.href,
      }, {
        lineno: event.lineno,
        colno: event.colno,
        type: 'global-error'
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(
        event.reason instanceof Error ? event.reason : String(event.reason),
        undefined,
        { type: 'unhandled-rejection' }
      );
    });

    // React Error Boundary integration
    if ((window as any).__REACT_ERROR_OVERLAY_GLOBAL_HOOK__) {
      const originalError = console.error;
      console.error = (...args) => {
        // Check if this looks like a React error
        const message = args.join(' ');
        if (message.includes('React') || message.includes('Component')) {
          this.trackError(message, undefined, {
            type: 'react-error',
            args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg))
          });
        }
        originalError(...args);
      };
    }
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string | null {
    if (typeof window === 'undefined') return null;

    try {
      let sessionId = localStorage.getItem('session-id');
      if (!sessionId) {
        // Try to get from session data in localStorage
        const sessionData = localStorage.getItem('session');
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          sessionId = parsed.id;
        }
      }
      return sessionId;
    } catch (error) {
      return null;
    }
  }
}

// Create singleton instance
const errorTracker = new ErrorTracker();

// Export functions for easy use
export const trackError = (error: Error | string, context?: ErrorContext, metadata?: Record<string, any>) =>
  errorTracker.trackError(error, context, metadata);

export const trackWarning = (message: string, context?: ErrorContext, metadata?: Record<string, any>) =>
  errorTracker.trackWarning(message, context, metadata);

export const trackInfo = (message: string, context?: ErrorContext, metadata?: Record<string, any>) =>
  errorTracker.trackInfo(message, context, metadata);

export const trackApiError = (
  error: Error | string, 
  endpoint: string, 
  method: string, 
  statusCode?: number,
  metadata?: Record<string, any>
) => errorTracker.trackApiError(error, endpoint, method, statusCode, metadata);

export const trackUserError = (
  error: Error | string,
  action: string,
  metadata?: Record<string, any>
) => errorTracker.trackUserError(error, action, metadata);

export const setErrorTrackingEnabled = (enabled: boolean) =>
  errorTracker.setEnabled(enabled);

export default errorTracker;
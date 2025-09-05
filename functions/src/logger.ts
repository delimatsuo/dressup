import { logger } from 'firebase-functions';

/**
 * Structured logging utility for DressUp AI monitoring
 * Provides consistent log formatting for Cloud Logging metrics
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO', 
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export enum EventType {
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_DELETED = 'SESSION_DELETED',
  PHOTO_UPLOADED = 'PHOTO_UPLOADED',
  GENERATION_STARTED = 'GENERATION_STARTED',
  GENERATION_COMPLETED = 'GENERATION_COMPLETED',
  GENERATION_FAILED = 'GENERATION_FAILED',
  FEEDBACK_SUBMITTED = 'FEEDBACK_SUBMITTED',
  STORAGE_CLEANUP = 'STORAGE_CLEANUP',
  GARMENT_FETCHED = 'GARMENT_FETCHED',
  VERTEX_AI_REQUEST = 'VERTEX_AI_REQUEST',
  VERTEX_AI_RESPONSE = 'VERTEX_AI_RESPONSE',
  ERROR_OCCURRED = 'ERROR_OCCURRED'
}

interface BaseLogEvent {
  eventType: EventType;
  timestamp: string;
  sessionId?: string;
  userId?: string;
  requestId?: string;
  functionName: string;
  version: string;
}

interface MetricsData {
  duration?: number;
  cost?: number;
  success?: boolean;
  errorType?: string;
  retryCount?: number;
  itemCount?: number;
  fileSize?: number;
  confidence?: number;
  rating?: number;
}

interface PerformanceMetrics {
  executionTimeMs: number;
  memoryUsage?: number;
  apiCalls?: number;
  storageOperations?: number;
}

/**
 * Main structured logger class
 */
export class StructuredLogger {
  private functionName: string;
  private version: string;

  constructor(functionName: string, version: string = '1.0.0') {
    this.functionName = functionName;
    this.version = version;
  }

  private createBaseEvent(eventType: EventType, sessionId?: string): BaseLogEvent {
    return {
      eventType,
      timestamp: new Date().toISOString(),
      sessionId,
      functionName: this.functionName,
      version: this.version,
      requestId: Math.random().toString(36).substr(2, 9)
    };
  }

  /**
   * Log session creation event
   */
  logSessionCreated(sessionId: string, expiresIn: number): void {
    const event = {
      ...this.createBaseEvent(EventType.SESSION_CREATED, sessionId),
      expiresIn,
      action: 'session_creation'
    };

    logger.info('Session created', {
      structuredData: event,
      labels: {
        eventType: EventType.SESSION_CREATED,
        sessionId
      }
    });
  }

  /**
   * Log session deletion event
   */
  logSessionDeleted(sessionId: string, filesDeleted: number): void {
    const event = {
      ...this.createBaseEvent(EventType.SESSION_DELETED, sessionId),
      filesDeleted,
      action: 'session_deletion'
    };

    logger.info('Session deleted', {
      structuredData: event,
      labels: {
        eventType: EventType.SESSION_DELETED,
        sessionId
      }
    });
  }

  /**
   * Log photo upload event
   */
  logPhotoUploaded(sessionId: string, photoType: string, fileSize: number): void {
    const event = {
      ...this.createBaseEvent(EventType.PHOTO_UPLOADED, sessionId),
      photoType,
      fileSize,
      action: 'photo_upload'
    };

    logger.info('Photo uploaded', {
      structuredData: event,
      labels: {
        eventType: EventType.PHOTO_UPLOADED,
        photoType,
        sessionId
      }
    });
  }

  /**
   * Log generation start event
   */
  logGenerationStarted(sessionId: string, requestType: 'single-pose' | 'multi-pose', poseCount?: number): void {
    const event = {
      ...this.createBaseEvent(EventType.GENERATION_STARTED, sessionId),
      requestType,
      poseCount,
      action: 'generation_start'
    };

    logger.info('Generation started', {
      structuredData: event,
      labels: {
        eventType: EventType.GENERATION_STARTED,
        requestType,
        sessionId
      }
    });
  }

  /**
   * Log generation completion event
   */
  logGenerationCompleted(
    sessionId: string, 
    requestType: 'single-pose' | 'multi-pose',
    metrics: MetricsData,
    performance: PerformanceMetrics
  ): void {
    const event = {
      ...this.createBaseEvent(EventType.GENERATION_COMPLETED, sessionId),
      requestType,
      metrics,
      performance,
      action: 'generation_completion'
    };

    logger.info('Generation completed', {
      structuredData: event,
      labels: {
        eventType: EventType.GENERATION_COMPLETED,
        requestType,
        sessionId,
        success: 'true'
      }
    });
  }

  /**
   * Log generation failure event
   */
  logGenerationFailed(
    sessionId: string,
    requestType: 'single-pose' | 'multi-pose', 
    error: Error,
    performance: PerformanceMetrics,
    retryCount?: number
  ): void {
    const event = {
      ...this.createBaseEvent(EventType.GENERATION_FAILED, sessionId),
      requestType,
      errorMessage: error.message,
      errorStack: error.stack,
      retryCount,
      performance,
      action: 'generation_failure'
    };

    logger.error('Generation failed', {
      structuredData: event,
      labels: {
        eventType: EventType.GENERATION_FAILED,
        requestType,
        sessionId,
        errorType: error.name,
        success: 'false'
      }
    });
  }

  /**
   * Log Vertex AI API request
   */
  logVertexAIRequest(sessionId: string, requestSize: number): void {
    const event = {
      ...this.createBaseEvent(EventType.VERTEX_AI_REQUEST, sessionId),
      requestSize,
      service: 'vertex-ai',
      action: 'api_request'
    };

    logger.info('Vertex AI request', {
      structuredData: event,
      labels: {
        eventType: EventType.VERTEX_AI_REQUEST,
        service: 'vertex-ai',
        sessionId
      }
    });
  }

  /**
   * Log Vertex AI API response
   */
  logVertexAIResponse(
    sessionId: string, 
    success: boolean, 
    duration: number, 
    confidence?: number,
    retryCount?: number
  ): void {
    const event = {
      ...this.createBaseEvent(EventType.VERTEX_AI_RESPONSE, sessionId),
      success,
      duration,
      confidence,
      retryCount,
      service: 'vertex-ai',
      action: 'api_response'
    };

    const logLevel = success ? 'info' : 'warn';
    logger[logLevel]('Vertex AI response', {
      structuredData: event,
      labels: {
        eventType: EventType.VERTEX_AI_RESPONSE,
        service: 'vertex-ai',
        sessionId,
        success: success.toString()
      }
    });
  }

  /**
   * Log feedback submission event
   */
  logFeedbackSubmitted(
    sessionId: string, 
    resultId: string, 
    rating?: number, 
    realismRating?: number, 
    helpfulnessRating?: number
  ): void {
    const event = {
      ...this.createBaseEvent(EventType.FEEDBACK_SUBMITTED, sessionId),
      resultId,
      rating,
      realismRating,
      helpfulnessRating,
      averageRating: [rating, realismRating, helpfulnessRating]
        .filter(r => r !== undefined)
        .reduce((sum, r, _, arr) => sum + r! / arr.length, 0),
      action: 'feedback_submission'
    };

    logger.info('Feedback submitted', {
      structuredData: event,
      labels: {
        eventType: EventType.FEEDBACK_SUBMITTED,
        sessionId,
        resultId
      }
    });
  }

  /**
   * Log storage cleanup event
   */
  logStorageCleanup(deletedFiles: number, errors: number, cleanupType: string): void {
    const event = {
      ...this.createBaseEvent(EventType.STORAGE_CLEANUP),
      deletedFiles,
      errors,
      cleanupType,
      successRate: deletedFiles / (deletedFiles + errors),
      action: 'storage_cleanup'
    };

    logger.info('Storage cleanup completed', {
      structuredData: event,
      labels: {
        eventType: EventType.STORAGE_CLEANUP,
        cleanupType
      }
    });
  }

  /**
   * Log garment fetch event
   */
  logGarmentsFetched(count: number, duration: number): void {
    const event = {
      ...this.createBaseEvent(EventType.GARMENT_FETCHED),
      count,
      duration,
      action: 'garment_fetch'
    };

    logger.info('Garments fetched', {
      structuredData: event,
      labels: {
        eventType: EventType.GARMENT_FETCHED
      }
    });
  }

  /**
   * Log generic error event
   */
  logError(error: Error, context: Record<string, any> = {}): void {
    const event = {
      ...this.createBaseEvent(EventType.ERROR_OCCURRED),
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      context,
      action: 'error_occurrence'
    };

    logger.error('Error occurred', {
      structuredData: event,
      labels: {
        eventType: EventType.ERROR_OCCURRED,
        errorType: error.name
      }
    });
  }

  /**
   * Log function performance metrics
   */
  logPerformanceMetrics(
    functionName: string,
    metrics: PerformanceMetrics,
    additionalData: Record<string, any> = {}
  ): void {
    const event = {
      timestamp: new Date().toISOString(),
      functionName,
      version: this.version,
      metrics,
      ...additionalData,
      action: 'performance_measurement'
    };

    logger.info('Performance metrics', {
      structuredData: event,
      labels: {
        functionName,
        executionTime: metrics.executionTimeMs.toString()
      }
    });
  }
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private startTime: number;
  private functionName: string;

  constructor(functionName: string) {
    this.functionName = functionName;
    this.startTime = Date.now();
  }

  /**
   * Get current execution time
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Complete monitoring and log metrics
   */
  complete(logger: StructuredLogger, additionalData: Record<string, any> = {}): PerformanceMetrics {
    const metrics: PerformanceMetrics = {
      executionTimeMs: this.getElapsedTime(),
      ...additionalData
    };

    logger.logPerformanceMetrics(this.functionName, metrics, additionalData);
    return metrics;
  }
}

/**
 * Create a logger instance for a Cloud Function
 */
export function createLogger(functionName: string): StructuredLogger {
  return new StructuredLogger(functionName, process.env.FUNCTIONS_VERSION || '1.0.0');
}

/**
 * Create a performance monitor for a Cloud Function
 */
export function createPerformanceMonitor(functionName: string): PerformanceMonitor {
  return new PerformanceMonitor(functionName);
}
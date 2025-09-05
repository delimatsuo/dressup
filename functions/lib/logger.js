"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = exports.StructuredLogger = exports.EventType = exports.LogLevel = void 0;
exports.createLogger = createLogger;
exports.createPerformanceMonitor = createPerformanceMonitor;
const firebase_functions_1 = require("firebase-functions");
/**
 * Structured logging utility for DressUp AI monitoring
 * Provides consistent log formatting for Cloud Logging metrics
 */
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
var EventType;
(function (EventType) {
    EventType["SESSION_CREATED"] = "SESSION_CREATED";
    EventType["SESSION_DELETED"] = "SESSION_DELETED";
    EventType["PHOTO_UPLOADED"] = "PHOTO_UPLOADED";
    EventType["GENERATION_STARTED"] = "GENERATION_STARTED";
    EventType["GENERATION_COMPLETED"] = "GENERATION_COMPLETED";
    EventType["GENERATION_FAILED"] = "GENERATION_FAILED";
    EventType["FEEDBACK_SUBMITTED"] = "FEEDBACK_SUBMITTED";
    EventType["STORAGE_CLEANUP"] = "STORAGE_CLEANUP";
    EventType["GARMENT_FETCHED"] = "GARMENT_FETCHED";
    EventType["VERTEX_AI_REQUEST"] = "VERTEX_AI_REQUEST";
    EventType["VERTEX_AI_RESPONSE"] = "VERTEX_AI_RESPONSE";
    EventType["ERROR_OCCURRED"] = "ERROR_OCCURRED";
})(EventType || (exports.EventType = EventType = {}));
/**
 * Main structured logger class
 */
class StructuredLogger {
    constructor(functionName, version = '1.0.0') {
        this.functionName = functionName;
        this.version = version;
    }
    createBaseEvent(eventType, sessionId) {
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
    logSessionCreated(sessionId, expiresIn) {
        const event = {
            ...this.createBaseEvent(EventType.SESSION_CREATED, sessionId),
            expiresIn,
            action: 'session_creation'
        };
        firebase_functions_1.logger.info('Session created', {
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
    logSessionDeleted(sessionId, filesDeleted) {
        const event = {
            ...this.createBaseEvent(EventType.SESSION_DELETED, sessionId),
            filesDeleted,
            action: 'session_deletion'
        };
        firebase_functions_1.logger.info('Session deleted', {
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
    logPhotoUploaded(sessionId, photoType, fileSize) {
        const event = {
            ...this.createBaseEvent(EventType.PHOTO_UPLOADED, sessionId),
            photoType,
            fileSize,
            action: 'photo_upload'
        };
        firebase_functions_1.logger.info('Photo uploaded', {
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
    logGenerationStarted(sessionId, requestType, poseCount) {
        const event = {
            ...this.createBaseEvent(EventType.GENERATION_STARTED, sessionId),
            requestType,
            poseCount,
            action: 'generation_start'
        };
        firebase_functions_1.logger.info('Generation started', {
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
    logGenerationCompleted(sessionId, requestType, metrics, performance) {
        const event = {
            ...this.createBaseEvent(EventType.GENERATION_COMPLETED, sessionId),
            requestType,
            metrics,
            performance,
            action: 'generation_completion'
        };
        firebase_functions_1.logger.info('Generation completed', {
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
    logGenerationFailed(sessionId, requestType, error, performance, retryCount) {
        const event = {
            ...this.createBaseEvent(EventType.GENERATION_FAILED, sessionId),
            requestType,
            errorMessage: error.message,
            errorStack: error.stack,
            retryCount,
            performance,
            action: 'generation_failure'
        };
        firebase_functions_1.logger.error('Generation failed', {
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
    logVertexAIRequest(sessionId, requestSize) {
        const event = {
            ...this.createBaseEvent(EventType.VERTEX_AI_REQUEST, sessionId),
            requestSize,
            service: 'vertex-ai',
            action: 'api_request'
        };
        firebase_functions_1.logger.info('Vertex AI request', {
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
    logVertexAIResponse(sessionId, success, duration, confidence, retryCount) {
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
        firebase_functions_1.logger[logLevel]('Vertex AI response', {
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
    logFeedbackSubmitted(sessionId, resultId, rating, realismRating, helpfulnessRating) {
        const event = {
            ...this.createBaseEvent(EventType.FEEDBACK_SUBMITTED, sessionId),
            resultId,
            rating,
            realismRating,
            helpfulnessRating,
            averageRating: [rating, realismRating, helpfulnessRating]
                .filter(r => r !== undefined)
                .reduce((sum, r, _, arr) => sum + r / arr.length, 0),
            action: 'feedback_submission'
        };
        firebase_functions_1.logger.info('Feedback submitted', {
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
    logStorageCleanup(deletedFiles, errors, cleanupType) {
        const event = {
            ...this.createBaseEvent(EventType.STORAGE_CLEANUP),
            deletedFiles,
            errors,
            cleanupType,
            successRate: deletedFiles / (deletedFiles + errors),
            action: 'storage_cleanup'
        };
        firebase_functions_1.logger.info('Storage cleanup completed', {
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
    logGarmentsFetched(count, duration) {
        const event = {
            ...this.createBaseEvent(EventType.GARMENT_FETCHED),
            count,
            duration,
            action: 'garment_fetch'
        };
        firebase_functions_1.logger.info('Garments fetched', {
            structuredData: event,
            labels: {
                eventType: EventType.GARMENT_FETCHED
            }
        });
    }
    /**
     * Log generic error event
     */
    logError(error, context = {}) {
        const event = {
            ...this.createBaseEvent(EventType.ERROR_OCCURRED),
            errorMessage: error.message,
            errorStack: error.stack,
            errorName: error.name,
            context,
            action: 'error_occurrence'
        };
        firebase_functions_1.logger.error('Error occurred', {
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
    logPerformanceMetrics(functionName, metrics, additionalData = {}) {
        const event = {
            timestamp: new Date().toISOString(),
            functionName,
            version: this.version,
            metrics,
            ...additionalData,
            action: 'performance_measurement'
        };
        firebase_functions_1.logger.info('Performance metrics', {
            structuredData: event,
            labels: {
                functionName,
                executionTime: metrics.executionTimeMs.toString()
            }
        });
    }
}
exports.StructuredLogger = StructuredLogger;
/**
 * Performance monitoring utility
 */
class PerformanceMonitor {
    constructor(functionName) {
        this.functionName = functionName;
        this.startTime = Date.now();
    }
    /**
     * Get current execution time
     */
    getElapsedTime() {
        return Date.now() - this.startTime;
    }
    /**
     * Complete monitoring and log metrics
     */
    complete(logger, additionalData = {}) {
        const metrics = {
            executionTimeMs: this.getElapsedTime(),
            ...additionalData
        };
        logger.logPerformanceMetrics(this.functionName, metrics, additionalData);
        return metrics;
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
/**
 * Create a logger instance for a Cloud Function
 */
function createLogger(functionName) {
    return new StructuredLogger(functionName, process.env.FUNCTIONS_VERSION || '1.0.0');
}
/**
 * Create a performance monitor for a Cloud Function
 */
function createPerformanceMonitor(functionName) {
    return new PerformanceMonitor(functionName);
}
//# sourceMappingURL=logger.js.map
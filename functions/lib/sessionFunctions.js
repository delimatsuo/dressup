"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredSessions = exports.deleteSession = exports.getSessionPhotos = exports.extendSession = exports.addPhotoToSession = exports.getSessionStatus = exports.createSession = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const session_1 = require("./session");
const admin = __importStar(require("firebase-admin"));
// Initialize SessionManager with Firestore
const getSessionManager = () => {
    if (!admin.apps.length) {
        admin.initializeApp();
    }
    return new session_1.SessionManager((0, firestore_1.getFirestore)());
};
/**
 * Creates a new session for a user
 * Returns sessionId and expiry time
 */
exports.createSession = (0, https_1.onCall)({ maxInstances: 10 }, async (request) => {
    try {
        const sessionManager = getSessionManager();
        const result = await sessionManager.createSession();
        console.log(`Created new session: ${result.sessionId}`);
        return {
            success: true,
            sessionId: result.sessionId,
            expiresIn: result.expiresIn
        };
    }
    catch (error) {
        console.error('Error creating session:', error);
        throw new https_1.HttpsError('internal', 'Failed to create session');
    }
});
/**
 * Gets the status of an existing session
 */
exports.getSessionStatus = (0, https_1.onCall)({ maxInstances: 10 }, async (request) => {
    const { sessionId } = request.data;
    if (!sessionId) {
        throw new https_1.HttpsError('invalid-argument', 'Session ID is required');
    }
    try {
        const sessionManager = getSessionManager();
        const session = await sessionManager.getSession(sessionId);
        if (!session) {
            throw new https_1.HttpsError('not-found', 'Session not found or expired');
        }
        const remainingTime = Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
        return {
            success: true,
            session,
            remainingTime
        };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        console.error('Error getting session status:', error);
        throw new https_1.HttpsError('internal', 'Failed to get session status');
    }
});
/**
 * Adds a photo to an existing session
 */
exports.addPhotoToSession = (0, https_1.onCall)({ maxInstances: 10 }, async (request) => {
    const { sessionId, photoUrl, photoType, photoView } = request.data;
    if (!sessionId || !photoUrl || !photoType) {
        throw new https_1.HttpsError('invalid-argument', 'Session ID, photo URL, and photo type are required');
    }
    try {
        const sessionManager = getSessionManager();
        // Validate session exists and is active
        const isValid = await sessionManager.isSessionValid(sessionId);
        if (!isValid) {
            throw new https_1.HttpsError('failed-precondition', 'Session is invalid or expired');
        }
        const photoMetadata = {
            url: photoUrl,
            type: photoType,
            view: photoView,
            uploadedAt: new Date()
        };
        await sessionManager.addPhotoToSession(sessionId, photoMetadata);
        return {
            success: true,
            message: 'Photo added to session successfully'
        };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        console.error('Error adding photo to session:', error);
        throw new https_1.HttpsError('internal', 'Failed to add photo to session');
    }
});
/**
 * Extends the expiry time of a session
 */
exports.extendSession = (0, https_1.onCall)({ maxInstances: 10 }, async (request) => {
    const { sessionId, additionalMinutes = 30 } = request.data;
    if (!sessionId) {
        throw new https_1.HttpsError('invalid-argument', 'Session ID is required');
    }
    try {
        const sessionManager = getSessionManager();
        const newExpiresAt = await sessionManager.extendSession(sessionId, additionalMinutes);
        return {
            success: true,
            newExpiresAt,
            message: `Session extended by ${additionalMinutes} minutes`
        };
    }
    catch (error) {
        console.error('Error extending session:', error);
        throw new https_1.HttpsError('internal', 'Failed to extend session');
    }
});
/**
 * Gets all photos associated with a session
 */
exports.getSessionPhotos = (0, https_1.onCall)({ maxInstances: 10 }, async (request) => {
    const { sessionId } = request.data;
    if (!sessionId) {
        throw new https_1.HttpsError('invalid-argument', 'Session ID is required');
    }
    try {
        const sessionManager = getSessionManager();
        const photos = await sessionManager.getSessionPhotos(sessionId);
        return {
            success: true,
            photos,
            count: photos.length
        };
    }
    catch (error) {
        console.error('Error getting session photos:', error);
        throw new https_1.HttpsError('internal', 'Failed to get session photos');
    }
});
/**
 * Manually delete a session and its associated data
 */
exports.deleteSession = (0, https_1.onCall)({ maxInstances: 10 }, async (request) => {
    const { sessionId } = request.data;
    if (!sessionId) {
        throw new https_1.HttpsError('invalid-argument', 'Session ID is required');
    }
    try {
        const sessionManager = getSessionManager();
        const success = await sessionManager.deleteSession(sessionId);
        if (!success) {
            throw new https_1.HttpsError('internal', 'Failed to delete session');
        }
        return {
            success: true,
            message: 'Session deleted successfully'
        };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        console.error('Error deleting session:', error);
        throw new https_1.HttpsError('internal', 'Failed to delete session');
    }
});
/**
 * Scheduled function to clean up expired sessions
 * Runs every hour at the 0th minute
 */
exports.cleanupExpiredSessions = (0, scheduler_1.onSchedule)({
    schedule: '0 * * * *', // Run every hour
    timeZone: 'America/Los_Angeles',
    maxInstances: 1,
    retryCount: 3
}, async (event) => {
    try {
        const sessionManager = getSessionManager();
        const result = await sessionManager.cleanupExpiredSessions();
        console.log(`Cleaned up ${result.deletedCount} expired sessions`);
    }
    catch (error) {
        console.error('Error during session cleanup:', error);
        throw error;
    }
});
//# sourceMappingURL=sessionFunctions.js.map
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { SessionManager, PhotoMetadata } from './session';
import * as admin from 'firebase-admin';

// Initialize SessionManager with Firestore
const getSessionManager = () => {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return new SessionManager(getFirestore());
};

/**
 * Creates a new session for a user
 * Returns sessionId and expiry time
 */
export const createSession = onCall(
  { maxInstances: 10 },
  async (request) => {
    try {
      const sessionManager = getSessionManager();
      const result = await sessionManager.createSession();
      
      console.log(`Created new session: ${result.sessionId}`);
      
      return {
        success: true,
        sessionId: result.sessionId,
        expiresIn: result.expiresIn
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw new HttpsError(
        'internal',
        'Failed to create session'
      );
    }
  }
);

/**
 * Gets the status of an existing session
 */
export const getSessionStatus = onCall(
  { maxInstances: 10 },
  async (request) => {
    const { sessionId } = request.data;
    
    if (!sessionId) {
      throw new HttpsError(
        'invalid-argument',
        'Session ID is required'
      );
    }
    
    try {
      const sessionManager = getSessionManager();
      const session = await sessionManager.getSession(sessionId);
      
      if (!session) {
        throw new HttpsError(
          'not-found',
          'Session not found or expired'
        );
      }
      
      const remainingTime = Math.max(
        0,
        Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000)
      );
      
      return {
        success: true,
        session,
        remainingTime
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error('Error getting session status:', error);
      throw new HttpsError(
        'internal',
        'Failed to get session status'
      );
    }
  }
);

/**
 * Adds a photo to an existing session
 */
export const addPhotoToSession = onCall(
  { maxInstances: 10 },
  async (request) => {
    const { sessionId, photoUrl, photoType, photoView } = request.data;
    
    if (!sessionId || !photoUrl || !photoType) {
      throw new HttpsError(
        'invalid-argument',
        'Session ID, photo URL, and photo type are required'
      );
    }
    
    try {
      const sessionManager = getSessionManager();
      
      // Validate session exists and is active
      const isValid = await sessionManager.isSessionValid(sessionId);
      if (!isValid) {
        throw new HttpsError(
          'failed-precondition',
          'Session is invalid or expired'
        );
      }
      
      const photoMetadata: PhotoMetadata = {
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
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error('Error adding photo to session:', error);
      throw new HttpsError(
        'internal',
        'Failed to add photo to session'
      );
    }
  }
);

/**
 * Extends the expiry time of a session
 */
export const extendSession = onCall(
  { maxInstances: 10 },
  async (request) => {
    const { sessionId, additionalMinutes = 30 } = request.data;
    
    if (!sessionId) {
      throw new HttpsError(
        'invalid-argument',
        'Session ID is required'
      );
    }
    
    try {
      const sessionManager = getSessionManager();
      const newExpiresAt = await sessionManager.extendSession(sessionId, additionalMinutes);
      
      return {
        success: true,
        newExpiresAt,
        message: `Session extended by ${additionalMinutes} minutes`
      };
    } catch (error) {
      console.error('Error extending session:', error);
      throw new HttpsError(
        'internal',
        'Failed to extend session'
      );
    }
  }
);

/**
 * Gets all photos associated with a session
 */
export const getSessionPhotos = onCall(
  { maxInstances: 10 },
  async (request) => {
    const { sessionId } = request.data;
    
    if (!sessionId) {
      throw new HttpsError(
        'invalid-argument',
        'Session ID is required'
      );
    }
    
    try {
      const sessionManager = getSessionManager();
      const photos = await sessionManager.getSessionPhotos(sessionId);
      
      return {
        success: true,
        photos,
        count: photos.length
      };
    } catch (error) {
      console.error('Error getting session photos:', error);
      throw new HttpsError(
        'internal',
        'Failed to get session photos'
      );
    }
  }
);

/**
 * Manually delete a session and its associated data
 */
export const deleteSession = onCall(
  { maxInstances: 10 },
  async (request) => {
    const { sessionId } = request.data;
    
    if (!sessionId) {
      throw new HttpsError(
        'invalid-argument',
        'Session ID is required'
      );
    }
    
    try {
      const sessionManager = getSessionManager();
      const success = await sessionManager.deleteSession(sessionId);
      
      if (!success) {
        throw new HttpsError(
          'internal',
          'Failed to delete session'
        );
      }
      
      return {
        success: true,
        message: 'Session deleted successfully'
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error('Error deleting session:', error);
      throw new HttpsError(
        'internal',
        'Failed to delete session'
      );
    }
  }
);

/**
 * Scheduled function to clean up expired sessions
 * Runs every hour at the 0th minute
 */
export const cleanupExpiredSessions = onSchedule(
  {
    schedule: '0 * * * *', // Run every hour
    timeZone: 'America/Los_Angeles',
    maxInstances: 1,
    retryCount: 3
  },
  async (event) => {
    try {
      const sessionManager = getSessionManager();
      const result = await sessionManager.cleanupExpiredSessions();
      
      console.log(`Cleaned up ${result.deletedCount} expired sessions`);
    } catch (error) {
      console.error('Error during session cleanup:', error);
      throw error;
    }
  }
);
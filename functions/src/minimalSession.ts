import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

// Minimal session creation to unblock user immediately
export const createSession = onCall(
  { maxInstances: 10 },
  async () => {
    try {
      const sessionId = uuidv4();
      const now = admin.firestore.Timestamp.now();
      const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);

      await admin.firestore().collection('sessions').doc(sessionId).set({
        sessionId,
        userPhotos: [],
        createdAt: now,
        expiresAt: expiresAt,
        lastActivityAt: now,
        status: 'active'
      });

      return {
        success: true,
        sessionId,
        expiresIn: 86400
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw new HttpsError('internal', 'Failed to create session');
    }
  }
);

export const getSessionStatus = onCall(
  { maxInstances: 10 },
  async (request) => {
    const { sessionId } = request.data;
    
    if (!sessionId) {
      throw new HttpsError('invalid-argument', 'Session ID is required');
    }
    
    try {
      const doc = await admin.firestore().collection('sessions').doc(sessionId).get();
      
      if (!doc.exists) {
        throw new HttpsError('not-found', 'Session not found');
      }

      const session = doc.data()!;
      const remainingTime = Math.max(0, Math.floor((session.expiresAt.toMillis() - Date.now()) / 1000));
      
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
      throw new HttpsError('internal', 'Failed to get session status');
    }
  }
);
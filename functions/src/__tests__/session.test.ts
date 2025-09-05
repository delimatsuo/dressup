import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { Session, SessionManager } from '../session';

// Mock Firebase Admin
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
  FieldValue: {
    serverTimestamp: jest.fn(() => 'server_timestamp'),
    arrayUnion: jest.fn((value) => ({ arrayUnion: value }))
  }
}));

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => ({
    bucket: jest.fn(() => ({
      file: jest.fn(() => ({
        delete: jest.fn()
      }))
    }))
  }))
}));

describe('Session Management', () => {
  let sessionManager: SessionManager;
  let mockFirestore: any;

  beforeEach(() => {
    mockFirestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          set: jest.fn().mockResolvedValue(undefined),
          get: jest.fn(),
          update: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(undefined)
        }),
        where: jest.fn().mockReturnValue({
          get: jest.fn()
        })
      })
    };
    sessionManager = new SessionManager(mockFirestore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Data Model', () => {
    it('should have correct structure', () => {
      const session: Session = {
        sessionId: 'test-session-id',
        userPhotos: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 60 minutes
        status: 'active'
      };

      expect(session).toHaveProperty('sessionId');
      expect(session).toHaveProperty('userPhotos');
      expect(session).toHaveProperty('createdAt');
      expect(session).toHaveProperty('expiresAt');
      expect(session).toHaveProperty('status');
    });
  });

  describe('createSession', () => {
    it('should create a new session with 60-minute expiry', async () => {
      const mockSessionId = 'generated-session-id';
      jest.spyOn(sessionManager, 'generateSessionId').mockReturnValue(mockSessionId);

      const result = await sessionManager.createSession();

      expect(result.sessionId).toBe(mockSessionId);
      expect(result.expiresIn).toBe(3600); // 60 minutes in seconds
      
      expect(mockFirestore.collection).toHaveBeenCalledWith('sessions');
      expect(mockFirestore.collection().doc).toHaveBeenCalledWith(mockSessionId);
    });

    it('should return sessionId and expiresIn to client', async () => {
      const result = await sessionManager.createSession();
      
      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('expiresIn');
      expect(typeof result.sessionId).toBe('string');
      expect(typeof result.expiresIn).toBe('number');
    });
  });

  describe('getSession', () => {
    it('should retrieve an existing session', async () => {
      const mockSession = {
        sessionId: 'test-session-id',
        userPhotos: ['photo1.jpg', 'photo2.jpg'],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'active' as const
      };

      mockFirestore.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => mockSession
      });

      const session = await sessionManager.getSession('test-session-id');

      expect(session).toEqual(mockSession);
      expect(mockFirestore.collection).toHaveBeenCalledWith('sessions');
      expect(mockFirestore.collection().doc).toHaveBeenCalledWith('test-session-id');
    });

    it('should return null for non-existent session', async () => {
      mockFirestore.collection().doc().get.mockResolvedValue({
        exists: false
      });

      const session = await sessionManager.getSession('non-existent');

      expect(session).toBeNull();
    });

    it('should return null for expired session', async () => {
      const mockSession = {
        sessionId: 'expired-session',
        userPhotos: [],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // Expired 1 hour ago
        status: 'active' as const
      };

      mockFirestore.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => mockSession
      });

      const session = await sessionManager.getSession('expired-session');

      expect(session).toBeNull();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should delete sessions older than 60 minutes', async () => {
      const expiredSessions = [
        { id: 'expired-1', data: () => ({ expiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000), userPhotos: [] }) },
        { id: 'expired-2', data: () => ({ expiresAt: new Date(Date.now() - 3 * 60 * 60 * 1000), userPhotos: [] }) }
      ];

      mockFirestore.collection().where().get.mockResolvedValue({
        docs: expiredSessions
      });

      const result = await sessionManager.cleanupExpiredSessions();

      expect(result.deletedCount).toBe(2);
      expect(mockFirestore.collection().doc).toHaveBeenCalledWith('expired-1');
      expect(mockFirestore.collection().doc).toHaveBeenCalledWith('expired-2');
      expect(mockFirestore.collection().doc().delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('Session Validation', () => {
    it('should validate session is not expired', async () => {
      const activeSession = {
        sessionId: 'active-session',
        userPhotos: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'active' as const
      };

      mockFirestore.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => activeSession
      });

      const isValid = await sessionManager.isSessionValid('active-session');
      expect(isValid).toBe(true);
    });

    it('should invalidate expired session', async () => {
      const expiredSession = {
        sessionId: 'expired-session',
        userPhotos: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 10 * 60 * 1000),
        status: 'active' as const
      };

      mockFirestore.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => expiredSession
      });

      const isValid = await sessionManager.isSessionValid('expired-session');
      expect(isValid).toBe(false);
    });
  });
});
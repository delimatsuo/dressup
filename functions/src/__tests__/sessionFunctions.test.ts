import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import * as functions from 'firebase-functions';
import { createSession, cleanupExpiredSessions, getSessionStatus } from '../sessionFunctions';
import { SessionManager } from '../session';

// Mock Firebase Functions
jest.mock('firebase-functions', () => ({
  https: {
    onCall: jest.fn((handler) => handler),
    HttpsError: jest.fn((code, message) => new Error(`${code}: ${message}`))
  },
  pubsub: {
    schedule: jest.fn(() => ({
      timeZone: jest.fn(() => ({
        onRun: jest.fn((handler) => handler)
      }))
    }))
  }
}));

// Mock SessionManager
jest.mock('../session');

describe('Session Cloud Functions', () => {
  let mockSessionManager: jest.Mocked<SessionManager>;

  beforeEach(() => {
    mockSessionManager = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      isSessionValid: jest.fn(),
      cleanupExpiredSessions: jest.fn(),
      generateSessionId: jest.fn(),
      addPhotoToSession: jest.fn(),
      deletePhotoFromStorage: jest.fn(),
      updateSessionStatus: jest.fn(),
      extendSession: jest.fn(),
      getSessionPhotos: jest.fn(),
      deleteSession: jest.fn()
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession Cloud Function', () => {
    it('should create a new session and return sessionId', async () => {
      const mockSessionData = {
        sessionId: 'test-session-123',
        expiresIn: 3600
      };

      mockSessionManager.createSession.mockResolvedValue(mockSessionData);

      const result = await createSession({}, { auth: { uid: 'test-user' } } as any);

      expect(result).toEqual({
        success: true,
        sessionId: 'test-session-123',
        expiresIn: 3600
      });
    });

    it('should handle session creation without auth', async () => {
      const mockSessionData = {
        sessionId: 'anon-session-456',
        expiresIn: 3600
      };

      mockSessionManager.createSession.mockResolvedValue(mockSessionData);

      const result = await createSession({}, { auth: null } as any);

      expect(result).toEqual({
        success: true,
        sessionId: 'anon-session-456',
        expiresIn: 3600
      });
    });

    it('should handle session creation errors', async () => {
      mockSessionManager.createSession.mockRejectedValue(new Error('Database error'));

      await expect(createSession({}, {} as any)).rejects.toThrow();
    });
  });

  describe('getSessionStatus Cloud Function', () => {
    it('should return session status for valid session', async () => {
      const mockSession = {
        sessionId: 'test-session-123',
        userPhotos: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'active'
      };

      mockSessionManager.getSession.mockResolvedValue(mockSession);

      const result = await getSessionStatus(
        { sessionId: 'test-session-123' },
        {} as any
      );

      expect(result).toEqual({
        success: true,
        session: expect.objectContaining({
          sessionId: 'test-session-123',
          status: 'active'
        }),
        remainingTime: expect.any(Number)
      });
    });

    it('should return error for invalid session', async () => {
      mockSessionManager.getSession.mockResolvedValue(null);

      await expect(
        getSessionStatus({ sessionId: 'invalid-session' }, {} as any)
      ).rejects.toThrow();
    });

    it('should require sessionId parameter', async () => {
      await expect(
        getSessionStatus({}, {} as any)
      ).rejects.toThrow();
    });
  });

  describe('cleanupExpiredSessions Scheduled Function', () => {
    it('should run cleanup on schedule', async () => {
      mockSessionManager.cleanupExpiredSessions.mockResolvedValue({ deletedCount: 5 });

      const result = await cleanupExpiredSessions({} as any);

      expect(mockSessionManager.cleanupExpiredSessions).toHaveBeenCalled();
      expect(result).toEqual({ deletedCount: 5 });
    });

    it('should handle cleanup errors gracefully', async () => {
      mockSessionManager.cleanupExpiredSessions.mockRejectedValue(
        new Error('Cleanup failed')
      );

      await expect(cleanupExpiredSessions({} as any)).rejects.toThrow('Cleanup failed');
    });

    it('should log cleanup results', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockSessionManager.cleanupExpiredSessions.mockResolvedValue({ deletedCount: 3 });

      await cleanupExpiredSessions({} as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up 3 expired sessions')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Session Extension', () => {
    it('should extend session expiry time', async () => {
      const newExpiryDate = new Date(Date.now() + 90 * 60 * 1000);
      mockSessionManager.extendSession.mockResolvedValue(newExpiryDate);

      const extendSession = jest.fn().mockResolvedValue({
        success: true,
        newExpiresAt: newExpiryDate
      });

      const result = await extendSession('test-session-123', 30);

      expect(result).toEqual({
        success: true,
        newExpiresAt: newExpiryDate
      });
    });
  });

  describe('Session Photo Management', () => {
    it('should add photo to session', async () => {
      const photoMetadata = {
        url: 'https://storage.googleapis.com/photo.jpg',
        type: 'user' as const,
        view: 'front' as const,
        uploadedAt: new Date()
      };

      mockSessionManager.addPhotoToSession.mockResolvedValue(undefined);

      const addPhoto = jest.fn().mockResolvedValue({
        success: true,
        photoAdded: true
      });

      const result = await addPhoto('test-session-123', photoMetadata);

      expect(result).toEqual({
        success: true,
        photoAdded: true
      });
    });

    it('should retrieve session photos', async () => {
      const mockPhotos = [
        { url: 'photo1.jpg', type: 'user', view: 'front', uploadedAt: new Date() },
        { url: 'photo2.jpg', type: 'garment', uploadedAt: new Date() }
      ];

      mockSessionManager.getSessionPhotos.mockResolvedValue(mockPhotos);

      const getPhotos = jest.fn().mockResolvedValue({
        success: true,
        photos: mockPhotos
      });

      const result = await getPhotos('test-session-123');

      expect(result.photos).toHaveLength(2);
      expect(result.photos[0].view).toBe('front');
    });
  });
});
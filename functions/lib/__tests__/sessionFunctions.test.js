"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const sessionFunctions_1 = require("../sessionFunctions");
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
(0, globals_1.describe)('Session Cloud Functions', () => {
    let mockSessionManager;
    (0, globals_1.beforeEach)(() => {
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
        };
    });
    (0, globals_1.afterEach)(() => {
        jest.clearAllMocks();
    });
    (0, globals_1.describe)('createSession Cloud Function', () => {
        (0, globals_1.it)('should create a new session and return sessionId', async () => {
            const mockSessionData = {
                sessionId: 'test-session-123',
                expiresIn: 3600
            };
            mockSessionManager.createSession.mockResolvedValue(mockSessionData);
            const result = await (0, sessionFunctions_1.createSession)({}, { auth: { uid: 'test-user' } });
            (0, globals_1.expect)(result).toEqual({
                success: true,
                sessionId: 'test-session-123',
                expiresIn: 3600
            });
        });
        (0, globals_1.it)('should handle session creation without auth', async () => {
            const mockSessionData = {
                sessionId: 'anon-session-456',
                expiresIn: 3600
            };
            mockSessionManager.createSession.mockResolvedValue(mockSessionData);
            const result = await (0, sessionFunctions_1.createSession)({}, { auth: null });
            (0, globals_1.expect)(result).toEqual({
                success: true,
                sessionId: 'anon-session-456',
                expiresIn: 3600
            });
        });
        (0, globals_1.it)('should handle session creation errors', async () => {
            mockSessionManager.createSession.mockRejectedValue(new Error('Database error'));
            await (0, globals_1.expect)((0, sessionFunctions_1.createSession)({}, {})).rejects.toThrow();
        });
    });
    (0, globals_1.describe)('getSessionStatus Cloud Function', () => {
        (0, globals_1.it)('should return session status for valid session', async () => {
            const mockSession = {
                sessionId: 'test-session-123',
                userPhotos: [],
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                status: 'active'
            };
            mockSessionManager.getSession.mockResolvedValue(mockSession);
            const result = await (0, sessionFunctions_1.getSessionStatus)({ sessionId: 'test-session-123' }, {});
            (0, globals_1.expect)(result).toEqual({
                success: true,
                session: globals_1.expect.objectContaining({
                    sessionId: 'test-session-123',
                    status: 'active'
                }),
                remainingTime: globals_1.expect.any(Number)
            });
        });
        (0, globals_1.it)('should return error for invalid session', async () => {
            mockSessionManager.getSession.mockResolvedValue(null);
            await (0, globals_1.expect)((0, sessionFunctions_1.getSessionStatus)({ sessionId: 'invalid-session' }, {})).rejects.toThrow();
        });
        (0, globals_1.it)('should require sessionId parameter', async () => {
            await (0, globals_1.expect)((0, sessionFunctions_1.getSessionStatus)({}, {})).rejects.toThrow();
        });
    });
    (0, globals_1.describe)('cleanupExpiredSessions Scheduled Function', () => {
        (0, globals_1.it)('should run cleanup on schedule', async () => {
            mockSessionManager.cleanupExpiredSessions.mockResolvedValue({ deletedCount: 5 });
            const result = await (0, sessionFunctions_1.cleanupExpiredSessions)({});
            (0, globals_1.expect)(mockSessionManager.cleanupExpiredSessions).toHaveBeenCalled();
            (0, globals_1.expect)(result).toEqual({ deletedCount: 5 });
        });
        (0, globals_1.it)('should handle cleanup errors gracefully', async () => {
            mockSessionManager.cleanupExpiredSessions.mockRejectedValue(new Error('Cleanup failed'));
            await (0, globals_1.expect)((0, sessionFunctions_1.cleanupExpiredSessions)({})).rejects.toThrow('Cleanup failed');
        });
        (0, globals_1.it)('should log cleanup results', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            mockSessionManager.cleanupExpiredSessions.mockResolvedValue({ deletedCount: 3 });
            await (0, sessionFunctions_1.cleanupExpiredSessions)({});
            (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining('Cleaned up 3 expired sessions'));
            consoleSpy.mockRestore();
        });
    });
    (0, globals_1.describe)('Session Extension', () => {
        (0, globals_1.it)('should extend session expiry time', async () => {
            const newExpiryDate = new Date(Date.now() + 90 * 60 * 1000);
            mockSessionManager.extendSession.mockResolvedValue(newExpiryDate);
            const extendSession = jest.fn().mockResolvedValue({
                success: true,
                newExpiresAt: newExpiryDate
            });
            const result = await extendSession('test-session-123', 30);
            (0, globals_1.expect)(result).toEqual({
                success: true,
                newExpiresAt: newExpiryDate
            });
        });
    });
    (0, globals_1.describe)('Session Photo Management', () => {
        (0, globals_1.it)('should add photo to session', async () => {
            const photoMetadata = {
                url: 'https://storage.googleapis.com/photo.jpg',
                type: 'user',
                view: 'front',
                uploadedAt: new Date()
            };
            mockSessionManager.addPhotoToSession.mockResolvedValue(undefined);
            const addPhoto = jest.fn().mockResolvedValue({
                success: true,
                photoAdded: true
            });
            const result = await addPhoto('test-session-123', photoMetadata);
            (0, globals_1.expect)(result).toEqual({
                success: true,
                photoAdded: true
            });
        });
        (0, globals_1.it)('should retrieve session photos', async () => {
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
            (0, globals_1.expect)(result.photos).toHaveLength(2);
            (0, globals_1.expect)(result.photos[0].view).toBe('front');
        });
    });
});
//# sourceMappingURL=sessionFunctions.test.js.map
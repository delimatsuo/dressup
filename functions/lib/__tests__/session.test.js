"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const session_1 = require("../session");
// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    firestore: jest.fn(() => ({
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                set: jest.fn(),
                get: jest.fn(),
                update: jest.fn(),
                delete: jest.fn()
            })),
            where: jest.fn(() => ({
                get: jest.fn()
            }))
        })),
        FieldValue: {
            serverTimestamp: jest.fn(() => 'server_timestamp')
        }
    }))
}));
(0, globals_1.describe)('Session Management', () => {
    let sessionManager;
    let mockFirestore;
    (0, globals_1.beforeEach)(() => {
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
        sessionManager = new session_1.SessionManager(mockFirestore);
    });
    (0, globals_1.afterEach)(() => {
        jest.clearAllMocks();
    });
    (0, globals_1.describe)('Session Data Model', () => {
        (0, globals_1.it)('should have correct structure', () => {
            const session = {
                sessionId: 'test-session-id',
                userPhotos: [],
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 60 minutes
                status: 'active'
            };
            (0, globals_1.expect)(session).toHaveProperty('sessionId');
            (0, globals_1.expect)(session).toHaveProperty('userPhotos');
            (0, globals_1.expect)(session).toHaveProperty('createdAt');
            (0, globals_1.expect)(session).toHaveProperty('expiresAt');
            (0, globals_1.expect)(session).toHaveProperty('status');
        });
    });
    (0, globals_1.describe)('createSession', () => {
        (0, globals_1.it)('should create a new session with 60-minute expiry', async () => {
            const mockSessionId = 'generated-session-id';
            jest.spyOn(sessionManager, 'generateSessionId').mockReturnValue(mockSessionId);
            const result = await sessionManager.createSession();
            (0, globals_1.expect)(result.sessionId).toBe(mockSessionId);
            (0, globals_1.expect)(result.expiresIn).toBe(3600); // 60 minutes in seconds
            (0, globals_1.expect)(mockFirestore.collection).toHaveBeenCalledWith('sessions');
            (0, globals_1.expect)(mockFirestore.collection().doc).toHaveBeenCalledWith(mockSessionId);
            (0, globals_1.expect)(mockFirestore.collection().doc().set).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                sessionId: mockSessionId,
                userPhotos: [],
                status: 'active'
            }));
        });
        (0, globals_1.it)('should return sessionId and expiresIn to client', async () => {
            const result = await sessionManager.createSession();
            (0, globals_1.expect)(result).toHaveProperty('sessionId');
            (0, globals_1.expect)(result).toHaveProperty('expiresIn');
            (0, globals_1.expect)(typeof result.sessionId).toBe('string');
            (0, globals_1.expect)(typeof result.expiresIn).toBe('number');
        });
    });
    (0, globals_1.describe)('getSession', () => {
        (0, globals_1.it)('should retrieve an existing session', async () => {
            const mockSession = {
                sessionId: 'test-session-id',
                userPhotos: ['photo1.jpg', 'photo2.jpg'],
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                status: 'active'
            };
            mockFirestore.collection().doc().get.mockResolvedValue({
                exists: true,
                data: () => mockSession
            });
            const session = await sessionManager.getSession('test-session-id');
            (0, globals_1.expect)(session).toEqual(mockSession);
            (0, globals_1.expect)(mockFirestore.collection).toHaveBeenCalledWith('sessions');
            (0, globals_1.expect)(mockFirestore.collection().doc).toHaveBeenCalledWith('test-session-id');
        });
        (0, globals_1.it)('should return null for non-existent session', async () => {
            mockFirestore.collection().doc().get.mockResolvedValue({
                exists: false
            });
            const session = await sessionManager.getSession('non-existent');
            (0, globals_1.expect)(session).toBeNull();
        });
        (0, globals_1.it)('should return null for expired session', async () => {
            const mockSession = {
                sessionId: 'expired-session',
                userPhotos: [],
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
                expiresAt: new Date(Date.now() - 60 * 60 * 1000), // Expired 1 hour ago
                status: 'active'
            };
            mockFirestore.collection().doc().get.mockResolvedValue({
                exists: true,
                data: () => mockSession
            });
            const session = await sessionManager.getSession('expired-session');
            (0, globals_1.expect)(session).toBeNull();
        });
    });
    (0, globals_1.describe)('addPhotoToSession', () => {
        (0, globals_1.it)('should add photo URL to session', async () => {
            const sessionId = 'test-session-id';
            const photoUrl = 'https://storage.googleapis.com/photo.jpg';
            const photoMetadata = {
                url: photoUrl,
                type: 'user',
                view: 'front',
                uploadedAt: new Date()
            };
            await sessionManager.addPhotoToSession(sessionId, photoMetadata);
            (0, globals_1.expect)(mockFirestore.collection().doc().update).toHaveBeenCalledWith({
                userPhotos: globals_1.expect.any(Object)
            });
        });
        (0, globals_1.it)('should support multiple photo views (front, side, back)', async () => {
            const sessionId = 'test-session-id';
            const frontPhoto = { url: 'front.jpg', type: 'user', view: 'front', uploadedAt: new Date() };
            const sidePhoto = { url: 'side.jpg', type: 'user', view: 'side', uploadedAt: new Date() };
            const backPhoto = { url: 'back.jpg', type: 'user', view: 'back', uploadedAt: new Date() };
            await sessionManager.addPhotoToSession(sessionId, frontPhoto);
            await sessionManager.addPhotoToSession(sessionId, sidePhoto);
            await sessionManager.addPhotoToSession(sessionId, backPhoto);
            (0, globals_1.expect)(mockFirestore.collection().doc().update).toHaveBeenCalledTimes(3);
        });
    });
    (0, globals_1.describe)('cleanupExpiredSessions', () => {
        (0, globals_1.it)('should delete sessions older than 60 minutes', async () => {
            const expiredSessions = [
                { id: 'expired-1', data: () => ({ expiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000) }) },
                { id: 'expired-2', data: () => ({ expiresAt: new Date(Date.now() - 3 * 60 * 60 * 1000) }) }
            ];
            mockFirestore.collection().where().get.mockResolvedValue({
                docs: expiredSessions
            });
            const result = await sessionManager.cleanupExpiredSessions();
            (0, globals_1.expect)(result.deletedCount).toBe(2);
            (0, globals_1.expect)(mockFirestore.collection().doc).toHaveBeenCalledWith('expired-1');
            (0, globals_1.expect)(mockFirestore.collection().doc).toHaveBeenCalledWith('expired-2');
            (0, globals_1.expect)(mockFirestore.collection().doc().delete).toHaveBeenCalledTimes(2);
        });
        (0, globals_1.it)('should delete associated photos from Storage', async () => {
            const expiredSession = {
                id: 'expired-session',
                data: () => ({
                    expiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
                    userPhotos: [
                        { url: 'photo1.jpg', type: 'user' },
                        { url: 'photo2.jpg', type: 'garment' }
                    ]
                })
            };
            mockFirestore.collection().where().get.mockResolvedValue({
                docs: [expiredSession]
            });
            const mockDeletePhoto = jest.fn().mockResolvedValue(true);
            jest.spyOn(sessionManager, 'deletePhotoFromStorage').mockImplementation(mockDeletePhoto);
            await sessionManager.cleanupExpiredSessions();
            (0, globals_1.expect)(mockDeletePhoto).toHaveBeenCalledWith('photo1.jpg');
            (0, globals_1.expect)(mockDeletePhoto).toHaveBeenCalledWith('photo2.jpg');
        });
    });
    (0, globals_1.describe)('Session Validation', () => {
        (0, globals_1.it)('should validate session is not expired', async () => {
            const activeSession = {
                sessionId: 'active-session',
                expiresAt: new Date(Date.now() + 30 * 60 * 1000)
            };
            mockFirestore.collection().doc().get.mockResolvedValue({
                exists: true,
                data: () => activeSession
            });
            const isValid = await sessionManager.isSessionValid('active-session');
            (0, globals_1.expect)(isValid).toBe(true);
        });
        (0, globals_1.it)('should invalidate expired session', async () => {
            const expiredSession = {
                sessionId: 'expired-session',
                expiresAt: new Date(Date.now() - 10 * 60 * 1000)
            };
            mockFirestore.collection().doc().get.mockResolvedValue({
                exists: true,
                data: () => expiredSession
            });
            const isValid = await sessionManager.isSessionValid('expired-session');
            (0, globals_1.expect)(isValid).toBe(false);
        });
    });
});
//# sourceMappingURL=session.test.js.map
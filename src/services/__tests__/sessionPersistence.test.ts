import { 
  SessionPersistenceService, 
  UserSession, 
  EncryptedSessionData,
  SessionSettings,
  PhotoHistoryItem,
  FavoriteItem
} from '../sessionPersistence';

// Mock crypto for testing
const mockCrypto = {
  randomUUID: jest.fn(() => 'mock-uuid-123'),
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  subtle: {
    generateKey: jest.fn().mockResolvedValue({ type: 'secret', extractable: true }),
    encrypt: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
    decrypt: jest.fn().mockResolvedValue(new Uint8Array([5, 6, 7, 8])),
    importKey: jest.fn(),
    exportKey: jest.fn(),
  }
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Mock TextEncoder and TextDecoder for Node.js environment
Object.defineProperty(global, 'TextEncoder', {
  value: class TextEncoder {
    encode(input: string): Uint8Array {
      return new Uint8Array(Buffer.from(input, 'utf-8'));
    }
  },
});

Object.defineProperty(global, 'TextDecoder', {
  value: class TextDecoder {
    decode(input: Uint8Array): string {
      return Buffer.from(input).toString('utf-8');
    }
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock Firebase
jest.mock('../../lib/firebase', () => ({
  getUserSession: jest.fn(),
  saveUserSession: jest.fn(),
  syncSessionData: jest.fn(),
}));

describe('SessionPersistenceService', () => {
  let sessionService: SessionPersistenceService;
  let mockUserSession: UserSession;
  let mockSessionSettings: SessionSettings;
  let mockPhotoHistory: PhotoHistoryItem[];
  let mockFavorites: FavoriteItem[];

  beforeEach(() => {
    jest.clearAllMocks();
    
    sessionService = new SessionPersistenceService();
    
    mockUserSession = {
      id: 'user-123',
      userId: 'test-user',
      createdAt: new Date(),
      lastActivity: new Date(),
      deviceInfo: {
        userAgent: 'test-agent',
        platform: 'test-platform',
        screen: { width: 1920, height: 1080 }
      },
      settings: {
        theme: 'light',
        language: 'en',
        notifications: true,
        autoSave: true,
        privacy: 'private'
      },
      preferences: {
        preferredStyles: ['casual', 'formal'],
        colorPalette: ['#FF0000', '#00FF00'],
        bodyType: 'athletic',
        favorites: ['item1', 'item2']
      },
      isActive: true
    };

    mockSessionSettings = {
      theme: 'light',
      language: 'en',
      notifications: true,
      autoSave: true,
      privacy: 'private'
    };

    mockPhotoHistory = [
      {
        id: 'photo-1',
        url: 'https://example.com/photo1.jpg',
        uploadedAt: new Date(),
        processedImages: [
          { id: 'processed-1', url: 'https://example.com/processed1.jpg', style: 'casual' }
        ],
        metadata: { size: 1024, format: 'jpg' }
      }
    ];

    mockFavorites = [
      {
        id: 'fav-1',
        type: 'outfit',
        imageUrl: 'https://example.com/favorite1.jpg',
        addedAt: new Date(),
        metadata: { style: 'casual', colors: ['red', 'blue'] }
      }
    ];
  });

  describe('Session Management', () => {
    test('should create a new session with encrypted data', async () => {
      const encryptedData = new Uint8Array([1, 2, 3, 4]);
      mockCrypto.subtle.encrypt.mockResolvedValue(encryptedData);

      const session = await sessionService.createSession(mockUserSession);

      expect(session).toBeDefined();
      expect(session.id).toBe('user-123');
      expect(session.userId).toBe('test-user');
      expect(session.isActive).toBe(true);
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
    });

    test('should retrieve and decrypt session data', async () => {
      const encryptedData = { 
        data: new Uint8Array([1, 2, 3, 4]),
        iv: new Uint8Array([5, 6, 7, 8])
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        sessionId: 'user-123',
        encryptedData: Array.from(encryptedData.data),
        iv: Array.from(encryptedData.iv),
        timestamp: Date.now()
      }));

      const decryptedSession = JSON.stringify(mockUserSession);
      const encodedData = new TextEncoder().encode(decryptedSession);
      mockCrypto.subtle.decrypt.mockResolvedValueOnce(encodedData.buffer);

      const session = await sessionService.getSession('user-123');

      expect(session).toEqual(mockUserSession);
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
      expect(localStorageMock.getItem).toHaveBeenCalledWith('dressup_session_user-123');
    });

    test('should handle session retrieval when no session exists', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const session = await sessionService.getSession('nonexistent');

      expect(session).toBeNull();
    });

    test('should update existing session data', async () => {
      const updates = { 
        lastActivity: new Date(),
        settings: { ...mockSessionSettings, theme: 'dark' }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        sessionId: 'user-123',
        encryptedData: [1, 2, 3, 4],
        iv: [5, 6, 7, 8],
        timestamp: Date.now()
      }));

      const decryptedSession = JSON.stringify(mockUserSession);
      const encodedData = new TextEncoder().encode(decryptedSession);
      mockCrypto.subtle.decrypt.mockResolvedValueOnce(encodedData.buffer);

      const encryptedData = new Uint8Array([1, 2, 3, 4]);
      mockCrypto.subtle.encrypt.mockResolvedValue(encryptedData);

      await sessionService.updateSession('user-123', updates);

      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    test('should destroy session and clear storage', async () => {
      await sessionService.destroySession('user-123');

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('dressup_session_user-123');
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('dressup_temp_user-123');
    });
  });

  describe('Settings Persistence', () => {
    test('should save user settings with encryption', async () => {
      const encryptedData = new Uint8Array([1, 2, 3, 4]);
      mockCrypto.subtle.encrypt.mockResolvedValue(encryptedData);

      await sessionService.saveSettings('user-123', mockSessionSettings);

      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dressup_settings_user-123',
        expect.any(String)
      );
    });

    test('should load and decrypt user settings', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        encryptedData: [1, 2, 3, 4],
        iv: [5, 6, 7, 8],
        timestamp: Date.now()
      }));

      const decryptedSettings = JSON.stringify(mockSessionSettings);
      const encodedSettings = new TextEncoder().encode(decryptedSettings);
      mockCrypto.subtle.decrypt.mockResolvedValue(encodedSettings.buffer);

      const settings = await sessionService.getSettings('user-123');

      expect(settings).toEqual(mockSessionSettings);
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
    });

    test('should return default settings when none exist', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const settings = await sessionService.getSettings('user-123');

      expect(settings).toEqual({
        theme: 'light',
        language: 'en',
        notifications: true,
        autoSave: true,
        privacy: 'private'
      });
    });
  });

  describe('Photo History Management', () => {
    test('should save photo history with encryption', async () => {
      const encryptedData = new Uint8Array([1, 2, 3, 4]);
      mockCrypto.subtle.encrypt.mockResolvedValue(encryptedData);

      await sessionService.savePhotoHistory('user-123', mockPhotoHistory);

      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dressup_history_user-123',
        expect.any(String)
      );
    });

    test('should load and decrypt photo history', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        encryptedData: [1, 2, 3, 4],
        iv: [5, 6, 7, 8],
        timestamp: Date.now()
      }));

      const decryptedHistory = JSON.stringify(mockPhotoHistory);
      const encodedHistory = new TextEncoder().encode(decryptedHistory);
      mockCrypto.subtle.decrypt.mockResolvedValue(encodedHistory.buffer);

      const history = await sessionService.getPhotoHistory('user-123');

      expect(history).toEqual(mockPhotoHistory);
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
    });

    test('should add new photo to history', async () => {
      const newPhoto: PhotoHistoryItem = {
        id: 'photo-2',
        url: 'https://example.com/photo2.jpg',
        uploadedAt: new Date(),
        processedImages: [],
        metadata: { size: 2048, format: 'png' }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        encryptedData: [1, 2, 3, 4],
        iv: [5, 6, 7, 8],
        timestamp: Date.now()
      }));

      const decryptedHistory = JSON.stringify(mockPhotoHistory);
      const encodedHistory = new TextEncoder().encode(decryptedHistory);
      mockCrypto.subtle.decrypt.mockResolvedValue(encodedHistory.buffer);

      const encryptedData = new Uint8Array([1, 2, 3, 4]);
      mockCrypto.subtle.encrypt.mockResolvedValue(encryptedData);

      await sessionService.addToPhotoHistory('user-123', newPhoto);

      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    test('should maintain history size limit', async () => {
      const largeHistory = Array.from({ length: 102 }, (_, i) => ({
        id: `photo-${i}`,
        url: `https://example.com/photo${i}.jpg`,
        uploadedAt: new Date(),
        processedImages: [],
        metadata: { size: 1024, format: 'jpg' }
      }));

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        encryptedData: [1, 2, 3, 4],
        iv: [5, 6, 7, 8],
        timestamp: Date.now()
      }));

      const decryptedHistory = JSON.stringify(largeHistory);
      const encodedHistory = new TextEncoder().encode(decryptedHistory);
      mockCrypto.subtle.decrypt.mockResolvedValue(encodedHistory.buffer);

      const encryptedData = new Uint8Array([1, 2, 3, 4]);
      mockCrypto.subtle.encrypt.mockResolvedValue(encryptedData);

      const newPhoto: PhotoHistoryItem = {
        id: 'photo-new',
        url: 'https://example.com/new.jpg',
        uploadedAt: new Date(),
        processedImages: [],
        metadata: { size: 1024, format: 'jpg' }
      };

      await sessionService.addToPhotoHistory('user-123', newPhoto);

      // Verify that the history was trimmed to 100 items
      const encryptCall = mockCrypto.subtle.encrypt.mock.calls[0];
      const historyData = JSON.parse(new TextDecoder().decode(encryptCall[1]));
      expect(historyData).toHaveLength(100);
    });
  });

  describe('Favorites Management', () => {
    test('should save favorites with encryption', async () => {
      const encryptedData = new Uint8Array([1, 2, 3, 4]);
      mockCrypto.subtle.encrypt.mockResolvedValue(encryptedData);

      await sessionService.saveFavorites('user-123', mockFavorites);

      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dressup_favorites_user-123',
        expect.any(String)
      );
    });

    test('should load and decrypt favorites', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        encryptedData: [1, 2, 3, 4],
        iv: [5, 6, 7, 8],
        timestamp: Date.now()
      }));

      const decryptedFavorites = JSON.stringify(mockFavorites);
      const encodedFavorites = new TextEncoder().encode(decryptedFavorites);
      mockCrypto.subtle.decrypt.mockResolvedValue(encodedFavorites.buffer);

      const favorites = await sessionService.getFavorites('user-123');

      expect(favorites).toEqual(mockFavorites);
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
    });

    test('should add item to favorites', async () => {
      const newFavorite: FavoriteItem = {
        id: 'fav-2',
        type: 'style',
        imageUrl: 'https://example.com/favorite2.jpg',
        addedAt: new Date(),
        metadata: { style: 'formal', colors: ['black', 'white'] }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        encryptedData: [1, 2, 3, 4],
        iv: [5, 6, 7, 8],
        timestamp: Date.now()
      }));

      const decryptedFavorites = JSON.stringify(mockFavorites);
      const encodedFavorites = new TextEncoder().encode(decryptedFavorites);
      mockCrypto.subtle.decrypt.mockResolvedValue(encodedFavorites.buffer);

      const encryptedData = new Uint8Array([1, 2, 3, 4]);
      mockCrypto.subtle.encrypt.mockResolvedValue(encryptedData);

      await sessionService.addToFavorites('user-123', newFavorite);

      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    test('should remove item from favorites', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        encryptedData: [1, 2, 3, 4],
        iv: [5, 6, 7, 8],
        timestamp: Date.now()
      }));

      const decryptedFavorites = JSON.stringify(mockFavorites);
      const encodedFavorites = new TextEncoder().encode(decryptedFavorites);
      mockCrypto.subtle.decrypt.mockResolvedValue(encodedFavorites.buffer);

      const encryptedData = new Uint8Array([1, 2, 3, 4]);
      mockCrypto.subtle.encrypt.mockResolvedValue(encryptedData);

      await sessionService.removeFromFavorites('user-123', 'fav-1');

      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('Cross-Device Synchronization', () => {
    test('should sync session data to Firebase', async () => {
      const { syncSessionData } = require('../../lib/firebase');
      
      await sessionService.syncToCloud('user-123', mockUserSession);

      expect(syncSessionData).toHaveBeenCalledWith('user-123', {
        session: mockUserSession,
        settings: expect.any(Object),
        photoHistory: expect.any(Array),
        favorites: expect.any(Array),
        timestamp: expect.any(Number)
      });
    });

    test('should handle sync conflicts by using latest timestamp', async () => {
      const { getUserSession } = require('../../lib/firebase');
      
      const cloudSession = {
        ...mockUserSession,
        lastActivity: new Date(Date.now() + 1000),
        settings: { ...mockSessionSettings, theme: 'dark' }
      };

      getUserSession.mockResolvedValue({
        session: cloudSession,
        timestamp: Date.now() + 1000
      });

      const localTimestamp = Date.now();
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        sessionId: 'user-123',
        encryptedData: [1, 2, 3, 4],
        iv: [5, 6, 7, 8],
        timestamp: localTimestamp
      }));

      const result = await sessionService.resolveConflict('user-123');

      expect(result.session.settings.theme).toBe('dark');
      expect(result.source).toBe('cloud');
    });

    test('should enable automatic sync on session activity', async () => {
      const syncSpy = jest.spyOn(sessionService, 'syncToCloud');
      syncSpy.mockResolvedValue(undefined);

      await sessionService.enableAutoSync('user-123', {
        interval: 1000,
        onActivity: true,
        onClose: true
      });

      // Trigger activity
      await sessionService.updateSession('user-123', {
        lastActivity: new Date()
      });

      expect(syncSpy).toHaveBeenCalled();
    });
  });

  describe('Security & Privacy', () => {
    test('should use strong encryption for sensitive data', async () => {
      await sessionService.createSession(mockUserSession);

      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    });

    test('should validate session integrity', async () => {
      const tamperedData = JSON.stringify({
        sessionId: 'user-123',
        encryptedData: [9, 9, 9, 9], // Tampered data
        iv: [5, 6, 7, 8],
        timestamp: Date.now(),
        signature: 'invalid-signature'
      });

      localStorageMock.getItem.mockReturnValue(tamperedData);
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'));

      const session = await sessionService.getSession('user-123');

      expect(session).toBeNull();
    });

    test('should handle expired sessions', async () => {
      const expiredTimestamp = Date.now() - (24 * 60 * 60 * 1000 + 1); // 1 day + 1ms ago
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        sessionId: 'user-123',
        encryptedData: [1, 2, 3, 4],
        iv: [5, 6, 7, 8],
        timestamp: expiredTimestamp
      }));

      const session = await sessionService.getSession('user-123');

      expect(session).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('dressup_session_user-123');
    });

    test('should respect privacy settings', async () => {
      const privateSession = {
        ...mockUserSession,
        settings: { ...mockSessionSettings, privacy: 'private' }
      };

      const encryptedData = new Uint8Array([1, 2, 3, 4]);
      mockCrypto.subtle.encrypt.mockResolvedValue(encryptedData);

      await sessionService.createSession(privateSession);

      // Should not sync to cloud for private sessions
      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle localStorage quota exceeded', async () => {
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      localStorageMock.setItem.mockImplementation(() => {
        throw quotaError;
      });

      // Should fallback to sessionStorage
      await sessionService.saveSettings('user-123', mockSessionSettings);

      expect(sessionStorageMock.setItem).toHaveBeenCalled();
    });

    test('should handle network errors during sync', async () => {
      const { syncSessionData } = require('../../lib/firebase');
      syncSessionData.mockRejectedValue(new Error('Network error'));

      // Should not throw, but should log error
      await expect(
        sessionService.syncToCloud('user-123', mockUserSession)
      ).resolves.not.toThrow();
    });

    test('should handle encryption failures gracefully', async () => {
      mockCrypto.subtle.encrypt.mockRejectedValue(new Error('Encryption failed'));

      // Should fallback to unencrypted storage with warning
      await sessionService.saveSettings('user-123', mockSessionSettings);

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });
});
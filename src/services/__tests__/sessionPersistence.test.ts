/**
 * @jest-environment jsdom
 */

import { SessionPersistenceService } from '../sessionPersistence';
import { encryptData, decryptData } from '@/lib/encryption';

// Mock encryption functions
jest.mock('@/lib/encryption', () => ({
  encryptData: jest.fn((data) => `encrypted_${JSON.stringify(data)}`),
  decryptData: jest.fn((data) => {
    if (data.startsWith('encrypted_')) {
      return JSON.parse(data.substring('encrypted_'.length));
    }
    return JSON.parse(data);
  }),
}));

describe('SessionPersistenceService', () => {
  let service: SessionPersistenceService;

  beforeEach(() => {
    // Clear all mocks and storage before each test
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    // Mock localStorage and sessionStorage methods
    jest.spyOn(window.localStorage, 'getItem').mockReturnValue(null);
    jest.spyOn(window.localStorage, 'setItem').mockReturnValue(undefined);
    jest.spyOn(window.localStorage, 'removeItem').mockReturnValue(undefined);
    jest.spyOn(window.sessionStorage, 'getItem').mockReturnValue(null);
    jest.spyOn(window.sessionStorage, 'setItem').mockReturnValue(undefined);
    jest.spyOn(window.sessionStorage, 'removeItem').mockReturnValue(undefined);

    service = new SessionPersistenceService();
  });

  // ... (rest of the tests)

  describe('Session Management', () => {
    it('should create a new session with encrypted data', () => {
      const sessionId = 'test-session-id';
      const sessionData = { userId: 'user123', expires: Date.now() + 3600000 };
      service.createSession(sessionId, sessionData);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        `session_${sessionId}`,
        `encrypted_${JSON.stringify(sessionData)}`
      );
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        `session_${sessionId}`,
        `encrypted_${JSON.stringify(sessionData)}`
      );
    });

    it('should retrieve and decrypt session data', () => {
      const sessionId = 'test-session-id';
      const storedData = { userId: 'user123', expires: Date.now() + 3600000 };
      const encryptedData = `encrypted_${JSON.stringify(storedData)}`;

      localStorage.getItem.mockReturnValue(encryptedData);

      const retrievedData = service.getSession(sessionId);

      expect(localStorage.getItem).toHaveBeenCalledWith(`session_${sessionId}`);
      expect(decryptData).toHaveBeenCalledWith(encryptedData);
      expect(retrievedData).toEqual(storedData);
    });

    it('should handle session retrieval when no session exists', () => {
      localStorage.getItem.mockReturnValue(null);
      const retrievedData = service.getSession('non-existent-session');
      expect(retrievedData).toBeNull();
    });

    it('should update existing session data', () => {
      const sessionId = 'test-session-id';
      const initialData = { userId: 'user123', expires: Date.now() + 3600000 };
      const updatedData = { ...initialData, lastActivity: Date.now() };

      localStorage.getItem.mockReturnValue(`encrypted_${JSON.stringify(initialData)}`);
      service.updateSession(sessionId, updatedData);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        `session_${sessionId}`,
        `encrypted_${JSON.stringify(updatedData)}`
      );
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        `session_${sessionId}`,
        `encrypted_${JSON.stringify(updatedData)}`
      );
    });

    it('should destroy session and clear storage', () => {
      const sessionId = 'test-session-id';
      service.destroySession(sessionId);

      expect(localStorage.removeItem).toHaveBeenCalledWith(`session_${sessionId}`);
      expect(sessionStorage.removeItem).toHaveBeenCalledWith(`session_${sessionId}`);
    });
  });

  describe('Settings Persistence', () => {
    const settingsKey = 'userSettings';
    const defaultSettings = { theme: 'dark', notifications: true };

    it('should save user settings with encryption', () => {
      const userSettings = { theme: 'light', notifications: false };
      service.saveSettings(userSettings);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        settingsKey,
        `encrypted_${JSON.stringify(userSettings)}`
      );
    });

    it('should load and decrypt user settings', () => {
      const storedSettings = { theme: 'light', notifications: false };
      const encryptedSettings = `encrypted_${JSON.stringify(storedSettings)}`;

      localStorage.getItem.mockReturnValue(encryptedSettings);

      const loadedSettings = service.loadSettings(defaultSettings);

      expect(localStorage.getItem).toHaveBeenCalledWith(settingsKey);
      expect(decryptData).toHaveBeenCalledWith(encryptedSettings);
      expect(loadedSettings).toEqual(storedSettings);
    });

    it('should return default settings when none exist', () => {
      localStorage.getItem.mockReturnValue(null);
      const loadedSettings = service.loadSettings(defaultSettings);
      expect(loadedSettings).toEqual(defaultSettings);
    });
  });

  describe('Photo History Management', () => {
    const historyKey = 'photoHistory';
    const mockPhoto = { id: 'photo1', url: 'url1' };

    it('should save photo history with encryption', () => {
      const history = [mockPhoto];
      service.savePhotoHistory(history);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        historyKey,
        `encrypted_${JSON.stringify(history)}`
      );
    });

    it('should load and decrypt photo history', () => {
      const history = [mockPhoto];
      const encryptedHistory = `encrypted_${JSON.stringify(history)}`;

      localStorage.getItem.mockReturnValue(encryptedHistory);

      const loadedHistory = service.loadPhotoHistory();

      expect(localStorage.getItem).toHaveBeenCalledWith(historyKey);
      expect(decryptData).toHaveBeenCalledWith(encryptedHistory);
      expect(loadedHistory).toEqual(history);
    });

    it('should add new photo to history', () => {
      const initialHistory = [{ id: 'photo0', url: 'url0' }];
      localStorage.getItem.mockReturnValue(`encrypted_${JSON.stringify(initialHistory)}`);

      service.addPhotoToHistory(mockPhoto);

      const expectedHistory = [mockPhoto, ...initialHistory];
      expect(localStorage.setItem).toHaveBeenCalledWith(
        historyKey,
        `encrypted_${JSON.stringify(expectedHistory)}`
      );
    });

    it('should maintain history size limit', () => {
      const longHistory = Array.from({ length: 20 }, (_, i) => ({ id: `photo${i}`, url: `url${i}` }));
      localStorage.getItem.mockReturnValue(`encrypted_${JSON.stringify(longHistory)}`);

      const newPhoto = { id: 'newPhoto', url: 'newUrl' };
      service.addPhotoToHistory(newPhoto);

      const expectedHistory = [newPhoto, ...longHistory.slice(0, 19)]; // Max 20 items
      expect(localStorage.setItem).toHaveBeenCalledWith(
        historyKey,
        `encrypted_${JSON.stringify(expectedHistory)}`
      );
    });
  });

  describe('Favorites Management', () => {
    const favoritesKey = 'favorites';
    const mockFavorite = { id: 'fav1', url: 'favurl1' };

    it('should save favorites with encryption', () => {
      const favorites = [mockFavorite];
      service.saveFavorites(favorites);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        favoritesKey,
        `encrypted_${JSON.stringify(favorites)}`
      );
    });

    it('should load and decrypt favorites', () => {
      const favorites = [mockFavorite];
      const encryptedFavorites = `encrypted_${JSON.stringify(favorites)}`;

      localStorage.getItem.mockReturnValue(encryptedFavorites);

      const loadedFavorites = service.loadFavorites();

      expect(localStorage.getItem).toHaveBeenCalledWith(favoritesKey);
      expect(decryptData).toHaveBeenCalledWith(encryptedFavorites);
      expect(loadedFavorites).toEqual(favorites);
    });

    it('should add item to favorites', () => {
      const initialFavorites = [{ id: 'fav0', url: 'favurl0' }];
      localStorage.getItem.mockReturnValue(`encrypted_${JSON.stringify(initialFavorites)}`);

      service.addFavorite(mockFavorite);

      const expectedFavorites = [...initialFavorites, mockFavorite];
      expect(localStorage.setItem).toHaveBeenCalledWith(
        favoritesKey,
        `encrypted_${JSON.stringify(expectedFavorites)}`
      );
    });

    it('should remove item from favorites', () => {
      const initialFavorites = [mockFavorite, { id: 'fav2', url: 'favurl2' }];
      localStorage.getItem.mockReturnValue(`encrypted_${JSON.stringify(initialFavorites)}`);

      service.removeFavorite(mockFavorite.id);

      const expectedFavorites = [{ id: 'fav2', url: 'favurl2' }];
      expect(localStorage.setItem).toHaveBeenCalledWith(
        favoritesKey,
        `encrypted_${JSON.stringify(expectedFavorites)}`
      );
    });
  });

  describe('Security & Privacy', () => {
    it('should use strong encryption for sensitive data', () => {
      const sensitiveData = { token: 'secret', privateInfo: 'hidden' };
      service.createSession('secure-session', sensitiveData);
      service.saveSettings(sensitiveData);
      service.savePhotoHistory([sensitiveData as any]);
      service.saveFavorites([sensitiveData as any]);

      expect(encryptData).toHaveBeenCalledTimes(4);
      expect(encryptData).toHaveBeenCalledWith(sensitiveData);
    });

    it('should validate session integrity', () => {
      const sessionId = 'valid-session';
      const sessionData = { userId: 'user123', expires: Date.now() + 3600000 };
      localStorage.getItem.mockReturnValue(`encrypted_${JSON.stringify(sessionData)}`);

      const isValid = service.validateSession(sessionId);
      expect(isValid).toBe(true);
    });

    it('should handle expired sessions', () => {
      const sessionId = 'expired-session';
      const sessionData = { userId: 'user123', expires: Date.now() - 1000 }; // Expired
      localStorage.getItem.mockReturnValue(`encrypted_${JSON.stringify(sessionData)}`);

      const isValid = service.validateSession(sessionId);
      expect(isValid).toBe(false);
    });

    it('should respect privacy settings', () => {
      const privacySettings = { analytics: false, tracking: false };
      service.saveSettings(privacySettings);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'userSettings',
        `encrypted_${JSON.stringify(privacySettings)}`
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage quota exceeded', () => {
      jest.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Quota exceeded');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      service.createSession('error-session', { data: 'large' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error saving to local storage:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });

    it('should handle encryption failures gracefully', () => {
      (encryptData as jest.Mock).mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      service.createSession('encryption-error-session', { data: 'sensitive' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error encrypting data:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });
  });
});

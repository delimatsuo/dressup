export interface UserSession {
  id: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  deviceInfo: {
    userAgent: string;
    platform: string;
    screen: { width: number; height: number };
  };
  settings: SessionSettings;
  preferences: UserPreferences;
  isActive: boolean;
}

export interface SessionSettings {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
  autoSave: boolean;
  privacy: 'public' | 'private';
}

export interface UserPreferences {
  preferredStyles: string[];
  colorPalette: string[];
  bodyType: string;
  favorites: string[];
}

export interface EncryptedSessionData {
  data: Uint8Array;
  iv: Uint8Array;
  timestamp: number;
}

export interface PhotoHistoryItem {
  id: string;
  url: string;
  uploadedAt: Date;
  processedImages: Array<{
    id: string;
    url: string;
    style: string;
  }>;
  metadata: {
    size: number;
    format: string;
  };
}

export interface FavoriteItem {
  id: string;
  type: 'outfit' | 'style' | 'color';
  imageUrl: string;
  addedAt: Date;
  metadata: {
    style?: string;
    colors?: string[];
    [key: string]: any;
  };
}

export interface SyncOptions {
  interval?: number;
  onActivity?: boolean;
  onClose?: boolean;
}

export interface ConflictResolution {
  session: UserSession;
  source: 'local' | 'cloud';
  resolvedAt: Date;
}

export class SessionPersistenceService {
  private encryptionKey: CryptoKey | null = null;
  private autoSyncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly HISTORY_LIMIT = 100;
  private readonly SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  private readonly crypto: Crypto;

  constructor(cryptoImpl: Crypto = global.crypto) {
    this.crypto = cryptoImpl;
    this.initializeEncryption();
  }

  private async initializeEncryption(): Promise<void> {
    try {
      this.encryptionKey = await this.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Failed to initialize encryption key:', error);
      this.encryptionKey = null;
    }
  }

  private async encrypt(data: string): Promise<EncryptedSessionData> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    const encoder = new TextEncoder();
    const dataArray = encoder.encode(data);
    const iv = this.crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await this.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      dataArray
    );

    return {
      data: new Uint8Array(encryptedData),
      iv,
      timestamp: Date.now()
    };
  }

  private async decrypt(encryptedData: EncryptedSessionData): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    const decryptedData = await this.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: encryptedData.iv },
      this.encryptionKey,
      encryptedData.data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  }

  private getStorageKey(type: string, userId: string): string {
    return `dressup_${type}_${userId}`;
  }

  private isSessionExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.SESSION_EXPIRY;
  }

  private async safeStorageOperation<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, using fallback');
        return await fallback();
      }
      throw error;
    }
  }

  async createSession(sessionData: UserSession): Promise<UserSession> {
    try {
      const encrypted = await this.encrypt(JSON.stringify(sessionData));
      const storageData = {
        sessionId: sessionData.id,
        encryptedData: Array.from(encrypted.data),
        iv: Array.from(encrypted.iv),
        timestamp: encrypted.timestamp
      };

      await this.safeStorageOperation(
        async () => {
          localStorage.setItem(
            this.getStorageKey('session', sessionData.userId),
            JSON.stringify(storageData)
          );
        },
        async () => {
          sessionStorage.setItem(
            this.getStorageKey('session', sessionData.userId),
            JSON.stringify(storageData)
          );
        }
      );

      return sessionData;
    } catch (error) {
      console.error('Failed to create encrypted session:', error);
      // Fallback to unencrypted storage
      localStorage.setItem(
        this.getStorageKey('session', sessionData.userId),
        JSON.stringify(sessionData)
      );
      return sessionData;
    }
  }

  async getSession(userId: string): Promise<UserSession | null> {
    const storageKey = this.getStorageKey('session', userId);
    
    let rawData = localStorage.getItem(storageKey);
    if (!rawData) {
      rawData = sessionStorage.getItem(storageKey);
    }
    
    if (!rawData) {
      return null;
    }

    try {
      const parsedData = JSON.parse(rawData);
      
      // Check if it's encrypted data
      if (parsedData.encryptedData && parsedData.iv) {
        if (this.isSessionExpired(parsedData.timestamp)) {
          await this.destroySession(userId);
          return null;
        }

        const encryptedData: EncryptedSessionData = {
          data: new Uint8Array(parsedData.encryptedData),
          iv: new Uint8Array(parsedData.iv),
          timestamp: parsedData.timestamp
        };

        const decryptedJson = await this.decrypt(encryptedData);
        const session = JSON.parse(decryptedJson);
        
        // Convert date strings back to Date objects
        session.createdAt = new Date(session.createdAt);
        session.lastActivity = new Date(session.lastActivity);
        
        return session;
      } else {
        // Legacy unencrypted data
        const session = parsedData as UserSession;
        session.createdAt = new Date(session.createdAt);
        session.lastActivity = new Date(session.lastActivity);
        return session;
      }
    } catch (error) {
      console.error('Failed to retrieve session:', error);
      // Remove corrupted session
      await this.destroySession(userId);
      return null;
    }
  }

  async updateSession(userId: string, updates: Partial<UserSession>): Promise<void> {
    const existingSession = await this.getSession(userId);
    if (!existingSession) {
      throw new Error('Session not found');
    }

    const updatedSession = {
      ...existingSession,
      ...updates,
      lastActivity: new Date()
    };

    await this.createSession(updatedSession);

    // Trigger auto-sync if enabled
    if (this.autoSyncIntervals.has(userId)) {
      await this.syncToCloud(userId, updatedSession);
    }
  }

  async destroySession(userId: string): Promise<void> {
    const sessionKey = this.getStorageKey('session', userId);
    const tempKey = this.getStorageKey('temp', userId);
    
    localStorage.removeItem(sessionKey);
    sessionStorage.removeItem(tempKey);
    
    // Clear auto-sync
    if (this.autoSyncIntervals.has(userId)) {
      clearInterval(this.autoSyncIntervals.get(userId));
      this.autoSyncIntervals.delete(userId);
    }
  }

  async saveSettings(userId: string, settings: SessionSettings): Promise<void> {
    try {
      const encrypted = await this.encrypt(JSON.stringify(settings));
      const storageData = {
        encryptedData: Array.from(encrypted.data),
        iv: Array.from(encrypted.iv),
        timestamp: encrypted.timestamp
      };

      await this.safeStorageOperation(
        async () => {
          localStorage.setItem(
            this.getStorageKey('settings', userId),
            JSON.stringify(storageData)
          );
        },
        async () => {
          sessionStorage.setItem(
            this.getStorageKey('settings', userId),
            JSON.stringify(storageData)
          );
        }
      );
    } catch (error) {
      console.error('Failed to save encrypted settings:', error);
      // Fallback to unencrypted
      localStorage.setItem(
        this.getStorageKey('settings', userId),
        JSON.stringify(settings)
      );
    }
  }

  async getSettings(userId: string): Promise<SessionSettings> {
    const defaultSettings: SessionSettings = {
      theme: 'light',
      language: 'en',
      notifications: true,
      autoSave: true,
      privacy: 'private'
    };

    const storageKey = this.getStorageKey('settings', userId);
    const rawData = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);
    
    if (!rawData) {
      return defaultSettings;
    }

    try {
      const parsedData = JSON.parse(rawData);
      
      if (parsedData.encryptedData && parsedData.iv) {
        const encryptedData: EncryptedSessionData = {
          data: new Uint8Array(parsedData.encryptedData),
          iv: new Uint8Array(parsedData.iv),
          timestamp: parsedData.timestamp
        };

        const decryptedJson = await this.decrypt(encryptedData);
        return { ...defaultSettings, ...JSON.parse(decryptedJson) };
      } else {
        return { ...defaultSettings, ...parsedData };
      }
    } catch (error) {
      console.error('Failed to retrieve settings:', error);
      return defaultSettings;
    }
  }

  async savePhotoHistory(userId: string, history: PhotoHistoryItem[]): Promise<void> {
    try {
      const encrypted = await this.encrypt(JSON.stringify(history));
      const storageData = {
        encryptedData: Array.from(encrypted.data),
        iv: Array.from(encrypted.iv),
        timestamp: encrypted.timestamp
      };

      await this.safeStorageOperation(
        async () => {
          localStorage.setItem(
            this.getStorageKey('history', userId),
            JSON.stringify(storageData)
          );
        },
        async () => {
          sessionStorage.setItem(
            this.getStorageKey('history', userId),
            JSON.stringify(storageData)
          );
        }
      );
    } catch (error) {
      console.error('Failed to save photo history:', error);
      localStorage.setItem(
        this.getStorageKey('history', userId),
        JSON.stringify(history)
      );
    }
  }

  async getPhotoHistory(userId: string): Promise<PhotoHistoryItem[]> {
    const storageKey = this.getStorageKey('history', userId);
    const rawData = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);
    
    if (!rawData) {
      return [];
    }

    try {
      const parsedData = JSON.parse(rawData);
      
      if (parsedData.encryptedData && parsedData.iv) {
        const encryptedData: EncryptedSessionData = {
          data: new Uint8Array(parsedData.encryptedData),
          iv: new Uint8Array(parsedData.iv),
          timestamp: parsedData.timestamp
        };

        const decryptedJson = await this.decrypt(encryptedData);
        const history = JSON.parse(decryptedJson);
        
        // Convert date strings back to Date objects
        return history.map((item: any) => ({
          ...item,
          uploadedAt: new Date(item.uploadedAt)
        }));
      } else {
        return parsedData.map((item: any) => ({
          ...item,
          uploadedAt: new Date(item.uploadedAt)
        }));
      }
    } catch (error) {
      console.error('Failed to retrieve photo history:', error);
      return [];
    }
  }

  async addToPhotoHistory(userId: string, photo: PhotoHistoryItem): Promise<void> {
    const currentHistory = await this.getPhotoHistory(userId);
    const updatedHistory = [photo, ...currentHistory];
    
    // Maintain history limit
    if (updatedHistory.length > this.HISTORY_LIMIT) {
      updatedHistory.splice(this.HISTORY_LIMIT);
    }
    
    await this.savePhotoHistory(userId, updatedHistory);
  }

  async saveFavorites(userId: string, favorites: FavoriteItem[]): Promise<void> {
    try {
      const encrypted = await this.encrypt(JSON.stringify(favorites));
      const storageData = {
        encryptedData: Array.from(encrypted.data),
        iv: Array.from(encrypted.iv),
        timestamp: encrypted.timestamp
      };

      await this.safeStorageOperation(
        async () => {
          localStorage.setItem(
            this.getStorageKey('favorites', userId),
            JSON.stringify(storageData)
          );
        },
        async () => {
          sessionStorage.setItem(
            this.getStorageKey('favorites', userId),
            JSON.stringify(storageData)
          );
        }
      );
    } catch (error) {
      console.error('Failed to save favorites:', error);
      localStorage.setItem(
        this.getStorageKey('favorites', userId),
        JSON.stringify(favorites)
      );
    }
  }

  async getFavorites(userId: string): Promise<FavoriteItem[]> {
    const storageKey = this.getStorageKey('favorites', userId);
    const rawData = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);
    
    if (!rawData) {
      return [];
    }

    try {
      const parsedData = JSON.parse(rawData);
      
      if (parsedData.encryptedData && parsedData.iv) {
        const encryptedData: EncryptedSessionData = {
          data: new Uint8Array(parsedData.encryptedData),
          iv: new Uint8Array(parsedData.iv),
          timestamp: parsedData.timestamp
        };

        const decryptedJson = await this.decrypt(encryptedData);
        const favorites = JSON.parse(decryptedJson);
        
        // Convert date strings back to Date objects
        return favorites.map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt)
        }));
      } else {
        return parsedData.map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt)
        }));
      }
    } catch (error) {
      console.error('Failed to retrieve favorites:', error);
      return [];
    }
  }

  async addToFavorites(userId: string, favorite: FavoriteItem): Promise<void> {
    const currentFavorites = await this.getFavorites(userId);
    const updatedFavorites = [favorite, ...currentFavorites];
    await this.saveFavorites(userId, updatedFavorites);
  }

  async removeFromFavorites(userId: string, favoriteId: string): Promise<void> {
    const currentFavorites = await this.getFavorites(userId);
    const updatedFavorites = currentFavorites.filter(fav => fav.id !== favoriteId);
    await this.saveFavorites(userId, updatedFavorites);
  }

  async syncToCloud(userId: string, sessionData: UserSession): Promise<void> {
    // Check privacy settings
    if (sessionData.settings.privacy === 'private') {
      return; // Don't sync private sessions
    }

    try {
      const settings = await this.getSettings(userId);
      const photoHistory = await this.getPhotoHistory(userId);
      const favorites = await this.getFavorites(userId);

      const response = await fetch('/api/session/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          session: sessionData,
          settings,
          photoHistory,
          favorites,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to sync session to cloud:', error);
      // Don't throw - sync failures shouldn't break the app
    }
  }

  async resolveConflict(userId: string): Promise<ConflictResolution> {
    try {
      // TODO: Implement Vercel KV based conflict resolution when Vercel KV session management is implemented.
      // For now, we will prioritize local session data.
      const localSession = await this.getSession(userId);

      if (!localSession) {
        throw new Error('No session data found locally. Cloud data (Firebase) is no longer supported.');
      }

      return {
        session: localSession,
        source: 'local',
        resolvedAt: new Date()
      };
    } catch (error) {
      console.error('Failed to resolve session conflict:', error);
      throw error;
    }
  }

  async enableAutoSync(userId: string, options: SyncOptions = {}): Promise<void> {
    const { interval = 300000, onActivity = true } = options; // Default 5 minutes

    // Clear existing interval
    if (this.autoSyncIntervals.has(userId)) {
      clearInterval(this.autoSyncIntervals.get(userId));
    }

    // Set up periodic sync
    const intervalId = setInterval(async () => {
      const session = await this.getSession(userId);
      if (session) {
        await this.syncToCloud(userId, session);
      }
    }, interval);

    this.autoSyncIntervals.set(userId, intervalId);

    // Set up sync on window close
    if (options.onClose) {
      window.addEventListener('beforeunload', async () => {
        const session = await this.getSession(userId);
        if (session) {
          await this.syncToCloud(userId, session);
        }
      });
    }
  }

  async disableAutoSync(userId: string): Promise<void> {
    if (this.autoSyncIntervals.has(userId)) {
      clearInterval(this.autoSyncIntervals.get(userId));
      this.autoSyncIntervals.delete(userId);
    }
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    this.autoSyncIntervals.forEach(intervalId => clearInterval(intervalId));
    this.autoSyncIntervals.clear();
  }
}

// Export singleton instance
export const sessionPersistence = new SessionPersistenceService();
import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Mock Firebase modules
jest.mock('firebase/app');
jest.mock('firebase/storage');
jest.mock('firebase/functions');

describe('Firebase Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-auth-domain';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project-id';
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-storage-bucket';
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 'test-sender-id';
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'test-app-id';
  });

  describe('initializeFirebase', () => {
    it('should initialize Firebase with correct config', () => {
      const { initializeFirebase } = require('../firebase');
      
      initializeFirebase();

      expect(initializeApp).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        authDomain: 'test-auth-domain',
        projectId: 'test-project-id',
        storageBucket: 'test-storage-bucket',
        messagingSenderId: 'test-sender-id',
        appId: 'test-app-id',
      });
    });

    it('should throw error if environment variables are missing', () => {
      delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      
      const { initializeFirebase } = require('../firebase');
      
      expect(() => initializeFirebase()).toThrow(/Firebase configuration/i);
    });
  });

  describe('uploadImage', () => {
    it('should validate file type', async () => {
      const { uploadImage } = require('../firebase');
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      await expect(uploadImage(file, 'session-id')).rejects.toThrow(/image file/i);
    });

    it('should validate file size', async () => {
      const { uploadImage } = require('../firebase');
      
      // Create a large file (>10MB)
      const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

      await expect(uploadImage(largeFile, 'session-id')).rejects.toThrow(/file size/i);
    });
  });

  describe('getGarments', () => {
    it('should return mock garments', async () => {
      const { getGarments } = require('../firebase');
      
      const garments = await getGarments();

      expect(garments).toHaveLength(4);
      expect(garments[0].name).toBe('Casual T-Shirt');
    });
  });

  describe('processImage', () => {
    it('should return processed image result', async () => {
      const { processImage } = require('../firebase');
      
      const result = await processImage('user-image-url', 'garment-id', 'session-id');

      expect(result.processedImageUrl).toBe('user-image-url');
      expect(result.processingTime).toBe(3.5);
      expect(result.confidence).toBe(0.95);
    });
  });

  describe('submitFeedback', () => {
    it('should validate rating range', async () => {
      const { submitFeedback } = require('../firebase');
      
      const feedback = {
        rating: 6, // Invalid rating
        comment: 'Test',
        sessionId: 'session',
        resultId: 'result',
      };

      await expect(submitFeedback(feedback)).rejects.toThrow(/rating.*1.*5/i);
    });

    it('should submit valid feedback', async () => {
      const { submitFeedback } = require('../firebase');
      
      const feedback = {
        rating: 4,
        comment: 'Great experience!',
        sessionId: 'session',
        resultId: 'result',
      };

      const result = await submitFeedback(feedback);
      expect(result.success).toBe(true);
    });
  });
});
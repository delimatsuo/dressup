import { generateOutfitPose } from '../generationService';

// Mock Firebase functions
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({ name: 'mock-functions' })),
  httpsCallable: jest.fn(),
}));

jest.mock('@/lib/firebase', () => ({
  initializeFirebase: jest.fn(() => ({ name: 'test-app' })),
}));

describe('generationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateOutfitPose', () => {
    it('should call Firebase function with correct parameters and return generated image URL', async () => {
      const mockResult = {
        data: {
          processedImageUrl: 'https://example.com/generated-outfit.jpg',
          processingTime: 3.2,
          confidence: 0.95,
          description: 'Standing front pose generated successfully'
        }
      };
      
      const mockFunction = jest.fn().mockResolvedValue(mockResult);
      const { httpsCallable } = require('firebase/functions');
      httpsCallable.mockReturnValue(mockFunction);

      const result = await generateOutfitPose('session-123', 'https://example.com/garment.jpg');

      expect(httpsCallable).toHaveBeenCalledWith(
        expect.anything(), // functions instance
        'processImageWithGemini',
        { timeout: 60000 }
      );
      
      expect(mockFunction).toHaveBeenCalledWith({
        sessionId: 'session-123',
        garmentImageUrl: 'https://example.com/garment.jpg'
      });

      expect(result).toEqual({
        imageUrl: 'https://example.com/generated-outfit.jpg',
        processingTime: 3.2,
        confidence: 0.95,
        description: 'Standing front pose generated successfully'
      });
    });

    it('should throw error when sessionId is missing', async () => {
      await expect(generateOutfitPose('', 'https://example.com/garment.jpg'))
        .rejects.toThrow('sessionId is required');
    });

    it('should throw error when garmentImageUrl is missing', async () => {
      await expect(generateOutfitPose('session-123', ''))
        .rejects.toThrow('garmentImageUrl is required');
    });

    it('should handle Firebase function errors gracefully', async () => {
      const mockError = new Error('Network error');
      const mockFunction = jest.fn().mockRejectedValue(mockError);
      const { httpsCallable } = require('firebase/functions');
      httpsCallable.mockReturnValue(mockFunction);

      await expect(generateOutfitPose('session-123', 'https://example.com/garment.jpg'))
        .rejects.toThrow('Failed to generate outfit pose: Network error');
    });

    it('should handle Firebase function timeout errors', async () => {
      const timeoutError = { code: 'functions/deadline-exceeded', message: 'Function timeout' };
      const mockFunction = jest.fn().mockRejectedValue(timeoutError);
      const { httpsCallable } = require('firebase/functions');
      httpsCallable.mockReturnValue(mockFunction);

      await expect(generateOutfitPose('session-123', 'https://example.com/garment.jpg'))
        .rejects.toThrow('Generation timeout - please try again');
    });

    it('should handle unauthenticated errors with specific message', async () => {
      const authError = { code: 'functions/unauthenticated', message: 'Unauthenticated' };
      const mockFunction = jest.fn().mockRejectedValue(authError);
      const { httpsCallable } = require('firebase/functions');
      httpsCallable.mockReturnValue(mockFunction);

      await expect(generateOutfitPose('session-123', 'https://example.com/garment.jpg'))
        .rejects.toThrow('Authentication required - please refresh the page');
    });

    it('should validate that result contains required fields', async () => {
      const incompleteResult = {
        data: {
          processingTime: 3.2,
          // Missing processedImageUrl
        }
      };
      
      const mockFunction = jest.fn().mockResolvedValue(incompleteResult);
      const { httpsCallable } = require('firebase/functions');
      httpsCallable.mockReturnValue(mockFunction);

      await expect(generateOutfitPose('session-123', 'https://example.com/garment.jpg'))
        .rejects.toThrow('Invalid response from generation service');
    });
  });
});
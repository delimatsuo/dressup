import { geminiGenerateTryOn } from '@/lib/gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock the Google Generative AI library
jest.mock('@google/generative-ai');

describe('Gemini Client', () => {
  const mockGenerateContent = jest.fn();
  const mockGetGenerativeModel = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up the mock chain
    (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    } as any));
    
    mockGetGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent,
    });
    
    // Clear env vars
    delete process.env.GOOGLE_AI_API_KEY;
  });

  afterEach(() => {
    delete process.env.GOOGLE_AI_API_KEY;
  });

  describe('Happy Path', () => {
    it('should generate try-on results with valid API response', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-api-key';
      
      // Mock successful API response
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            results: [
              { imageUrl: 'https://example.com/result1.jpg', confidence: 0.95 },
              { imageUrl: 'https://example.com/result2.jpg', confidence: 0.88 },
            ],
            description: 'Professional outfit with navy blazer',
          }),
        },
      });

      const result = await geminiGenerateTryOn({
        prompt: 'Generate try-on for user',
        userPhotos: { front: 'user-front.jpg', side: 'user-side.jpg' },
        garmentPhotos: { front: 'garment-front.jpg', side: 'garment-side.jpg' },
        options: { generateMultiplePoses: true },
      });

      expect(result).toEqual({
        results: [
          { imageUrl: 'https://example.com/result1.jpg', confidence: 0.95 },
          { imageUrl: 'https://example.com/result2.jpg', confidence: 0.88 },
        ],
        processingTime: expect.any(Number),
        description: 'Professional outfit with navy blazer',
      });

      expect(GoogleGenerativeAI).toHaveBeenCalledWith('test-api-key');
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-1.5-flash' });
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should include all photos in the prompt when provided', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-api-key';
      
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            results: [{ imageUrl: 'https://example.com/result.jpg', confidence: 0.9 }],
            description: 'Casual outfit',
          }),
        },
      });

      await geminiGenerateTryOn({
        prompt: 'Base prompt',
        userPhotos: { front: 'u-f.jpg', side: 'u-s.jpg', back: 'u-b.jpg' },
        garmentPhotos: { front: 'g-f.jpg' },
        options: {},
      });

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs).toContain('Base prompt');
      expect(callArgs).toContain('User photos:');
      expect(callArgs).toContain('front: u-f.jpg');
      expect(callArgs).toContain('side: u-s.jpg');
      expect(callArgs).toContain('back: u-b.jpg');
      expect(callArgs).toContain('Garment photos:');
      expect(callArgs).toContain('front: g-f.jpg');
    });

    it('should respect timeout option', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-api-key';
      
      // Mock a delayed response
      mockGenerateContent.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          response: {
            text: () => JSON.stringify({
              results: [{ imageUrl: 'https://example.com/result.jpg', confidence: 0.9 }],
            }),
          },
        }), 100))
      );

      const startTime = Date.now();
      await geminiGenerateTryOn({
        prompt: 'Test',
        userPhotos: { front: 'data:image/jpeg;base64,user-data' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-data' },
        options: { timeout: 5000 },
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when API key is not set', async () => {
      await expect(geminiGenerateTryOn({
        prompt: 'Test',
        userPhotos: { front: 'data:image/jpeg;base64,user-data' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-data' },
      })).rejects.toThrow('GOOGLE_AI_API_KEY environment variable is not set');
    });

    it('should handle API errors with retry logic', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-api-key';
      
      // First two calls fail, third succeeds
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify({
              results: [{ imageUrl: 'https://example.com/result.jpg', confidence: 0.9 }],
            }),
          },
        });

      const result = await geminiGenerateTryOn({
        prompt: 'Test',
        userPhotos: { front: 'data:image/jpeg;base64,user-data' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-data' },
        options: { maxRetries: 2 },
      });

      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
      expect(result.results).toHaveLength(1);
    });

    it('should throw after max retries exceeded', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-api-key';
      
      mockGenerateContent.mockRejectedValue(new Error('Persistent error'));

      await expect(geminiGenerateTryOn({
        prompt: 'Test',
        userPhotos: { front: 'data:image/jpeg;base64,user-data' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-data' },
        options: { maxRetries: 2 },
      })).rejects.toThrow('Persistent error');

      expect(mockGenerateContent).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle malformed API response', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-api-key';
      
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Not valid JSON',
        },
      });

      await expect(geminiGenerateTryOn({
        prompt: 'Test',
        userPhotos: { front: 'data:image/jpeg;base64,user-data' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-data' },
      })).rejects.toThrow('Invalid response format from Gemini API');
    });

    it('should handle missing results in API response', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-api-key';
      
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            description: 'Some description',
            // Missing results field
          }),
        },
      });

      await expect(geminiGenerateTryOn({
        prompt: 'Test',
        userPhotos: { front: 'data:image/jpeg;base64,user-data' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-data' },
      })).rejects.toThrow('Invalid response format from Gemini API');
    });

    it('should timeout after specified duration', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-api-key';
      
      // Mock a very slow response
      mockGenerateContent.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          response: {
            text: () => JSON.stringify({
              results: [{ imageUrl: 'https://example.com/result.jpg', confidence: 0.9 }],
            }),
          },
        }), 10000))
      );

      await expect(geminiGenerateTryOn({
        prompt: 'Test',
        userPhotos: { front: 'data:image/jpeg;base64,user-data' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-data' },
        options: { timeout: 100 },
      })).rejects.toThrow('Request timeout');
    });
  });

  describe('Response Shaping', () => {
    it('should shape response to expected format', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-api-key';
      
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            results: [
              { imageUrl: 'https://example.com/img1.jpg', confidence: 0.95 },
              { imageUrl: 'https://example.com/img2.jpg', confidence: 0.87 },
              { imageUrl: 'https://example.com/img3.jpg', confidence: 0.92 },
            ],
            description: 'Multiple poses generated',
            metadata: { extra: 'data' }, // Extra fields should be preserved
          }),
        },
      });

      const dateNowSpy = jest.spyOn(Date, 'now')
        .mockImplementationOnce(() => 1000) // Start time
        .mockImplementationOnce(() => 2500); // End time

      const result = await geminiGenerateTryOn({
        prompt: 'Test',
        userPhotos: { front: 'data:image/jpeg;base64,user-data' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-data' },
      });

      expect(result).toEqual({
        results: [
          { imageUrl: 'https://example.com/img1.jpg', confidence: 0.95 },
          { imageUrl: 'https://example.com/img2.jpg', confidence: 0.87 },
          { imageUrl: 'https://example.com/img3.jpg', confidence: 0.92 },
        ],
        processingTime: 1500, // 2500 - 1000
        description: 'Multiple poses generated',
      });
      
      expect(result.processingTime).toBeGreaterThan(0);

      dateNowSpy.mockRestore();
    });

    it('should provide images and confidences arrays for compatibility', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-api-key';
      
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            results: [
              { imageUrl: 'https://example.com/img1.jpg', confidence: 0.95 },
              { imageUrl: 'https://example.com/img2.jpg', confidence: 0.87 },
            ],
            description: 'Test',
          }),
        },
      });

      const result = await geminiGenerateTryOn({
        prompt: 'Test',
        userPhotos: { front: 'data:image/jpeg;base64,user-data' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-data' },
      });

      // For backward compatibility with the existing test
      expect(result.images).toEqual([
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
      ]);
      expect(result.confidences).toEqual([0.95, 0.87]);
    });
  });

  describe('Logging and Security', () => {
    it('should never log the API key', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log');
      const consoleErrorSpy = jest.spyOn(console, 'error');
      process.env.GOOGLE_AI_API_KEY = 'super-secret-key';
      
      mockGenerateContent.mockRejectedValue(new Error('Test error'));

      try {
        await geminiGenerateTryOn({
          prompt: 'Test',
          userPhotos: { front: 'u.jpg' },
          garmentPhotos: { front: 'g.jpg' },
        });
      } catch {
        // Expected to throw
      }

      // Check that the API key was never logged
      const allLogs = [
        ...consoleLogSpy.mock.calls.flat(),
        ...consoleErrorSpy.mock.calls.flat(),
      ].join(' ');
      
      expect(allLogs).not.toContain('super-secret-key');
      
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});
import { processWithGemini } from '@/lib/tryon-processing';
import { geminiGenerateTryOn } from '@/lib/gemini';
import { TryOnRequest } from '@/lib/tryon';

// Mock the Gemini module
jest.mock('@/lib/gemini');

describe('Try-On Gemini Integration', () => {
  const mockGeminiGenerateTryOn = geminiGenerateTryOn as jest.MockedFunction<typeof geminiGenerateTryOn>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GOOGLE_AI_API_KEY;
  });

  describe('Image Generation Integration', () => {
    it('should use Gemini image generation with enhanced options', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      
      const mockImageResult = {
        results: [
          {
            imageUrl: 'data:image/jpeg;base64,generated-formal-image',
            confidence: 0.95,
            pose: 'front'
          }
        ],
        processingTime: 5000,
        description: 'AI-generated virtual try-on for formal wear in front pose'
      };
      
      mockGeminiGenerateTryOn.mockResolvedValue(mockImageResult);

      const request: TryOnRequest = {
        userPhotos: { 
          front: 'data:image/jpeg;base64,user-photo' 
        },
        garmentPhotos: { 
          front: 'data:image/jpeg;base64,formal-suit' 
        },
        options: {
          generateMultiplePoses: false,
          enhanceBackground: true
        }
      };

      const result = await processWithGemini(request);

      expect(mockGeminiGenerateTryOn).toHaveBeenCalledWith({
        prompt: expect.any(String),
        userPhotos: request.userPhotos,
        garmentPhotos: request.garmentPhotos,
        options: expect.objectContaining({
          garmentType: expect.any(String),
          pose: expect.any(String),
          timeout: 60000,
          maxRetries: 3,
          generateMultiplePoses: false,
          enhanceBackground: true
        })
      });

      expect(result).toEqual({
        results: [
          {
            type: 'front',
            imageUrl: 'data:image/jpeg;base64,generated-formal-image',
            confidence: 0.95
          }
        ],
        processingTime: 5,
        description: 'AI-generated virtual try-on for formal wear in front pose'
      });
    });

    it('should detect garment type from prompt context', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      
      mockGeminiGenerateTryOn.mockResolvedValue({
        results: [{
          imageUrl: 'data:image/jpeg;base64,business-suit',
          confidence: 0.92,
          pose: 'front'
        }],
        processingTime: 4500,
        description: 'Professional business attire'
      });

      // Mock buildPrompt to return business-related prompt
      const originalBuildPrompt = require('@/lib/tryon').buildPrompt;
      jest.doMock('@/lib/tryon', () => ({
        buildPrompt: jest.fn(() => 'Generate professional business suit for office environment')
      }));

      const request: TryOnRequest = {
        userPhotos: { front: 'data:image/jpeg;base64,user-photo' },
        garmentPhotos: { front: 'data:image/jpeg;base64,business-suit' },
        options: {}
      };

      await processWithGemini(request);

      expect(mockGeminiGenerateTryOn).toHaveBeenCalledWith({
        prompt: expect.stringContaining('business'),
        userPhotos: request.userPhotos,
        garmentPhotos: request.garmentPhotos,
        options: expect.objectContaining({
          garmentType: 'business'
        })
      });

      // Restore the original buildPrompt
      jest.doMock('@/lib/tryon', () => ({ buildPrompt: originalBuildPrompt }));
    });

    it('should handle multiple pose generation', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      
      mockGeminiGenerateTryOn.mockResolvedValue({
        results: [
          {
            imageUrl: 'data:image/jpeg;base64,pose-1-front',
            confidence: 0.95,
            pose: 'front'
          },
          {
            imageUrl: 'data:image/jpeg;base64,pose-2-side',
            confidence: 0.91,
            pose: 'side'
          },
          {
            imageUrl: 'data:image/jpeg;base64,pose-3-walking',
            confidence: 0.88,
            pose: 'walking'
          }
        ],
        processingTime: 8000,
        description: 'Multiple pose virtual try-on results'
      });

      const request: TryOnRequest = {
        userPhotos: { 
          front: 'data:image/jpeg;base64,user-front',
          side: 'data:image/jpeg;base64,user-side' 
        },
        garmentPhotos: { 
          front: 'data:image/jpeg;base64,casual-outfit' 
        },
        options: {
          generateMultiplePoses: true,
          pose: 'front'
        }
      };

      const result = await processWithGemini(request);

      expect(result.results).toHaveLength(3);
      expect(result.results).toEqual([
        {
          type: 'front',
          imageUrl: 'data:image/jpeg;base64,pose-1-front',
          confidence: 0.95
        },
        {
          type: 'side',
          imageUrl: 'data:image/jpeg;base64,pose-2-side',
          confidence: 0.91
        },
        {
          type: 'walking',
          imageUrl: 'data:image/jpeg;base64,pose-3-walking',
          confidence: 0.88
        }
      ]);
    });

    it('should handle athletic wear with appropriate pose', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      
      mockGeminiGenerateTryOn.mockResolvedValue({
        results: [{
          imageUrl: 'data:image/jpeg;base64,athletic-wear',
          confidence: 0.93,
          pose: 'walking'
        }],
        processingTime: 6000,
        description: 'Athletic wear try-on for workout'
      });

      // Mock buildPrompt to return athletic-related prompt
      jest.doMock('@/lib/tryon', () => ({
        buildPrompt: jest.fn(() => 'Generate athletic workout gear for running and fitness')
      }));

      const request: TryOnRequest = {
        userPhotos: { front: 'data:image/jpeg;base64,user-photo' },
        garmentPhotos: { front: 'data:image/jpeg;base64,athletic-wear' },
        options: { pose: 'walking' }
      };

      await processWithGemini(request);

      expect(mockGeminiGenerateTryOn).toHaveBeenCalledWith({
        prompt: expect.stringContaining('athletic'),
        userPhotos: request.userPhotos,
        garmentPhotos: request.garmentPhotos,
        options: expect.objectContaining({
          garmentType: 'athletic',
          pose: 'walking'
        })
      });
    });

    it('should provide fallback when no images are generated', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      
      mockGeminiGenerateTryOn.mockResolvedValue({
        results: [], // No generated images
        processingTime: 3000,
        description: 'No images generated'
      });

      const request: TryOnRequest = {
        userPhotos: { front: 'data:image/jpeg;base64,user-photo' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-photo' },
        options: {}
      };

      const result = await processWithGemini(request);

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        type: 'standing',
        imageUrl: 'data:image/jpeg;base64,user-photo',
        confidence: 0.1
      });
    });

    it('should handle backward compatibility with legacy format', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      
      // Mock legacy response format
      const legacyResult = {
        results: undefined, // Not using new format
        processingTime: 4000,
        description: 'Legacy format response'
      };
      
      // Add legacy properties via defineProperty (as done in actual implementation)
      Object.defineProperty(legacyResult, 'images', {
        get: () => ['data:image/jpeg;base64,legacy-image-1', 'data:image/jpeg;base64,legacy-image-2'],
        enumerable: false
      });
      Object.defineProperty(legacyResult, 'confidences', {
        get: () => [0.94, 0.89],
        enumerable: false
      });
      
      mockGeminiGenerateTryOn.mockResolvedValue(legacyResult);

      const request: TryOnRequest = {
        userPhotos: { front: 'data:image/jpeg;base64,user-photo' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-photo' },
        options: {}
      };

      const result = await processWithGemini(request);

      expect(result.results).toEqual([
        {
          type: 'standing',
          imageUrl: 'data:image/jpeg;base64,legacy-image-1',
          confidence: 0.94
        },
        {
          type: 'profile',
          imageUrl: 'data:image/jpeg;base64,legacy-image-2',
          confidence: 0.89
        }
      ]);
    });

    it('should handle API errors gracefully', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockGeminiGenerateTryOn.mockRejectedValue(new Error('API quota exceeded'));

      const request: TryOnRequest = {
        userPhotos: { front: 'data:image/jpeg;base64,user-photo' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-photo' },
        options: {}
      };

      const result = await processWithGemini(request);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Gemini Image Generation API error, falling back to placeholder:',
        expect.any(Error)
      );

      // Should fall back to placeholder
      expect(result.results).toHaveLength(2);
      expect(result.results[0].type).toBe('standing');
      expect(result.results[1].type).toBe('profile');
      expect(result.description).toContain('Virtual try-on preview');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Garment Type Detection', () => {
    it('should detect formal wear correctly', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      
      mockGeminiGenerateTryOn.mockResolvedValue({
        results: [{ imageUrl: 'test-url', confidence: 0.9 }],
        processingTime: 1000,
        description: 'test'
      });

      // Test various formal wear keywords
      const formalPrompts = [
        'Show formal suit for wedding',
        'Business blazer for interview',
        'Elegant formal wear'
      ];

      for (const prompt of formalPrompts) {
        jest.doMock('@/lib/tryon', () => ({
          buildPrompt: jest.fn(() => prompt)
        }));

        const request: TryOnRequest = {
          userPhotos: { front: 'data:image/jpeg;base64,user' },
          garmentPhotos: { front: 'data:image/jpeg;base64,garment' },
          options: {}
        };

        await processWithGemini(request);

        expect(mockGeminiGenerateTryOn).toHaveBeenCalledWith({
          prompt,
          userPhotos: request.userPhotos,
          garmentPhotos: request.garmentPhotos,
          options: expect.objectContaining({
            garmentType: 'formal'
          })
        });

        mockGeminiGenerateTryOn.mockClear();
      }
    });

    it('should detect athletic wear correctly', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      
      mockGeminiGenerateTryOn.mockResolvedValue({
        results: [{ imageUrl: 'test-url', confidence: 0.9 }],
        processingTime: 1000,
        description: 'test'
      });

      jest.doMock('@/lib/tryon', () => ({
        buildPrompt: jest.fn(() => 'Athletic workout gear for running')
      }));

      const request: TryOnRequest = {
        userPhotos: { front: 'data:image/jpeg;base64,user' },
        garmentPhotos: { front: 'data:image/jpeg;base64,athletic' },
        options: {}
      };

      await processWithGemini(request);

      expect(mockGeminiGenerateTryOn).toHaveBeenCalledWith({
        prompt: expect.stringContaining('Athletic'),
        userPhotos: request.userPhotos,
        garmentPhotos: request.garmentPhotos,
        options: expect.objectContaining({
          garmentType: 'athletic'
        })
      });
    });

    it('should default to casual wear when no specific type detected', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      
      mockGeminiGenerateTryOn.mockResolvedValue({
        results: [{ imageUrl: 'test-url', confidence: 0.9 }],
        processingTime: 1000,
        description: 'test'
      });

      jest.doMock('@/lib/tryon', () => ({
        buildPrompt: jest.fn(() => 'Show me how this looks')
      }));

      const request: TryOnRequest = {
        userPhotos: { front: 'data:image/jpeg;base64,user' },
        garmentPhotos: { front: 'data:image/jpeg;base64,casual' },
        options: {}
      };

      await processWithGemini(request);

      expect(mockGeminiGenerateTryOn).toHaveBeenCalledWith({
        prompt: 'Show me how this looks',
        userPhotos: request.userPhotos,
        garmentPhotos: request.garmentPhotos,
        options: expect.objectContaining({
          garmentType: 'casual'
        })
      });
    });
  });

  describe('Pose Determination', () => {
    it('should use explicitly specified pose', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      
      mockGeminiGenerateTryOn.mockResolvedValue({
        results: [{ imageUrl: 'test-url', confidence: 0.9 }],
        processingTime: 1000,
        description: 'test'
      });

      const request: TryOnRequest = {
        userPhotos: { front: 'data:image/jpeg;base64,user' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment' },
        options: { pose: 'side' }
      };

      await processWithGemini(request);

      expect(mockGeminiGenerateTryOn).toHaveBeenCalledWith({
        prompt: expect.any(String),
        userPhotos: request.userPhotos,
        garmentPhotos: request.garmentPhotos,
        options: expect.objectContaining({
          pose: 'side'
        })
      });
    });

    it('should default to front pose for multiple poses', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      
      mockGeminiGenerateTryOn.mockResolvedValue({
        results: [{ imageUrl: 'test-url', confidence: 0.9 }],
        processingTime: 1000,
        description: 'test'
      });

      const request: TryOnRequest = {
        userPhotos: { front: 'data:image/jpeg;base64,user' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment' },
        options: { generateMultiplePoses: true }
      };

      await processWithGemini(request);

      expect(mockGeminiGenerateTryOn).toHaveBeenCalledWith({
        prompt: expect.any(String),
        userPhotos: request.userPhotos,
        garmentPhotos: request.garmentPhotos,
        options: expect.objectContaining({
          pose: 'front',
          generateMultiplePoses: true
        })
      });
    });
  });

  describe('Fallback Behavior', () => {
    it('should provide fallback when API key is not available', async () => {
      // No API key set
      const request: TryOnRequest = {
        userPhotos: { front: 'data:image/jpeg;base64,user' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment' },
        options: {}
      };

      const result = await processWithGemini(request);

      expect(mockGeminiGenerateTryOn).not.toHaveBeenCalled();
      expect(result.results).toHaveLength(2);
      expect(result.results[0].type).toBe('standing');
      expect(result.results[1].type).toBe('profile');
      expect(result.description).toContain('Virtual try-on preview');
    });

    it('should filter out empty image URLs in fallback', async () => {
      const request: TryOnRequest = {
        userPhotos: { front: '' }, // Empty URL
        garmentPhotos: { front: 'data:image/jpeg;base64,garment' },
        options: {}
      };

      const result = await processWithGemini(request);

      // Should only include results with valid image URLs
      expect(result.results.every(item => item.imageUrl !== '')).toBe(true);
    });
  });
});
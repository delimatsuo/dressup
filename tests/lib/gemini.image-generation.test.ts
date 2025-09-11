import { 
  geminiGenerateTryOn, 
  prepareImageInput, 
  buildVirtualTryOnPrompt,
  PROMPT_TEMPLATES,
  POSE_INSTRUCTIONS,
  ImageInput
} from '@/lib/gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock the Google Generative AI library
jest.mock('@google/generative-ai');

describe('Gemini Image Generation', () => {
  const mockGenerateContent = jest.fn();
  const mockGetGenerativeModel = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    } as any));
    
    mockGetGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent,
    });
    
    process.env.GOOGLE_AI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_AI_API_KEY;
  });

  describe('Image Generation Model Configuration', () => {
    it('should use gemini-2.5-flash-image-preview model', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: 'test-image-data'
                }
              }]
            }
          }]
        }
      });

      await geminiGenerateTryOn({
        prompt: 'Test image generation',
        userPhotos: { front: 'data:image/jpeg;base64,user-photo' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-photo' },
      });

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash-image-preview',
        generationConfig: {
          maxOutputTokens: 1290
        }
      });
    });

    it('should handle multiple image inputs up to API limit', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: 'generated-image'
                }
              }]
            }
          }]
        }
      });

      await geminiGenerateTryOn({
        prompt: 'Generate with multiple inputs',
        userPhotos: { 
          front: 'data:image/jpeg;base64,user-front',
          side: 'data:image/jpeg;base64,user-side'
        },
        garmentPhotos: { 
          front: 'data:image/jpeg;base64,garment-front',
          back: 'data:image/jpeg;base64,garment-back'
        },
      });

      // Should have called with text + up to 3 image parts
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(Array.isArray(callArgs)).toBe(true);
      expect(callArgs[0]).toHaveProperty('text');
      expect(callArgs.length).toBeLessThanOrEqual(4); // 1 text + max 3 images
    });
  });

  describe('Garment Type Prompts', () => {
    it('should generate formal wear prompts correctly', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: 'formal-wear-result'
                }
              }]
            }
          }]
        }
      });

      const result = await geminiGenerateTryOn({
        prompt: 'Professional business suit',
        userPhotos: { front: 'data:image/jpeg;base64,user-photo' },
        garmentPhotos: { front: 'data:image/jpeg;base64,suit-photo' },
        options: { garmentType: 'formal', pose: 'front' }
      });

      expect(result.description).toContain('formal wear');
      
      // Check that the prompt includes formal wear elements
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const promptText = callArgs[0].text;
      expect(promptText).toContain('formal attire');
      expect(promptText).toContain('professional and confident');
      expect(promptText).toContain('business or formal occasions');
    });

    it('should generate athletic wear prompts correctly', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: 'athletic-wear-result'
                }
              }]
            }
          }]
        }
      });

      const result = await geminiGenerateTryOn({
        prompt: 'Workout gear for running',
        userPhotos: { front: 'data:image/jpeg;base64,user-photo' },
        garmentPhotos: { front: 'data:image/jpeg;base64,athletic-wear-photo' },
        options: { garmentType: 'athletic', pose: 'walking' }
      });

      expect(result.description).toContain('athletic wear');
      
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const promptText = callArgs[0].text;
      expect(promptText).toContain('athletic wear');
      expect(promptText).toContain('active and energetic');
      expect(promptText).toContain('performance fit');
      expect(promptText).toContain('captured mid-step in a natural walking pose');
    });

    it('should generate evening wear prompts correctly', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: 'evening-wear-result'
                }
              }]
            }
          }]
        }
      });

      await geminiGenerateTryOn({
        prompt: 'Elegant cocktail dress',
        userPhotos: { front: 'data:image/jpeg;base64,user-photo' },
        garmentPhotos: { front: 'data:image/jpeg;base64,dress-photo' },
        options: { garmentType: 'evening', pose: 'front', enhanceBackground: true }
      });

      const callArgs = mockGenerateContent.mock.calls[0][0];
      const promptText = callArgs[0].text;
      expect(promptText).toContain('evening wear');
      expect(promptText).toContain('sophisticated and glamorous');
      expect(promptText).toContain('luxurious fabrics');
      expect(promptText).toContain('Background styling');
    });
  });

  describe('Pose Generation', () => {
    it('should generate front pose correctly', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: 'front-pose-result'
                }
              }]
            }
          }]
        }
      });

      const result = await geminiGenerateTryOn({
        prompt: 'Show outfit from front',
        userPhotos: { front: 'data:image/jpeg;base64,user-photo' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-photo' },
        options: { pose: 'front' }
      });

      expect(result.results[0].pose).toBe('front');
      
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const promptText = callArgs[0].text;
      expect(promptText).toContain('standing straight facing forward');
    });

    it('should generate side pose correctly', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: 'side-pose-result'
                }
              }]
            }
          }]
        }
      });

      const result = await geminiGenerateTryOn({
        prompt: 'Show outfit profile view',
        userPhotos: { side: 'data:image/jpeg;base64,user-photo' },
        garmentPhotos: { side: 'data:image/jpeg;base64,garment-photo' },
        options: { pose: 'side' }
      });

      expect(result.results[0].pose).toBe('side');
      
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const promptText = callArgs[0].text;
      expect(promptText).toContain('standing in profile view');
    });

    it('should generate multiple poses when requested', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: 'pose-1-result'
                  }
                },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: 'pose-2-result'
                  }
                }
              ]
            }
          }]
        }
      });

      const result = await geminiGenerateTryOn({
        prompt: 'Show outfit in multiple angles',
        userPhotos: { front: 'data:image/jpeg;base64,user-photo' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-photo' },
        options: { generateMultiplePoses: true, pose: 'front' }
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0].pose).toBe('front');
      expect(result.results[1].pose).toBe('front');
      
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const promptText = callArgs[0].text;
      expect(promptText).toContain('Generate variations showing');
      expect(promptText).toContain('Front-facing pose (primary)');
      expect(promptText).toContain('Side profile view');
    });
  });

  describe('Image Processing', () => {
    it('should handle multiple image formats', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  mimeType: 'image/png',
                  data: 'png-result'
                }
              }]
            }
          }]
        }
      });

      const result = await geminiGenerateTryOn({
        prompt: 'Generate PNG output',
        userPhotos: { front: 'data:image/png;base64,user-png' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-jpg' },
      });

      expect(result.results[0].imageUrl).toBe('data:image/png;base64,png-result');
    });

    it('should handle base64 image inputs correctly', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: 'success-result'
                }
              }]
            }
          }]
        }
      });

      await geminiGenerateTryOn({
        prompt: 'Test with mixed input types',
        userPhotos: { 
          front: 'data:image/jpeg;base64,valid-base64',
          profile: 'https://example.com/image.jpg' // URL should be warned about
        },
        garmentPhotos: { 
          front: 'raw-base64-data' // Raw base64
        },
      });

      // Should warn about URL-based images
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('URL-based images not yet supported')
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should respect the 3-image API limit', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: 'limited-result'
                }
              }]
            }
          }]
        }
      });

      await geminiGenerateTryOn({
        prompt: 'Test image limit',
        userPhotos: { 
          front: 'data:image/jpeg;base64,user-1',
          side: 'data:image/jpeg;base64,user-2',
          back: 'data:image/jpeg;base64,user-3'
        },
        garmentPhotos: { 
          front: 'data:image/jpeg;base64,garment-1',
          side: 'data:image/jpeg;base64,garment-2' // This should be excluded
        },
      });

      // Should only process up to 3 images total
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.length).toBeLessThanOrEqual(4); // 1 text + max 3 images
      
      // Count image parts
      const imageParts = callArgs.slice(1);
      expect(imageParts.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should provide fallback when no images are generated', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [] // No candidates
        }
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await geminiGenerateTryOn({
        prompt: 'Test no generation',
        userPhotos: { front: 'data:image/jpeg;base64,user-photo' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-photo' },
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith('No images generated by Gemini API');
      expect(result.results[0].imageUrl).toBe('data:image/jpeg;base64,user-photo');
      expect(result.results[0].confidence).toBe(0.1);

      consoleWarnSpy.mockRestore();
    });

    it('should handle complete API failure gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockGenerateContent.mockRejectedValue(new Error('Complete API failure'));

      const result = await geminiGenerateTryOn({
        prompt: 'Test API failure',
        userPhotos: { front: 'data:image/jpeg;base64,user-photo' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-photo' },
      });

      expect(result.results[0].imageUrl).toBe('data:image/jpeg;base64,user-photo');
      expect(result.description).toContain('Error generating virtual try-on');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should use longer timeout for image generation', async () => {
      // Verify default timeout is increased for image generation
      mockGenerateContent.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          response: {
            candidates: [{
              content: {
                parts: [{
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: 'slow-generation-result'
                  }
                }]
              }
            }]
          }
        }), 1000)) // Reduced to 1 second for testing
      );

      const startTime = Date.now();
      await geminiGenerateTryOn({
        prompt: 'Test long generation',
        userPhotos: { front: 'data:image/jpeg;base64,user-photo' },
        garmentPhotos: { front: 'data:image/jpeg;base64,garment-photo' },
        // No timeout specified, should use default 60000ms
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThan(900);
    }, 15000); // 15 second test timeout
  });

  describe('Quality and Specifications', () => {
    it('should include quality specifications in prompts', () => {
      const prompt = buildVirtualTryOnPrompt('Test quality', {
        garmentType: 'business',
        pose: 'front'
      });

      expect(prompt).toContain('high resolution (up to 1024x1024px)');
      expect(prompt).toContain('SynthID watermark');
      expect(prompt).toContain('photorealistic');
      expect(prompt).toContain('hyper-specific, photographic language');
      expect(prompt).toContain('realistic fabric draping');
    });

    it('should include lighting and technical requirements', () => {
      const prompt = buildVirtualTryOnPrompt('Test technical specs', {
        garmentType: 'casual',
        enhanceBackground: true
      });

      expect(prompt).toContain('Lighting should be natural and flattering');
      expect(prompt).toContain('realistic skin tones and textures');
      expect(prompt).toContain('properly fitted and styled');
      expect(prompt).toContain('clean, professional background');
    });
  });
});
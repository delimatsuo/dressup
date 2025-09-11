import { GoogleGenerativeAI, Part } from '@google/generative-ai';

export interface GeminiGenerateOptions {
  generateMultiplePoses?: boolean;
  enhanceBackground?: boolean;
  timeout?: number;
  maxRetries?: number;
  pose?: 'front' | 'side' | 'walking' | 'sitting';
  garmentType?: 'formal' | 'casual' | 'athletic' | 'business' | 'evening';
}

export interface GeminiGenerateResult {
  results: Array<{
    imageUrl: string;
    confidence: number;
    pose?: string;
  }>;
  processingTime: number;
  description?: string;
  // For backward compatibility with existing tests
  images?: string[];
  confidences?: number[];
}

export interface GeminiGenerateParams {
  prompt: string;
  userPhotos: Record<string, string>;
  garmentPhotos: Record<string, string>;
  options?: GeminiGenerateOptions;
}

// Image input interface for proper API handling
export interface ImageInput {
  data: string; // base64 encoded image data
  mimeType: string;
}

// Prompt templates for different scenarios
export const PROMPT_TEMPLATES = {
  formal: {
    base: "Generate a high-quality, photorealistic image of a person wearing formal attire. The person should look professional and confident.",
    details: "Focus on proper fit, wrinkle-free appearance, and appropriate styling for business or formal occasions."
  },
  casual: {
    base: "Generate a natural, photorealistic image of a person wearing casual clothing. The person should appear comfortable and relaxed.",
    details: "Emphasize comfort, natural fit, and everyday wearability with appropriate casual styling."
  },
  athletic: {
    base: "Generate a dynamic, photorealistic image of a person wearing athletic wear. The person should appear active and energetic.",
    details: "Focus on performance fit, moisture-wicking appearance, and athletic posture suitable for exercise."
  },
  business: {
    base: "Generate a sharp, photorealistic image of a person wearing business attire. The person should exude professionalism and authority.",
    details: "Emphasize tailored fit, crisp lines, and executive presence appropriate for corporate settings."
  },
  evening: {
    base: "Generate an elegant, photorealistic image of a person wearing evening wear. The person should look sophisticated and glamorous.",
    details: "Focus on luxurious fabrics, flattering silhouettes, and refined styling for special occasions."
  }
};

export const POSE_INSTRUCTIONS = {
  front: "standing straight facing forward with arms naturally at sides, full body view",
  side: "standing in profile view showing the side silhouette, full body view",
  walking: "captured mid-step in a natural walking pose, dynamic but balanced",
  sitting: "seated in a chair with good posture, showing how the garment fits when seated"
};

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new TimeoutError('Request timeout')), timeoutMs)
    ),
  ]);
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Convert image URL/data to proper format for Gemini API
export async function prepareImageInput(imageData: string): Promise<ImageInput | null> {
  try {
    // If it's already base64 data
    if (imageData.startsWith('data:image/')) {
      const [header, data] = imageData.split(',');
      const mimeType = header.split(':')[1].split(';')[0];
      return { data, mimeType };
    }
    
    // If it's a URL, we'd need to fetch it (for now, return null to use URL directly)
    if (imageData.startsWith('http')) {
      return null; // Gemini can handle URLs directly
    }
    
    // If it's raw base64, assume JPEG
    return { data: imageData, mimeType: 'image/jpeg' };
  } catch (error) {
    console.error('Error preparing image input:', error);
    return null;
  }
}

// Build comprehensive prompt for virtual try-on
export function buildVirtualTryOnPrompt(
  basePrompt: string,
  options: GeminiGenerateOptions = {}
): string {
  const { garmentType = 'casual', pose = 'front', generateMultiplePoses = false, enhanceBackground = false } = options;
  
  const template = PROMPT_TEMPLATES[garmentType];
  const poseInstruction = POSE_INSTRUCTIONS[pose];
  
  let fullPrompt = `${template.base}\n\n`;
  fullPrompt += `Base request: ${basePrompt}\n\n`;
  fullPrompt += `Technical specifications:\n`;
  fullPrompt += `- Person should be ${poseInstruction}\n`;
  fullPrompt += `- ${template.details}\n`;
  fullPrompt += `- Lighting should be natural and flattering\n`;
  fullPrompt += `- Image should be high resolution (up to 1024x1024px)\n`;
  fullPrompt += `- Include SynthID watermark for authenticity\n\n`;
  
  if (generateMultiplePoses) {
    fullPrompt += `Generate variations showing:\n`;
    fullPrompt += `1. Front-facing pose (primary)\n`;
    fullPrompt += `2. Side profile view\n`;
    fullPrompt += `3. Walking or movement pose (if appropriate for garment)\n\n`;
  }
  
  if (enhanceBackground) {
    fullPrompt += `Background styling:\n`;
    fullPrompt += `- Use a clean, professional background\n`;
    fullPrompt += `- Ensure the background complements but doesn't distract from the outfit\n`;
    fullPrompt += `- Consider the context appropriate for ${garmentType} wear\n\n`;
  }
  
  fullPrompt += `Style guidelines:\n`;
  fullPrompt += `- Ensure realistic fabric draping and fit\n`;
  fullPrompt += `- Pay attention to proportions and body alignment\n`;
  fullPrompt += `- Create photorealistic skin tones and textures\n`;
  fullPrompt += `- Ensure clothing appears properly fitted and styled\n`;
  fullPrompt += `- Use hyper-specific, photographic language in rendering\n`;
  
  return fullPrompt;
}

export async function geminiGenerateTryOn({
  prompt,
  userPhotos,
  garmentPhotos,
  options = {},
}: GeminiGenerateParams): Promise<GeminiGenerateResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
  }

  const {
    generateMultiplePoses = false,
    enhanceBackground = false,
    timeout = 60000, // Increased for image generation
    maxRetries = 2,
    pose = 'front',
    garmentType = 'casual'
  } = options;

  const startTime = Date.now();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use the image generation model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-image-preview',
      generationConfig: {
        maxOutputTokens: 1290, // Token cost per generated image
      }
    });

    // Build the enhanced prompt
    const enhancedPrompt = buildVirtualTryOnPrompt(prompt, options);
    
    // Prepare image inputs (up to 3 images as per API limit)
    const imageParts: Part[] = [];
    let imageCount = 0;
    const maxImages = 3;
    
    // Add user photos first (most important)
    for (const [key, imageData] of Object.entries(userPhotos)) {
      if (imageCount >= maxImages) break;
      
      const imageInput = await prepareImageInput(imageData);
      if (imageInput) {
        imageParts.push({
          inlineData: {
            data: imageInput.data,
            mimeType: imageInput.mimeType
          }
        });
        imageCount++;
      } else if (imageData.startsWith('http')) {
        // For URLs, we'd need to handle them differently
        console.warn(`URL-based images not yet supported in this implementation: ${imageData}`);
      }
    }
    
    // Add garment photos if we have room
    for (const [key, imageData] of Object.entries(garmentPhotos)) {
      if (imageCount >= maxImages) break;
      
      const imageInput = await prepareImageInput(imageData);
      if (imageInput) {
        imageParts.push({
          inlineData: {
            data: imageInput.data,
            mimeType: imageInput.mimeType
          }
        });
        imageCount++;
      }
    }

    // Combine text prompt with images
    const parts: Part[] = [
      { text: enhancedPrompt },
      ...imageParts
    ];

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const generatePromise = model.generateContent(parts);
        const result = await withTimeout(generatePromise, timeout);
        
        // For image generation, the response contains the generated image
        const response = result.response;
        
        // Process the generated images
        const results: any[] = [];
        
        // Check if we have generated images in the response
        if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              // Handle inline image data
              if (part.inlineData) {
                const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                results.push({
                  imageUrl,
                  confidence: 0.95, // High confidence for generated images
                  pose: pose
                });
              }
            }
          }
        }
        
        // If no images were generated, create a placeholder result
        if (results.length === 0) {
          console.warn('No images generated by Gemini API');
          results.push({
            imageUrl: userPhotos.front || garmentPhotos.front || '',
            confidence: 0.1,
            pose: pose
          });
        }

        // Calculate processing time
        const processingTime = Date.now() - startTime;
        
        // Generate description
        const description = `AI-generated virtual try-on for ${garmentType} wear in ${pose} pose`;

        // Shape the response
        const shapedResponse: GeminiGenerateResult = {
          results,
          processingTime,
          description,
        };

        // Add backward compatibility properties
        try {
          Object.defineProperty(shapedResponse, 'images', {
            get: () => results.map((r: any) => r.imageUrl),
            enumerable: false,
            configurable: true,
          });
          Object.defineProperty(shapedResponse, 'confidences', {
            get: () => results.map((r: any) => r.confidence),
            enumerable: false,
            configurable: true,
          });
        } catch {
          // If defineProperty fails, silently ignore
        }

        return shapedResponse;
        
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on timeout or validation errors
        if (
          error instanceof TimeoutError ||
          (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('timeout')))
        ) {
          throw error;
        }

        // Implement exponential backoff for retries
        if (attempt < maxRetries) {
          const backoffMs = Math.min(2000 * Math.pow(2, attempt), 20000); // Longer backoff for image generation
          await sleep(backoffMs);
        }

        attempt++;
      }
    }

    // If we've exhausted all retries, throw the last error
    throw lastError || new Error('Failed to generate virtual try-on images after retries');
    
  } catch (error) {
    console.error('Error in geminiGenerateTryOn:', error);
    
    // Fallback response to maintain compatibility
    return {
      results: [{
        imageUrl: userPhotos.front || garmentPhotos.front || '',
        confidence: 0.1,
        pose: pose
      }],
      processingTime: Date.now() - startTime,
      description: `Error generating virtual try-on: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

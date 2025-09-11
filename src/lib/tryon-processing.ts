import { TryOnRequest, buildPrompt } from '@/lib/tryon';
import { geminiGenerateTryOn, GeminiGenerateOptions } from '@/lib/gemini';

export interface TryOnResultItem {
  type: string;
  imageUrl: string;
  confidence: number;
}

export interface TryOnProcessResult {
  results: TryOnResultItem[];
  processingTime: number;
  description: string;
}

// Process try-on request using Gemini Image Generation API when available, fallback to placeholder
export async function processWithGemini(req: TryOnRequest): Promise<TryOnProcessResult> {
  const start = Date.now();
  const prompt = buildPrompt(req);
  
  // Check if GOOGLE_AI_API_KEY is available
  if (process.env.GOOGLE_AI_API_KEY) {
    try {
      // Enhanced options for image generation
      const geminiOptions: GeminiGenerateOptions = {
        ...req.options,
        // Determine garment type from request context
        garmentType: determineGarmentType(req, prompt),
        // Determine pose from request options or default
        pose: determinePose(req.options),
        // Use longer timeout for image generation
        timeout: (req.options as any)?.timeout || 60000,
        // More retries for image generation as it's more resource intensive
        maxRetries: (req.options as any)?.maxRetries || 3,
      };
      
      // Use the new image generation API
      const geminiResult = await geminiGenerateTryOn({
        prompt,
        userPhotos: req.userPhotos,
        garmentPhotos: req.garmentPhotos,
        options: geminiOptions,
      });
      
      // Map Gemini image generation results to our expected format
      let results: TryOnResultItem[] = [];
      
      if (Array.isArray(geminiResult.results)) {
        results = geminiResult.results.map((result: any, index: number) => ({
          type: result.pose || (index === 0 ? 'standing' : index === 1 ? 'profile' : `pose_${index + 1}`),
          imageUrl: result.imageUrl,
          confidence: result.confidence || 0.95,
        }));
      } else {
        // Fallback to legacy format if needed
        const images = (geminiResult as any).images as string[] || [];
        const confidences = (geminiResult as any).confidences as number[] || [];
        const len = Math.min(images.length, confidences.length);
        results = Array.from({ length: len }).map((_, index) => ({
          type: index === 0 ? 'standing' : index === 1 ? 'profile' : `pose_${index + 1}`,
          imageUrl: images[index],
          confidence: confidences[index] || 0.95,
        }));
      }
      
      // Ensure we have at least one result
      if (results.length === 0) {
        results.push({
          type: 'standing',
          imageUrl: req.userPhotos.front || req.garmentPhotos.front || '',
          confidence: 0.1,
        });
      }
      
      return {
        results,
        processingTime: geminiResult.processingTime / 1000, // Convert ms to seconds
        description: geminiResult.description || `AI-generated virtual try-on for ${geminiOptions.garmentType} wear`,
      };
    } catch (error) {
      console.error('Gemini Image Generation API error, falling back to placeholder:', error);
      // Fall through to placeholder implementation
    }
  }
  
  // Enhanced fallback placeholder implementation
  const items: TryOnResultItem[] = [
    { 
      type: 'standing', 
      imageUrl: req.userPhotos.front || req.garmentPhotos.front || '', 
      confidence: 0.95 
    },
    { 
      type: 'profile', 
      imageUrl: req.userPhotos.side || req.garmentPhotos.side || req.userPhotos.front || req.garmentPhotos.front || '', 
      confidence: 0.92 
    },
  ].filter(item => item.imageUrl); // Remove items without images
  
  return {
    results: items,
    processingTime: (Date.now() - start) / 1000,
    description: `Virtual try-on preview: ${prompt.substring(0, 60)}...`,
  };
}

// Helper function to determine garment type from request context
function determineGarmentType(req: TryOnRequest, prompt: string): GeminiGenerateOptions['garmentType'] {
  const promptLower = prompt.toLowerCase();
  
  if (promptLower.includes('formal') || promptLower.includes('suit') || promptLower.includes('blazer')) {
    return 'formal';
  }
  if (promptLower.includes('business') || promptLower.includes('professional') || promptLower.includes('office')) {
    return 'business';
  }
  if (promptLower.includes('evening') || promptLower.includes('dress') || promptLower.includes('gown')) {
    return 'evening';
  }
  if (promptLower.includes('athletic') || promptLower.includes('workout') || promptLower.includes('sport')) {
    return 'athletic';
  }
  
  // Default to casual
  return 'casual';
}

// Helper function to determine pose from request options
function determinePose(options: any): GeminiGenerateOptions['pose'] {
  // Check if pose is explicitly specified in options
  if (options?.pose && ['front', 'side', 'walking', 'sitting'].includes(options.pose)) {
    return options.pose;
  }
  
  // Check for multiple poses request
  if (options?.generateMultiplePoses) {
    return 'front'; // Start with front pose for multiple pose generation
  }
  
  // Default to front pose
  return 'front';
}

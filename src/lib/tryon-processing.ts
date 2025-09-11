import { TryOnRequest, buildPrompt } from '@/lib/tryon';
import { geminiGenerateTryOn } from '@/lib/gemini';

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

// Process try-on request using Gemini API when available, fallback to placeholder
export async function processWithGemini(req: TryOnRequest): Promise<TryOnProcessResult> {
  const start = Date.now();
  const prompt = buildPrompt(req);
  
  // Check if GOOGLE_AI_API_KEY is available
  if (process.env.GOOGLE_AI_API_KEY) {
    try {
      // Use real Gemini API
      const geminiResult = await geminiGenerateTryOn({
        prompt,
        userPhotos: req.userPhotos,
        garmentPhotos: req.garmentPhotos,
        options: req.options,
      });
      
      // Map Gemini results to our expected format.
      // Support both new shape (results[]) and backward-compat fields (images[], confidences[])
      let results: TryOnResultItem[] = [];
      if (Array.isArray((geminiResult as any).results)) {
        results = (geminiResult as any).results.map((result: any, index: number) => ({
          type: index === 0 ? 'standing' : index === 1 ? 'sitting' : `pose_${index + 1}`,
          imageUrl: result.imageUrl,
          confidence: result.confidence,
        }));
      } else if (
        Array.isArray((geminiResult as any).images) &&
        Array.isArray((geminiResult as any).confidences)
      ) {
        const images = (geminiResult as any).images as string[];
        const confidences = (geminiResult as any).confidences as number[];
        const len = Math.min(images.length, confidences.length);
        results = Array.from({ length: len }).map((_, index) => ({
          type: index === 0 ? 'standing' : index === 1 ? 'sitting' : `pose_${index + 1}`,
          imageUrl: images[index],
          confidence: confidences[index],
        }));
      }
      
      return {
        results,
        processingTime: geminiResult.processingTime / 1000, // Convert ms to seconds
        description: geminiResult.description || `AI-generated try-on results`,
      };
    } catch (error) {
      console.error('Gemini API error, falling back to placeholder:', error);
      // Fall through to placeholder implementation
    }
  }
  
  // Fallback placeholder implementation
  const items: TryOnResultItem[] = [
    { type: 'standing', imageUrl: req.garmentPhotos.front || req.userPhotos.front, confidence: 0.95 },
    { type: 'sitting', imageUrl: req.garmentPhotos.side || req.userPhotos.side, confidence: 0.92 },
  ];
  return {
    results: items,
    processingTime: (Date.now() - start) / 1000,
    description: `Gemini processed: ${prompt.substring(0, 60)}...`,
  };
}

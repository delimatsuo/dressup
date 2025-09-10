import { TryOnRequest, buildPrompt } from '@/lib/tryon';

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

// Placeholder that simulates Gemini output using input images.
// Later, replace with real Google API calls using GOOGLE_AI_API_KEY.
export async function processWithGemini(req: TryOnRequest): Promise<TryOnProcessResult> {
  const start = Date.now();
  const prompt = buildPrompt(req);
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


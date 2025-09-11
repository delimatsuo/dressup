export interface TryOnRequest {
  sessionId: string;
  userPhotos: { front: string; side?: string | null; back?: string | null };
  garmentPhotos: { front: string; side?: string | null; back?: string | null };
  options?: { generateMultiplePoses?: boolean; enhanceBackground?: boolean };
}

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

export interface TryOnJob {
  jobId: string;
  status: 'accepted' | 'processing' | 'completed' | 'failed';
  estimatedTime: number; // seconds
}

export function validateTryOnInput(req: TryOnRequest): Validation<TryOnRequest> {
  if (!req.sessionId) return { ok: false, error: 'Session ID is required' };
  if (!req.userPhotos?.front) {
    return { ok: false, error: 'User front photo is required' };
  }
  if (!req.garmentPhotos?.front) {
    return { ok: false, error: 'Garment front photo is required' };
  }
  return { ok: true, value: req };
}

export function buildPrompt(req: TryOnRequest): string {
  const multi = req.options?.generateMultiplePoses ? 'Generate multiple poses (standing, sitting, movement).' : 'Generate a single natural pose.';
  const bg = req.options?.enhanceBackground ? 'Enhance background to match garment style without distracting from subject.' : 'Keep background neutral.';
  return [
    'Task: Virtual try-on image generation.',
    'Requirements:',
    '- Maintain subject identity and proportions.',
    '- Fit garment naturally with correct drape and deformation.',
    '- Ensure consistent lighting and shadows.',
    `- ${multi}`,
    `- ${bg}`,
  ].join('\n');
}

function genJobId() {
  return 'job_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function submitTryOn(req: TryOnRequest): Promise<TryOnJob> {
  const v = validateTryOnInput(req);
  if (!v.ok) throw new Error(v.error);
  // In future: call Gemini with buildPrompt(req) + images; for now return accepted job
  return {
    jobId: genJobId(),
    status: 'accepted',
    estimatedTime: 30,
  };
}


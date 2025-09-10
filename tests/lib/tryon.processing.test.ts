import { buildPrompt, type TryOnRequest } from '@/lib/tryon';
import { processWithGemini } from '@/lib/tryon-processing';

describe('try-on processing (Gemini placeholder)', () => {
  const req: TryOnRequest = {
    sessionId: 'session_abc',
    userPhotos: { front: 'u-front.jpg', side: 'u-side.jpg' },
    garmentPhotos: { front: 'g-front.jpg', side: 'g-side.jpg' },
    options: { generateMultiplePoses: true, enhanceBackground: true },
  };

  it('builds a prompt and returns shaped results', async () => {
    const prompt = buildPrompt(req);
    expect(prompt).toMatch(/virtual try-on/i);
    const res = await processWithGemini(req);
    expect(res.results.length).toBeGreaterThanOrEqual(2);
    expect(res.results[0]).toHaveProperty('type');
    expect(res.results[0]).toHaveProperty('imageUrl');
    expect(res.description).toMatch(/Gemini/);
  });
});


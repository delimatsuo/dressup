import { processWithGemini } from '@/lib/tryon-processing';
import { type TryOnRequest } from '@/lib/tryon';

jest.mock('@/lib/gemini', () => ({
  geminiGenerateTryOn: jest.fn(async () => ({
    images: ['https://result/one.png', 'https://result/two.png'],
    confidences: [0.91, 0.88],
  })),
}));

describe('processWithGemini (real client path)', () => {
  const req: TryOnRequest = {
    sessionId: 'session_abc',
    userPhotos: { front: 'u-front.jpg', side: 'u-side.jpg' },
    garmentPhotos: { front: 'g-front.jpg', side: 'g-side.jpg' },
    options: { generateMultiplePoses: true, enhanceBackground: true },
  };

  it('uses geminiGenerateTryOn when GOOGLE_AI_API_KEY is set and returns shaped results', async () => {
    process.env.GOOGLE_AI_API_KEY = 'test';
    const res = await processWithGemini(req);
    expect(res.results.length).toBe(2);
    expect(res.results[0].imageUrl).toMatch(/https:\/\/result\/one\.png/);
    expect(res.results[0].confidence).toBeGreaterThan(0);
  });
});


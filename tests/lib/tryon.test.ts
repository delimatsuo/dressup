import { validateTryOnInput, buildPrompt, submitTryOn, type TryOnRequest } from '@/lib/tryon';

describe('tryon lib', () => {
  const goodReq: TryOnRequest = {
    sessionId: 'session_123',
    userPhotos: { front: 'https://example.com/u-front.jpg', side: 'https://example.com/u-side.jpg' },
    garmentPhotos: { front: 'https://example.com/g-front.jpg', side: 'https://example.com/g-side.jpg' },
    options: { generateMultiplePoses: true, enhanceBackground: true }
  };

  it('validates required fields', () => {
    const v = validateTryOnInput(goodReq);
    expect(v.ok).toBe(true);
  });

  it('fails validation on missing photos', () => {
    const bad = { ...goodReq, userPhotos: { front: '', side: '' } };
    const v = validateTryOnInput(bad as any);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toMatch(/User front and side photos/);
  });

  it('builds a prompt including key instructions', () => {
    const prompt = buildPrompt(goodReq);
    expect(prompt).toMatch(/virtual try-on/i);
    expect(prompt).toMatch(/multiple poses/i);
    expect(prompt).toMatch(/consistent lighting/i);
  });

  it('submits a try-on job and returns an accepted job id', async () => {
    const job = await submitTryOn(goodReq);
    expect(job.status).toBe('accepted');
    expect(job.jobId).toMatch(/^job_/);
    expect(job.estimatedTime).toBeGreaterThan(0);
  });
});


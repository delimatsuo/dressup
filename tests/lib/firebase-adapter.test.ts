import { processMultiPhotoOutfit } from '@/lib/firebase';

describe('firebase adapter (Vercel API bridge)', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({ success: true }) }));
  });

  it('posts to /api/try-on and returns shaped result', async () => {
    const res = await processMultiPhotoOutfit(
      { front: 'u-front', side: 'u-side' },
      { front: 'g-front', side: 'g-side' },
      'session_1'
    );
    expect(fetch).toHaveBeenCalled();
    const [url, init] = (fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/api\/try-on$/);
    expect((init as any).method).toBe('POST');
    expect(res.poses.length).toBeGreaterThan(0);
    expect(res.processingTime).toBeGreaterThan(0);
  });
});


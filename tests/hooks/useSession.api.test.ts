import { act, renderHook } from '@testing-library/react';
import { useSession } from '@/hooks/useSession';

describe('useSession API integration (mocked)', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn(async (url: string) => {
      if (url.endsWith('/api/session/create')) {
        const now = new Date().toISOString();
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              sessionId: 'session_test',
              createdAt: now,
              updatedAt: now,
              expiresAt: new Date(Date.now() + 1800 * 1000).toISOString(),
              status: 'active',
              userPhotos: [],
              garmentPhotos: [],
            },
            ttl: 1800,
          }),
        } as any;
      }
      return { ok: false, json: async () => ({}) } as any;
    });
    localStorage.clear();
  });

  it('creates a session via /api/session/create and stores it', async () => {
    const { result } = renderHook(() => useSession());
    await act(async () => {
      await result.current.createSession();
    });
    expect(result.current.session?.sessionId).toBe('session_test');
    const stored = JSON.parse(localStorage.getItem('dressup_session') || '{}');
    expect(stored.sessionId).toBe('session_test');
    expect(result.current.remainingTime).toBeGreaterThan(0);
    expect(result.current.formattedRemainingTime).toMatch(/\d{1,2}:\d{2}/);
  });
});


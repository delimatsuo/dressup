import * as kv from '@/lib/kv';
import { createSession, getSession, updateSession, deleteSession, getSessionKey, SESSION_TTL } from '@/lib/session';

jest.mock('@/lib/kv');

describe('session lib', () => {
  const mockStore = new Map<string, any>();

  beforeEach(() => {
    mockStore.clear();
    (kv.kvSet as jest.Mock).mockImplementation(async (key: string, value: any) => {
      mockStore.set(key, value);
    });
    (kv.kvGet as jest.Mock).mockImplementation(async (key: string) => {
      return mockStore.has(key) ? mockStore.get(key) : null;
    });
    (kv.kvDel as jest.Mock).mockImplementation(async (key: string) => {
      mockStore.delete(key);
    });
  });

  it('creates a session with TTL and defaults', async () => {
    const s = await createSession();
    expect(s.sessionId).toMatch(/^session_/);
    expect(new Date(s.createdAt).getTime()).toBeGreaterThan(0);
    expect(new Date(s.expiresAt).getTime()).toBeGreaterThan(new Date(s.createdAt).getTime());
    expect(s.status).toBe('active');
    const saved = mockStore.get(getSessionKey(s.sessionId));
    expect(saved).toBeTruthy();
    expect(saved.userPhotos).toEqual([]);
    expect(saved.garmentPhotos).toEqual([]);
    expect(SESSION_TTL).toBe(1800);
  });

  it('gets an existing session', async () => {
    const s = await createSession();
    const found = await getSession(s.sessionId);
    expect(found?.sessionId).toBe(s.sessionId);
    expect(found?.status).toBe('active');
  });

  it('returns null for missing session', async () => {
    const found = await getSession('missing');
    expect(found).toBeNull();
  });

  it('updates a session and bumps expiresAt', async () => {
    const s = await createSession();
    const beforeExpire = s.expiresAt;
    const next = await updateSession(s.sessionId, { userPhotos: ['u1'], garmentPhotos: ['g1'] });
    expect(next).toBeTruthy();
    expect(next!.userPhotos).toEqual(['u1']);
    expect(new Date(next!.expiresAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeExpire).getTime());
  });

  it('deletes a session', async () => {
    const s = await createSession();
    const ok = await deleteSession(s.sessionId);
    expect(ok).toBe(true);
    const after = await getSession(s.sessionId);
    expect(after).toBeNull();
  });
});

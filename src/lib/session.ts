import { kvGet, kvSet, kvDel } from './kv';

export type SessionStatus = 'active' | 'expired' | 'deleted' | 'cleanup';

export interface SessionData {
  sessionId: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  expiresAt: string; // ISO
  status: SessionStatus;
  userPhotos: string[];
  garmentPhotos: string[];
}

const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes

function nowIso() {
  return new Date().toISOString();
}

export function getSessionKey(sessionId: string) {
  return `session:${sessionId}`;
}

function genId() {
  // Simple non-cryptographic ID for session labels
  return 's' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function createSession(): Promise<SessionData> {
  const id = `session_${genId()}`;
  const createdAt = nowIso();
  const updatedAt = createdAt;
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  const session: SessionData = {
    sessionId: id,
    createdAt,
    updatedAt,
    expiresAt,
    status: 'active',
    userPhotos: [],
    garmentPhotos: [],
  };
  await kvSet(getSessionKey(id), session, SESSION_TTL_SECONDS);
  return session;
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const session = await kvGet<SessionData>(getSessionKey(sessionId));
  if (!session) return null;
  // determine expiration
  const expired = Date.parse(session.expiresAt) <= Date.now();
  return expired ? { ...session, status: 'expired' } : session;
}

export async function updateSession(
  sessionId: string,
  patch: Partial<Pick<SessionData, 'userPhotos' | 'garmentPhotos' | 'status'>>
): Promise<SessionData | null> {
  const current = await getSession(sessionId);
  if (!current) return null;
  const updatedAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  const next: SessionData = {
    ...current,
    ...patch,
    updatedAt,
    expiresAt,
    status: 'active',
  };
  await kvSet(getSessionKey(sessionId), next, SESSION_TTL_SECONDS);
  return next;
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const existing = await getSession(sessionId);
  if (!existing) return false;
  await kvDel(getSessionKey(sessionId));
  return true;
}

export const SESSION_TTL = SESSION_TTL_SECONDS;

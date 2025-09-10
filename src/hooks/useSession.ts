import { useState, useEffect, useCallback } from 'react';

interface Session {
  sessionId: string;
  expiresIn: number;
  expiresAt: Date;
}

interface SessionStatus {
  session: {
    sessionId: string;
    userPhotos: any[];
    createdAt: Date;
    expiresAt: Date;
    status: 'active' | 'expired';
  };
  remainingTime: number;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const formattedRemainingTime = `${Math.floor(remainingTime / 60)}:${String(remainingTime % 60).padStart(2, '0')}`;

  // Load session from localStorage on mount
  useEffect(() => {
    // Skip during SSR/build time
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const storedSession = localStorage.getItem('dressup_session');
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        const expiresAt = new Date(parsed.expiresAt);
        
        // Check if session is still valid
        if (expiresAt > new Date()) {
          setSession(parsed);
          const remaining = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
          setRemainingTime(remaining);
        } else {
          // Clean up expired session
          localStorage.removeItem('dressup_session');
        }
      } catch (err) {
        console.error('Failed to parse stored session:', err);
        localStorage.removeItem('dressup_session');
      }
    }
    setLoading(false);
  }, []);

  // Update remaining time
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      const expiresAt = new Date(session.expiresAt);
      const remaining = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
      
      if (remaining <= 0) {
        setSession(null);
        setRemainingTime(0);
        localStorage.removeItem('dressup_session');
      } else {
        setRemainingTime(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const createSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/session/create', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create session');
      const json = await res.json();
      const data = json.data || json;
      const expiresAt = new Date(data.expiresAt);
      const expiresIn = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      const newSession: Session = {
        sessionId: data.sessionId,
        expiresIn: expiresIn || 1800,
        expiresAt,
      };
      setSession(newSession);
      setRemainingTime(newSession.expiresIn);
      localStorage.setItem('dressup_session', JSON.stringify(newSession));
      return newSession;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSessionStatus = useCallback(async (): Promise<SessionStatus | null> => {
    if (!session) return null;
    
    // TODO: Replace with Vercel KV session status in Task 1.4
    // For now, return mock status
    return {
      session: {
        sessionId: session.sessionId,
        userPhotos: [],
        createdAt: new Date(new Date(session.expiresAt).getTime() - 1800000),
        expiresAt: new Date(session.expiresAt),
        status: remainingTime > 0 ? 'active' : 'expired'
      },
      remainingTime
    };
  }, [session, remainingTime]);

  const extendSession = useCallback(async () => {
    if (!session) return;
    
    // TODO: Replace with Vercel KV session extension in Task 1.4
    const expiresIn = 1800; // 30 minutes
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    const updatedSession = {
      ...session,
      expiresAt
    };
    
    setSession(updatedSession);
    setRemainingTime(expiresIn);
    localStorage.setItem('dressup_session', JSON.stringify(updatedSession));
  }, [session]);

  const clearSession = useCallback(() => {
    setSession(null);
    setRemainingTime(0);
    localStorage.removeItem('dressup_session');
  }, []);

  return {
    session,
    loading,
    error,
    remainingTime,
    formattedRemainingTime,
    createSession,
    getSessionStatus,
    extendSession,
    clearSession
  };
}

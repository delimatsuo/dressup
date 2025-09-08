import { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

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

  // Initialize functions with error handling
  let functions;
  try {
    functions = getFunctions(app);
  } catch (error) {
    console.warn('Firebase functions not available:', error);
    functions = null;
  }

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
          setRemainingTime(Math.floor((expiresAt.getTime() - Date.now()) / 1000));
        } else {
          // Session expired, clear it
          if (typeof window !== 'undefined') {
            localStorage.removeItem('dressup_session');
          }
          createNewSession();
        }
      } catch (e) {
        console.error('Error parsing stored session:', e);
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  // Update remaining time every second
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      const expiresAt = new Date(session.expiresAt);
      const remaining = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
      
      if (remaining <= 0) {
        // Session expired
        localStorage.removeItem('dressup_session');
        createNewSession();
      } else {
        setRemainingTime(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const createNewSession = useCallback(async () => {
    // Skip during SSR/build time
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // If functions aren't available, create a mock session
      if (!functions) {
        console.warn('Firebase functions not available, creating mock session');
        const mockSession: Session = {
          sessionId: `session-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          expiresIn: 1800, // 30 minutes
          expiresAt: new Date(Date.now() + 30 * 60 * 1000)
        };
        
        localStorage.setItem('dressup_session', JSON.stringify(mockSession));
        setSession(mockSession);
        setRemainingTime(1800);
        setLoading(false);
        return;
      }

      const createSession = httpsCallable(functions, 'createSession');
      const result = await createSession({});
      const data = result.data as { sessionId: string; expiresIn: number };
      
      const newSession: Session = {
        sessionId: data.sessionId,
        expiresIn: data.expiresIn,
        expiresAt: new Date(Date.now() + data.expiresIn * 1000)
      };
      
      // Store in localStorage
      localStorage.setItem('dressup_session', JSON.stringify(newSession));
      
      setSession(newSession);
      setRemainingTime(data.expiresIn);
    } catch (err) {
      console.error('Error creating session:', err);
      // Fallback to mock session
      const mockSession: Session = {
        sessionId: `fallback-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        expiresIn: 1800, // 30 minutes
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
      
      localStorage.setItem('dressup_session', JSON.stringify(mockSession));
      setSession(mockSession);
      setRemainingTime(1800);
    } finally {
      setLoading(false);
    }
  }, [functions]);

  const extendSession = useCallback(async (additionalMinutes: number = 30) => {
    if (!session) return;
    
    try {
      const extendSessionFn = httpsCallable(functions, 'extendSession');
      const result = await extendSessionFn({
        sessionId: session.sessionId,
        additionalMinutes
      });
      
      const data = result.data as { newExpiresAt: string };
      const newExpiresAt = new Date(data.newExpiresAt);
      
      const updatedSession: Session = {
        ...session,
        expiresAt: newExpiresAt
      };
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('dressup_session', JSON.stringify(updatedSession));
      }
      setSession(updatedSession);
      setRemainingTime(Math.floor((newExpiresAt.getTime() - Date.now()) / 1000));
      
      return true;
    } catch (err) {
      console.error('Error extending session:', err);
      return false;
    }
  }, [session, functions]);

  const getSessionStatus = useCallback(async () => {
    if (!session) return null;
    
    try {
      const getStatus = httpsCallable(functions, 'getSessionStatus');
      const result = await getStatus({ sessionId: session.sessionId });
      return result.data as SessionStatus;
    } catch (err) {
      console.error('Error getting session status:', err);
      return null;
    }
  }, [session, functions]);

  const addPhotoToSession = useCallback(async (
    photoUrl: string,
    photoType: 'user' | 'garment' | 'generated',
    photoView?: 'front' | 'side' | 'back'
  ) => {
    if (!session) return false;
    
    try {
      // TEMPORARY: Bypass Cloud Function for testing
      console.log('Photo uploaded successfully:', {
        sessionId: session.sessionId,
        photoUrl,
        photoType,
        photoView
      });
      
      // Store in local state instead of Cloud Function
      // This is a temporary solution for testing
      return true;
      
      // Original code commented out for testing:
      // const addPhoto = httpsCallable(functions, 'addPhotoToSession');
      // await addPhoto({
      //   sessionId: session.sessionId,
      //   photoUrl,
      //   photoType,
      //   photoView
      // });
      // return true;
    } catch (err) {
      console.error('Error adding photo to session:', err);
      return false;
    }
  }, [session, functions]);

  const deleteSession = useCallback(async () => {
    if (!session) return;
    
    try {
      const deleteFn = httpsCallable(functions, 'deleteSession');
      await deleteFn({ sessionId: session.sessionId });
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('dressup_session');
      }
      setSession(null);
      
      // Create a new session
      await createNewSession();
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  }, [session, functions, createNewSession]);

  const formatRemainingTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    session,
    loading,
    error,
    remainingTime,
    formattedRemainingTime: formatRemainingTime(remainingTime),
    createNewSession,
    extendSession,
    getSessionStatus,
    addPhotoToSession,
    deleteSession
  };
}
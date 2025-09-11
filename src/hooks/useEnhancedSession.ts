/**
 * Enhanced Session Hook with KV Integration
 * Provides full session lifecycle management with activity tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ================================
// Types & Interfaces
// ================================

interface SessionData {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'deleted';
  userPhotos: string[];
  garmentPhotos: string[];
  lastActivityAt?: string;
  restorationToken?: string;
}

interface SessionState {
  session: SessionData | null;
  loading: boolean;
  error: string | null;
  remainingTime: number;
  isExpired: boolean;
  isInactive: boolean;
}

interface UseEnhancedSessionOptions {
  autoCreate?: boolean;
  autoRestore?: boolean;
  trackActivity?: boolean;
  inactivityWarningThreshold?: number; // minutes
  storageKey?: string;
}

// ================================
// Constants
// ================================

const DEFAULT_OPTIONS: UseEnhancedSessionOptions = {
  autoCreate: false,
  autoRestore: true,
  trackActivity: true,
  inactivityWarningThreshold: 25, // 5 minutes before expiry
  storageKey: 'dressup_session_v2'
};

const SESSION_CHECK_INTERVAL = 10000; // Check every 10 seconds
const ACTIVITY_DEBOUNCE_MS = 5000; // Debounce activity tracking

// ================================
// Enhanced Session Hook
// ================================

export function useEnhancedSession(options: UseEnhancedSessionOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const router = useRouter();
  
  // State
  const [state, setState] = useState<SessionState>({
    session: null,
    loading: true,
    error: null,
    remainingTime: 0,
    isExpired: false,
    isInactive: false
  });

  // Refs for intervals and debouncing
  const intervalRef = useRef<NodeJS.Timeout>();
  const activityTimeoutRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<Date>(new Date());

  // ================================
  // Session API Methods
  // ================================

  /**
   * Create a new session
   */
  const createSession = useCallback(async (metadata?: Record<string, any>): Promise<SessionData | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      };

      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: { ...metadata, deviceInfo } })
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const { data } = await response.json();
      const session = data as SessionData;

      // Store in localStorage
      if (opts.storageKey) {
        localStorage.setItem(opts.storageKey, JSON.stringify({
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
          restorationToken: session.restorationToken
        }));
      }

      setState(prev => ({
        ...prev,
        session,
        loading: false,
        isExpired: false,
        isInactive: false
      }));

      // Track session creation
      if (opts.trackActivity) {
        trackActivity(session.sessionId, 'session_created');
      }

      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create session';
      setState(prev => ({ ...prev, error: message, loading: false }));
      console.error('Session creation failed:', error);
      return null;
    }
  }, [opts.storageKey, opts.trackActivity]);

  /**
   * Get session details from server
   */
  const getSessionDetails = useCallback(async (sessionId: string): Promise<SessionData | null> => {
    try {
      const response = await fetch(`/api/session/${sessionId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Session not found
        }
        throw new Error(`Failed to get session: ${response.statusText}`);
      }

      const { data } = await response.json();
      return data as SessionData;
    } catch (error) {
      console.error('Failed to get session details:', error);
      return null;
    }
  }, []);

  /**
   * Restore session from storage or token
   */
  const restoreSession = useCallback(async (): Promise<SessionData | null> => {
    if (!opts.autoRestore || !opts.storageKey) return null;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const stored = localStorage.getItem(opts.storageKey);
      if (!stored) return null;

      const { sessionId, expiresAt, restorationToken } = JSON.parse(stored);
      
      // Check if session is expired locally
      if (new Date(expiresAt) <= new Date()) {
        localStorage.removeItem(opts.storageKey);
        return null;
      }

      // Try to get session from server
      let session = await getSessionDetails(sessionId);

      // If session not found but we have restoration token, try to restore
      if (!session && restorationToken) {
        const response = await fetch('/api/session/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: restorationToken })
        });

        if (response.ok) {
          const { data } = await response.json();
          session = data as SessionData;
        }
      }

      if (session) {
        setState(prev => ({
          ...prev,
          session,
          loading: false,
          isExpired: session.status === 'expired',
          isInactive: false
        }));

        // Track restoration
        if (opts.trackActivity) {
          trackActivity(session.sessionId, 'session_restored');
        }

        return session;
      }

      // Clean up invalid storage
      localStorage.removeItem(opts.storageKey);
      return null;
    } catch (error) {
      console.error('Session restoration failed:', error);
      setState(prev => ({ ...prev, loading: false }));
      return null;
    }
  }, [opts.autoRestore, opts.storageKey, opts.trackActivity, getSessionDetails]);

  /**
   * Track user activity
   */
  const trackActivity = useCallback(async (sessionId: string, action: string, metadata?: Record<string, any>) => {
    if (!opts.trackActivity) return;

    // Debounce activity tracking
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    activityTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/session/${sessionId}/activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, metadata })
        });

        lastActivityRef.current = new Date();
      } catch (error) {
        console.error('Failed to track activity:', error);
      }
    }, ACTIVITY_DEBOUNCE_MS);
  }, [opts.trackActivity]);

  /**
   * Extend session TTL
   */
  const extendSession = useCallback(async (): Promise<boolean> => {
    if (!state.session) return false;

    try {
      const response = await fetch(`/api/session/${state.session.sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extend: true })
      });

      if (!response.ok) {
        throw new Error('Failed to extend session');
      }

      const { data } = await response.json();
      const updated = data as SessionData;

      setState(prev => ({
        ...prev,
        session: updated,
        isExpired: false,
        isInactive: false
      }));

      // Update storage
      if (opts.storageKey) {
        const stored = localStorage.getItem(opts.storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.expiresAt = updated.expiresAt;
          localStorage.setItem(opts.storageKey, JSON.stringify(parsed));
        }
      }

      // Track extension
      if (opts.trackActivity) {
        trackActivity(updated.sessionId, 'session_extended');
      }

      return true;
    } catch (error) {
      console.error('Failed to extend session:', error);
      setState(prev => ({ ...prev, error: 'Failed to extend session' }));
      return false;
    }
  }, [state.session, opts.storageKey, opts.trackActivity, trackActivity]);

  /**
   * Clear session
   */
  const clearSession = useCallback(async () => {
    if (state.session) {
      try {
        await fetch(`/api/session/${state.session.sessionId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }

    setState({
      session: null,
      loading: false,
      error: null,
      remainingTime: 0,
      isExpired: false,
      isInactive: false
    });

    if (opts.storageKey) {
      localStorage.removeItem(opts.storageKey);
    }
  }, [state.session, opts.storageKey]);

  // ================================
  // Effects
  // ================================

  /**
   * Initialize session on mount
   */
  useEffect(() => {
    const init = async () => {
      // Try to restore existing session
      const restored = await restoreSession();
      
      // Auto-create if enabled and no session restored
      if (!restored && opts.autoCreate) {
        await createSession();
      } else if (!restored) {
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Session monitoring interval
   */
  useEffect(() => {
    if (!state.session) return;

    intervalRef.current = setInterval(() => {
      const now = new Date();
      const expiresAt = new Date(state.session!.expiresAt);
      const remainingMs = expiresAt.getTime() - now.getTime();
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      
      // Check inactivity
      const inactiveMinutes = (now.getTime() - lastActivityRef.current.getTime()) / 60000;
      const isInactive = inactiveMinutes > 15; // 15 minutes of inactivity
      
      setState(prev => ({
        ...prev,
        remainingTime: remainingSeconds,
        isExpired: remainingSeconds === 0,
        isInactive
      }));

      // Show warning when approaching expiry
      if (opts.inactivityWarningThreshold) {
        const remainingMinutes = remainingSeconds / 60;
        if (remainingMinutes <= opts.inactivityWarningThreshold && remainingMinutes > opts.inactivityWarningThreshold - 1) {
          // Could trigger a notification here
          console.warn(`Session expiring in ${Math.floor(remainingMinutes)} minutes`);
        }
      }

      // Auto-extend if active
      if (remainingSeconds < 300 && !isInactive) { // Less than 5 minutes
        extendSession();
      }
    }, SESSION_CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.session, opts.inactivityWarningThreshold, extendSession]);

  /**
   * Track page visibility for activity
   */
  useEffect(() => {
    if (!state.session || !opts.trackActivity) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        trackActivity(state.session!.sessionId, 'page_visible');
        lastActivityRef.current = new Date();
      }
    };

    const handleUserActivity = () => {
      lastActivityRef.current = new Date();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('keypress', handleUserActivity);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousemove', handleUserActivity);
      document.removeEventListener('keypress', handleUserActivity);
    };
  }, [state.session, opts.trackActivity, trackActivity]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, []);

  // ================================
  // Computed Values
  // ================================

  const formattedRemainingTime = `${Math.floor(state.remainingTime / 60)}:${String(state.remainingTime % 60).padStart(2, '0')}`;
  
  const sessionStatus = state.session ? {
    isActive: state.session.status === 'active' && !state.isExpired,
    isExpired: state.isExpired,
    isInactive: state.isInactive,
    canExtend: !state.isExpired && state.remainingTime < 600, // Can extend if less than 10 minutes left
    shouldWarn: state.remainingTime < (opts.inactivityWarningThreshold || 5) * 60
  } : null;

  // ================================
  // Return Values
  // ================================

  return {
    // State
    session: state.session,
    loading: state.loading,
    error: state.error,
    remainingTime: state.remainingTime,
    formattedRemainingTime,
    sessionStatus,
    
    // Actions
    createSession,
    restoreSession,
    extendSession,
    clearSession,
    trackActivity: state.session ? (action: string, metadata?: Record<string, any>) => 
      trackActivity(state.session!.sessionId, action, metadata) : undefined,
    
    // Utilities
    getSessionDetails,
    refreshSession: async () => {
      if (state.session) {
        const fresh = await getSessionDetails(state.session.sessionId);
        if (fresh) {
          setState(prev => ({ ...prev, session: fresh }));
        }
        return fresh;
      }
      return null;
    }
  };
}

// ================================
// Export Legacy Hook for Compatibility
// ================================

export { useEnhancedSession as useSession };
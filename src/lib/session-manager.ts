/**
 * Enhanced Session Manager with Activity Tracking and Restoration
 * Provides comprehensive session lifecycle management
 */

import { kv } from '@vercel/kv';
import { SessionData, getSession, updateSession, createSession as createBaseSession } from './session';

// ================================
// Types & Interfaces
// ================================

export interface SessionActivity {
  timestamp: string;
  action: string;
  metadata?: Record<string, any>;
}

export interface ExtendedSessionData extends SessionData {
  lastActivityAt: string;
  activities: SessionActivity[];
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    platform?: string;
  };
  restorationToken?: string;
}

export interface SessionRestoreOptions {
  extendTTL?: boolean;
  mergeData?: boolean;
  validateDevice?: boolean;
}

// ================================
// Constants
// ================================

const ACTIVITY_TRACKING_KEY = (sessionId: string) => `session:activity:${sessionId}`;
const RESTORATION_TOKEN_KEY = (token: string) => `session:restore:${token}`;
const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes
const RESTORATION_TOKEN_TTL = 60 * 60 * 24; // 24 hours

// ================================
// Session Manager Class
// ================================

export class SessionManager {
  /**
   * Create a new session with enhanced tracking
   */
  async createSession(deviceInfo?: ExtendedSessionData['deviceInfo']): Promise<ExtendedSessionData> {
    const baseSession = await createBaseSession();
    
    const extendedSession: ExtendedSessionData = {
      ...baseSession,
      lastActivityAt: baseSession.createdAt,
      activities: [{
        timestamp: baseSession.createdAt,
        action: 'session_created',
        metadata: { deviceInfo }
      }],
      deviceInfo
    };

    // Store extended session data
    await kv.set(
      `session:${baseSession.sessionId}`,
      extendedSession,
      { ex: SESSION_TTL_SECONDS }
    );

    // Initialize activity tracking
    await this.trackActivity(baseSession.sessionId, 'session_started');

    return extendedSession;
  }

  /**
   * Track session activity
   */
  async trackActivity(
    sessionId: string, 
    action: string, 
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const session = await this.getExtendedSession(sessionId);
      if (!session || session.status !== 'active') return;

      const activity: SessionActivity = {
        timestamp: new Date().toISOString(),
        action,
        metadata
      };

      // Update last activity timestamp
      session.lastActivityAt = activity.timestamp;
      session.activities = session.activities || [];
      
      // Keep only last 50 activities to prevent unbounded growth
      if (session.activities.length >= 50) {
        session.activities = session.activities.slice(-49);
      }
      session.activities.push(activity);

      // Refresh TTL on activity
      await kv.set(
        `session:${sessionId}`,
        session,
        { ex: SESSION_TTL_SECONDS }
      );

      // Store activity in separate key for analytics
      const activityKey = ACTIVITY_TRACKING_KEY(sessionId);
      await kv.lpush(activityKey, JSON.stringify(activity));
      await kv.expire(activityKey, SESSION_TTL_SECONDS);

      // Also update the base session to refresh TTL
      await updateSession(sessionId, {});
    } catch (error) {
      console.error('Failed to track activity:', error);
      // Don't throw - activity tracking should not break the app
    }
  }

  /**
   * Get extended session with activity data
   */
  async getExtendedSession(sessionId: string): Promise<ExtendedSessionData | null> {
    try {
      // Try to get extended session first
      const extended = await kv.get<ExtendedSessionData>(`session:${sessionId}`);
      if (extended) return extended;

      // Fallback to base session
      const base = await getSession(sessionId);
      if (!base) return null;

      // Convert to extended format
      return {
        ...base,
        lastActivityAt: base.updatedAt,
        activities: []
      };
    } catch (error) {
      console.error('Failed to get extended session:', error);
      return null;
    }
  }

  /**
   * Generate restoration token for session recovery
   */
  async generateRestorationToken(sessionId: string): Promise<string> {
    const session = await this.getExtendedSession(sessionId);
    if (!session || session.status !== 'active') {
      throw new Error('Cannot generate restoration token for inactive session');
    }

    // Generate secure token
    const token = crypto.randomUUID();
    
    // Store mapping with extended TTL
    await kv.set(
      RESTORATION_TOKEN_KEY(token),
      {
        sessionId,
        createdAt: new Date().toISOString(),
        deviceInfo: session.deviceInfo
      },
      { ex: RESTORATION_TOKEN_TTL }
    );

    // Store token in session
    session.restorationToken = token;
    await kv.set(
      `session:${sessionId}`,
      session,
      { ex: SESSION_TTL_SECONDS }
    );

    return token;
  }

  /**
   * Restore session using restoration token
   */
  async restoreSession(
    token: string, 
    options: SessionRestoreOptions = {}
  ): Promise<ExtendedSessionData | null> {
    try {
      // Get restoration data
      const restorationData = await kv.get<{
        sessionId: string;
        createdAt: string;
        deviceInfo?: ExtendedSessionData['deviceInfo'];
      }>(RESTORATION_TOKEN_KEY(token));

      if (!restorationData) {
        return null; // Invalid or expired token
      }

      const { sessionId } = restorationData;
      const session = await this.getExtendedSession(sessionId);

      if (!session) {
        // Session expired but token is valid - create new session
        const newSession = await this.createSession(restorationData.deviceInfo);
        await this.trackActivity(newSession.sessionId, 'session_restored', {
          originalSessionId: sessionId,
          restorationToken: token
        });
        return newSession;
      }

      // Session exists - restore it
      if (options.extendTTL) {
        // Extend the session TTL
        const updatedSession = await updateSession(sessionId, {});
        if (updatedSession) {
          Object.assign(session, updatedSession);
        }
      }

      // Track restoration
      await this.trackActivity(sessionId, 'session_restored', {
        restorationToken: token,
        extended: options.extendTTL
      });

      // Invalidate the restoration token (single use)
      await kv.del(RESTORATION_TOKEN_KEY(token));

      return session;
    } catch (error) {
      console.error('Failed to restore session:', error);
      return null;
    }
  }

  /**
   * Get session activity history
   */
  async getActivityHistory(sessionId: string, limit: number = 20): Promise<SessionActivity[]> {
    try {
      const activityKey = ACTIVITY_TRACKING_KEY(sessionId);
      const activities = await kv.lrange<string>(activityKey, 0, limit - 1);
      
      return activities
        .map(activity => {
          try {
            return JSON.parse(activity);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as SessionActivity[];
    } catch (error) {
      console.error('Failed to get activity history:', error);
      return [];
    }
  }

  /**
   * Check if session is inactive
   */
  async isSessionInactive(sessionId: string, inactivityThresholdMs: number = 15 * 60 * 1000): Promise<boolean> {
    const session = await this.getExtendedSession(sessionId);
    if (!session || session.status !== 'active') return true;

    const lastActivity = new Date(session.lastActivityAt);
    const now = new Date();
    const inactiveDuration = now.getTime() - lastActivity.getTime();

    return inactiveDuration > inactivityThresholdMs;
  }

  /**
   * Cleanup inactive sessions
   */
  async cleanupInactiveSessions(inactivityThresholdMs: number = 30 * 60 * 1000): Promise<number> {
    let cleanedCount = 0;
    
    try {
      // Get all session keys
      const sessionKeys = await kv.keys('session:*');
      
      for (const key of sessionKeys) {
        // Skip activity and restoration keys
        if (key.includes(':activity:') || key.includes(':restore:')) continue;
        
        const sessionId = key.replace('session:', '');
        const isInactive = await this.isSessionInactive(sessionId, inactivityThresholdMs);
        
        if (isInactive) {
          // Clean up session and related data
          await kv.del(key);
          await kv.del(ACTIVITY_TRACKING_KEY(sessionId));
          cleanedCount++;
        }
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup inactive sessions:', error);
      return cleanedCount;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string): Promise<{
    duration: number;
    activityCount: number;
    lastActivity: string;
    isActive: boolean;
  } | null> {
    const session = await this.getExtendedSession(sessionId);
    if (!session) return null;

    const created = new Date(session.createdAt);
    const now = new Date();
    const duration = now.getTime() - created.getTime();

    return {
      duration,
      activityCount: session.activities?.length || 0,
      lastActivity: session.lastActivityAt,
      isActive: session.status === 'active' && !await this.isSessionInactive(sessionId)
    };
  }
}

// ================================
// Singleton Instance
// ================================

let sessionManagerInstance: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();
  }
  return sessionManagerInstance;
}

// ================================
// Utility Functions
// ================================

/**
 * Track activity for current session (convenience function)
 */
export async function trackSessionActivity(
  sessionId: string,
  action: string,
  metadata?: Record<string, any>
): Promise<void> {
  const manager = getSessionManager();
  await manager.trackActivity(sessionId, action, metadata);
}

/**
 * Auto-track activity decorator for async functions
 */
export function trackActivity(action: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const sessionId = args[0]?.sessionId || args[0];
      
      if (sessionId && typeof sessionId === 'string') {
        await trackSessionActivity(sessionId, `${action}_started`);
      }

      try {
        const result = await originalMethod.apply(this, args);
        
        if (sessionId && typeof sessionId === 'string') {
          await trackSessionActivity(sessionId, `${action}_completed`, {
            success: true
          });
        }
        
        return result;
      } catch (error) {
        if (sessionId && typeof sessionId === 'string') {
          await trackSessionActivity(sessionId, `${action}_failed`, {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        throw error;
      }
    };

    return descriptor;
  };
}
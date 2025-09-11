/**
 * Session Maintenance and Cleanup Utilities
 * Edge Runtime compatible session cleanup and maintenance tools
 */

import { kvGet, kvSet, kvDel } from './kv';
import { getSession, updateSession, deleteSession, getSessionKey } from './session';
import type { SessionData, SessionStatus } from '@/types/api';

// ================================
// Configuration
// ================================

export const CLEANUP_CONFIG = {
  batchSize: 50,              // Process sessions in batches
  maxRetries: 3,              // Retry failed operations
  gracePeriod: 5 * 60 * 1000, // 5 minutes grace period before deletion
  scanTimeout: 30 * 1000,     // 30 seconds timeout for scan operations
} as const;

export const MAINTENANCE_SCHEDULES = {
  cleanup: 15 * 60 * 1000,    // Run cleanup every 15 minutes
  metrics: 5 * 60 * 1000,     // Update metrics every 5 minutes
  health: 60 * 1000,          // Update health metrics every minute
} as const;

// ================================
// Session Discovery & Scanning
// ================================

/**
 * Get session IDs for cleanup (expired sessions)
 * Note: This is a simplified implementation. In production, you'd want
 * to maintain an index of sessions for efficient scanning.
 */
export async function getExpiredSessionIds(): Promise<string[]> {
  // In a real implementation, this would scan KV for session keys
  // For now, return empty array as we don't have a key scanning mechanism
  // You would typically maintain a separate index of active sessions
  return [];
}

/**
 * Get all active session IDs
 * This would typically be backed by an index in production
 */
export async function getActiveSessionIds(): Promise<string[]> {
  // In production, maintain an index like 'sessions:active' with a set of session IDs
  try {
    const activeSessionsKey = 'sessions:active';
    const sessionIds = await kvGet<string[]>(activeSessionsKey) || [];
    return sessionIds;
  } catch (error) {
    console.error('Failed to get active session IDs:', error);
    return [];
  }
}

/**
 * Add session to active sessions index
 */
export async function addToActiveIndex(sessionId: string): Promise<void> {
  try {
    const activeSessionsKey = 'sessions:active';
    const sessionIds = await kvGet<string[]>(activeSessionsKey) || [];
    
    if (!sessionIds.includes(sessionId)) {
      sessionIds.push(sessionId);
      await kvSet(activeSessionsKey, sessionIds, 24 * 60 * 60); // 24 hour TTL
    }
  } catch (error) {
    console.error('Failed to add session to active index:', error);
  }
}

/**
 * Remove session from active sessions index
 */
export async function removeFromActiveIndex(sessionId: string): Promise<void> {
  try {
    const activeSessionsKey = 'sessions:active';
    const sessionIds = await kvGet<string[]>(activeSessionsKey) || [];
    
    const updatedIds = sessionIds.filter(id => id !== sessionId);
    await kvSet(activeSessionsKey, updatedIds, 24 * 60 * 60); // 24 hour TTL
  } catch (error) {
    console.error('Failed to remove session from active index:', error);
  }
}

// ================================
// Session Cleanup Operations
// ================================

/**
 * Clean up a single expired session
 */
export async function cleanupSession(sessionId: string): Promise<{
  success: boolean;
  error?: string;
  actions: string[];
}> {
  const actions: string[] = [];
  
  try {
    // Get session data
    const session = await getSession(sessionId);
    if (!session) {
      return {
        success: true,
        actions: ['session_not_found'],
      };
    }

    // Check if session is actually expired
    const now = Date.now();
    const expiresAt = Date.parse(session.expiresAt);
    const gracePeriodExpired = now > (expiresAt + CLEANUP_CONFIG.gracePeriod);

    if (!gracePeriodExpired) {
      return {
        success: true,
        actions: ['session_not_expired'],
      };
    }

    // Mark session as cleanup status first
    await updateSession(sessionId, { status: 'cleanup' });
    actions.push('marked_for_cleanup');

    // TODO: Clean up associated files from blob storage
    // This would iterate through userPhotos and garmentPhotos arrays
    // and delete each file from blob storage
    const filesToClean = [...session.userPhotos, ...session.garmentPhotos];
    if (filesToClean.length > 0) {
      actions.push(`queued_${filesToClean.length}_files_for_deletion`);
      // In production: await cleanupSessionFiles(filesToClean);
    }

    // Delete the session
    const deleted = await deleteSession(sessionId);
    if (deleted) {
      actions.push('session_deleted');
      await removeFromActiveIndex(sessionId);
      actions.push('removed_from_index');
    } else {
      throw new Error('Failed to delete session');
    }

    return {
      success: true,
      actions,
    };

  } catch (error) {
    console.error(`Session cleanup failed for ${sessionId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      actions,
    };
  }
}

/**
 * Clean up multiple sessions in batches
 */
export async function cleanupExpiredSessions(): Promise<{
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
  duration: number;
}> {
  const startTime = Date.now();
  const errors: string[] = [];
  let processed = 0;
  let successful = 0;
  let failed = 0;

  try {
    // Get expired session IDs
    const expiredSessionIds = await getExpiredSessionIds();
    
    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < expiredSessionIds.length; i += CLEANUP_CONFIG.batchSize) {
      const batch = expiredSessionIds.slice(i, i + CLEANUP_CONFIG.batchSize);
      
      // Process batch with Promise.allSettled to handle partial failures
      const results = await Promise.allSettled(
        batch.map(sessionId => cleanupSession(sessionId))
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        processed++;

        if (result.status === 'fulfilled') {
          if (result.value.success) {
            successful++;
          } else {
            failed++;
            errors.push(`${batch[j]}: ${result.value.error}`);
          }
        } else {
          failed++;
          errors.push(`${batch[j]}: ${result.reason}`);
        }
      }

      // Small delay between batches to avoid overwhelming the system
      if (i + CLEANUP_CONFIG.batchSize < expiredSessionIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      processed,
      successful,
      failed,
      errors,
      duration: Date.now() - startTime,
    };

  } catch (error) {
    console.error('Bulk cleanup failed:', error);
    return {
      processed,
      successful,
      failed,
      errors: [...errors, `Bulk cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      duration: Date.now() - startTime,
    };
  }
}

// ================================
// Session Health & Metrics
// ================================

/**
 * Collect session metrics for monitoring
 */
export async function collectSessionMetrics(): Promise<{
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  statusBreakdown: Record<SessionStatus, number>;
  averageSessionAge: number;
  oldestSession?: {
    id: string;
    age: number;
  };
}> {
  try {
    const activeSessionIds = await getActiveSessionIds();
    const now = Date.now();
    
    let totalSessions = 0;
    let activeSessions = 0;
    let expiredSessions = 0;
    const statusBreakdown: Record<SessionStatus, number> = {
      active: 0,
      expired: 0,
      deleted: 0,
      cleanup: 0,
    };
    const sessionAges: number[] = [];
    let oldestSession: { id: string; age: number } | undefined;

    // Sample a subset of sessions for metrics (to avoid performance issues)
    const sampleSize = Math.min(activeSessionIds.length, 100);
    const sampleIds = activeSessionIds.slice(0, sampleSize);

    for (const sessionId of sampleIds) {
      try {
        const session = await getSession(sessionId);
        if (!session) continue;

        totalSessions++;
        
        const age = now - Date.parse(session.createdAt);
        sessionAges.push(age);

        if (!oldestSession || age > oldestSession.age) {
          oldestSession = { id: sessionId, age };
        }

        const isExpired = now >= Date.parse(session.expiresAt);
        if (isExpired) {
          expiredSessions++;
          statusBreakdown.expired++;
        } else {
          activeSessions++;
          statusBreakdown[session.status]++;
        }

      } catch (error) {
        console.warn(`Failed to get session metrics for ${sessionId}:`, error);
      }
    }

    const averageSessionAge = sessionAges.length > 0 
      ? sessionAges.reduce((sum, age) => sum + age, 0) / sessionAges.length 
      : 0;

    return {
      totalSessions,
      activeSessions,
      expiredSessions,
      statusBreakdown,
      averageSessionAge,
      oldestSession,
    };

  } catch (error) {
    console.error('Failed to collect session metrics:', error);
    return {
      totalSessions: 0,
      activeSessions: 0,
      expiredSessions: 0,
      statusBreakdown: { active: 0, expired: 0, deleted: 0, cleanup: 0 },
      averageSessionAge: 0,
    };
  }
}

/**
 * Update system metrics in KV store
 */
export async function updateSystemMetrics(
  additionalMetrics?: Record<string, any>
): Promise<void> {
  try {
    const sessionMetrics = await collectSessionMetrics();
    const metricsKey = 'metrics:system';
    
    const currentMetrics = await kvGet<any>(metricsKey) || {};
    
    const updatedMetrics = {
      ...currentMetrics,
      ...additionalMetrics,
      ...sessionMetrics,
      lastUpdated: new Date().toISOString(),
      lastMaintenanceRun: new Date().toISOString(),
    };

    // Store with 1 hour TTL
    await kvSet(metricsKey, updatedMetrics, 3600);

  } catch (error) {
    console.error('Failed to update system metrics:', error);
  }
}

// ================================
// Maintenance Scheduling
// ================================

/**
 * Check if maintenance should run based on last run time
 */
export async function shouldRunMaintenance(
  type: 'cleanup' | 'metrics' | 'health'
): Promise<boolean> {
  try {
    const lastRunKey = `maintenance:last_run:${type}`;
    const lastRun = await kvGet<string>(lastRunKey);
    
    if (!lastRun) return true;
    
    const lastRunTime = Date.parse(lastRun);
    const now = Date.now();
    const interval = MAINTENANCE_SCHEDULES[type];
    
    return (now - lastRunTime) >= interval;

  } catch (error) {
    console.error(`Failed to check maintenance schedule for ${type}:`, error);
    return false; // Conservative: don't run if we can't determine
  }
}

/**
 * Record maintenance run time
 */
export async function recordMaintenanceRun(
  type: 'cleanup' | 'metrics' | 'health'
): Promise<void> {
  try {
    const lastRunKey = `maintenance:last_run:${type}`;
    const now = new Date().toISOString();
    
    // Store with longer TTL than the maintenance interval
    const ttl = Math.ceil(MAINTENANCE_SCHEDULES[type] / 1000) * 2;
    await kvSet(lastRunKey, now, ttl);

  } catch (error) {
    console.error(`Failed to record maintenance run for ${type}:`, error);
  }
}

// ================================
// Maintenance Runner
// ================================

/**
 * Run all scheduled maintenance tasks
 */
export async function runScheduledMaintenance(): Promise<{
  ran: string[];
  skipped: string[];
  results: Record<string, any>;
  errors: string[];
}> {
  const ran: string[] = [];
  const skipped: string[] = [];
  const results: Record<string, any> = {};
  const errors: string[] = [];

  try {
    // Check and run cleanup
    if (await shouldRunMaintenance('cleanup')) {
      try {
        const cleanupResult = await cleanupExpiredSessions();
        results.cleanup = cleanupResult;
        ran.push('cleanup');
        await recordMaintenanceRun('cleanup');
      } catch (error) {
        errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      skipped.push('cleanup');
    }

    // Check and run metrics update
    if (await shouldRunMaintenance('metrics')) {
      try {
        await updateSystemMetrics();
        results.metrics = { updated: true };
        ran.push('metrics');
        await recordMaintenanceRun('metrics');
      } catch (error) {
        errors.push(`Metrics update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      skipped.push('metrics');
    }

    // Health metrics are updated as part of regular health checks
    // so we don't need a separate maintenance task for them

    return {
      ran,
      skipped,
      results,
      errors,
    };

  } catch (error) {
    console.error('Scheduled maintenance failed:', error);
    return {
      ran,
      skipped,
      results,
      errors: [...errors, `Maintenance runner failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

// ================================
// Utility Functions
// ================================

/**
 * Force expire a session (for admin use)
 */
export async function forceExpireSession(sessionId: string): Promise<boolean> {
  try {
    const session = await getSession(sessionId);
    if (!session) return false;

    const expiredSession = await updateSession(sessionId, {
      status: 'expired',
      // Set expiry to now minus 1 minute to ensure it's expired
    });

    return expiredSession !== null;

  } catch (error) {
    console.error(`Failed to force expire session ${sessionId}:`, error);
    return false;
  }
}

/**
 * Extend session TTL (for admin use)
 */
export async function extendSessionTTL(
  sessionId: string, 
  additionalMinutes: number
): Promise<boolean> {
  try {
    const session = await getSession(sessionId);
    if (!session) return false;

    const currentExpiry = Date.parse(session.expiresAt);
    const newExpiry = new Date(currentExpiry + (additionalMinutes * 60 * 1000));

    const updatedSession = await updateSession(sessionId, {
      status: 'active', // Ensure it's active
    });

    return updatedSession !== null;

  } catch (error) {
    console.error(`Failed to extend session TTL for ${sessionId}:`, error);
    return false;
  }
}

export default {
  cleanupSession,
  cleanupExpiredSessions,
  collectSessionMetrics,
  updateSystemMetrics,
  runScheduledMaintenance,
  forceExpireSession,
  extendSessionTTL,
  addToActiveIndex,
  removeFromActiveIndex,
};
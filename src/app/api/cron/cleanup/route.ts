/**
 * Cron Job Handler for Automatic Blob Cleanup
 * Runs periodically to clean up expired blobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredBlobs } from '@/lib/blob-storage';
import { kv } from '@vercel/kv';
import { headers } from 'next/headers';

export const runtime = 'edge';

// Vercel Cron Job secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/cleanup
 * Triggered by Vercel Cron to clean up expired blobs
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = headers().get('authorization');
    
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      console.error('Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Also check for Vercel's cron header
    const cronHeader = headers().get('x-vercel-cron');
    if (!cronHeader && process.env.NODE_ENV === 'production') {
      console.error('Missing x-vercel-cron header in production');
      return NextResponse.json(
        { error: 'Invalid request source' },
        { status: 403 }
      );
    }

    const startTime = Date.now();
    console.log('Starting blob cleanup job...');

    // Run cleanup
    const deletedCount = await cleanupExpiredBlobs();

    // Clean up expired sessions
    const sessionCleanupCount = await cleanupExpiredSessions();

    // Log metrics
    const duration = Date.now() - startTime;
    const metrics = {
      deletedBlobs: deletedCount,
      deletedSessions: sessionCleanupCount,
      duration,
      timestamp: new Date().toISOString()
    };

    console.log('Cleanup job completed:', metrics);

    // Store metrics in KV for monitoring
    await storeCleanupMetrics(metrics);

    return NextResponse.json({
      success: true,
      ...metrics
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Cleanup-Duration': String(duration),
        'X-Deleted-Count': String(deletedCount)
      }
    });

  } catch (error) {
    console.error('Cleanup job failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
}

/**
 * Clean up expired sessions
 */
async function cleanupExpiredSessions(): Promise<number> {
  let cleanedCount = 0;
  
  try {
    // Get all session keys
    const sessionKeys = await kv.keys('session:*');
    const now = Date.now();
    
    for (const key of sessionKeys) {
      // Skip non-session data keys
      if (key.includes(':blobs') || key.includes(':metadata')) {
        continue;
      }
      
      const session = await kv.get(key);
      if (session && typeof session === 'object' && 'expiresAt' in session) {
        const expiresAt = new Date(session.expiresAt as string).getTime();
        
        if (expiresAt <= now) {
          // Delete expired session
          await kv.del(key);
          cleanedCount++;
          
          // Also delete related keys
          const sessionId = key.replace('session:', '');
          await kv.del(`session:${sessionId}:blobs`);
          await kv.del(`session:${sessionId}:metadata`);
          await kv.del(`ratelimit:upload:${sessionId}`);
          await kv.del(`ratelimit:api:${sessionId}`);
        }
      }
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Session cleanup failed:', error);
    return cleanedCount;
  }
}

/**
 * Store cleanup metrics for monitoring
 */
async function storeCleanupMetrics(metrics: {
  deletedBlobs: number;
  deletedSessions: number;
  duration: number;
  timestamp: string;
}): Promise<void> {
  try {
    // Store latest metrics
    await kv.set('metrics:cleanup:latest', metrics);
    
    // Store in time series (keep last 30 days)
    const dateKey = new Date().toISOString().split('T')[0];
    const timeSeriesKey = `metrics:cleanup:${dateKey}`;
    
    // Get existing metrics for today
    const existing = await kv.get(timeSeriesKey) as any[] || [];
    existing.push(metrics);
    
    await kv.set(timeSeriesKey, existing, {
      ex: 30 * 24 * 60 * 60 // 30 days
    });
    
    // Update aggregate metrics
    const aggregateKey = 'metrics:cleanup:aggregate';
    const aggregate = await kv.get(aggregateKey) as any || {
      totalDeleted: 0,
      totalSessions: 0,
      totalRuns: 0,
      averageDuration: 0
    };
    
    aggregate.totalDeleted += metrics.deletedBlobs;
    aggregate.totalSessions += metrics.deletedSessions;
    aggregate.totalRuns += 1;
    aggregate.averageDuration = 
      (aggregate.averageDuration * (aggregate.totalRuns - 1) + metrics.duration) / aggregate.totalRuns;
    aggregate.lastRun = metrics.timestamp;
    
    await kv.set(aggregateKey, aggregate);
    
  } catch (error) {
    console.error('Failed to store cleanup metrics:', error);
    // Don't throw - metrics are not critical
  }
}

/**
 * POST /api/cron/cleanup
 * Manual trigger for cleanup (requires authentication)
 */
export async function POST(request: NextRequest) {
  try {
    // Check for API key or admin authentication
    const authHeader = headers().get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;
    
    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request for options
    const body = await request.json().catch(() => ({}));
    const { 
      cleanupBlobs = true, 
      cleanupSessions = true,
      dryRun = false 
    } = body;
    
    const startTime = Date.now();
    const results = {
      deletedBlobs: 0,
      deletedSessions: 0,
      dryRun,
      timestamp: new Date().toISOString()
    };
    
    if (!dryRun) {
      if (cleanupBlobs) {
        results.deletedBlobs = await cleanupExpiredBlobs();
      }
      
      if (cleanupSessions) {
        results.deletedSessions = await cleanupExpiredSessions();
      }
    } else {
      // Dry run - just count what would be deleted
      const blobKeys = await kv.keys('blob:cleanup:*');
      const sessionKeys = await kv.keys('session:*');
      
      results.deletedBlobs = blobKeys.length;
      results.deletedSessions = sessionKeys.filter(k => !k.includes(':')).length;
    }
    
    const duration = Date.now() - startTime;
    
    if (!dryRun) {
      await storeCleanupMetrics({
        ...results,
        duration
      });
    }
    
    return NextResponse.json({
      success: true,
      ...results,
      duration
    });
    
  } catch (error) {
    console.error('Manual cleanup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    });
  }
}

/**
 * GET /api/cron/cleanup/metrics
 * Get cleanup metrics
 */
export async function getMetrics() {
  try {
    const latest = await kv.get('metrics:cleanup:latest');
    const aggregate = await kv.get('metrics:cleanup:aggregate');
    
    // Get today's runs
    const dateKey = new Date().toISOString().split('T')[0];
    const todayRuns = await kv.get(`metrics:cleanup:${dateKey}`) || [];
    
    return {
      latest,
      aggregate,
      todayRuns,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to get cleanup metrics:', error);
    return null;
  }
}
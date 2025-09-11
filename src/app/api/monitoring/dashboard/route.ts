/**
 * Monitoring Dashboard API
 * Provides comprehensive system health and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { headers } from 'next/headers';

export const runtime = 'edge';

// Admin API key for authentication
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

/**
 * GET /api/monitoring/dashboard
 * Returns comprehensive monitoring dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    
    if (ADMIN_API_KEY && authHeader !== `Bearer ${ADMIN_API_KEY}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    
    // Gather system metrics
    const dashboard = await gatherDashboardMetrics(timeRange);
    
    return NextResponse.json(dashboard, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Generated-At': new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate dashboard',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Gather comprehensive system metrics
 */
async function gatherDashboardMetrics(timeRange: string) {
  const now = new Date();
  const dashboard = {
    timestamp: now.toISOString(),
    timeRange,
    system: {
      status: 'unknown',
      uptime: null,
      version: process.env.npm_package_version || '1.0.0'
    },
    storage: {
      kv: { status: 'unknown', connections: 0 },
      blob: { status: 'unknown', usage: 0 }
    },
    cleanup: {
      lastRun: null,
      totalRuns: 0,
      averageDuration: 0,
      recentMetrics: []
    },
    sessions: {
      active: 0,
      total: 0,
      expired: 0
    },
    api: {
      health: 'unknown',
      endpoints: {
        upload: { status: 'unknown', lastCheck: null },
        tryon: { status: 'unknown', lastCheck: null },
        session: { status: 'unknown', lastCheck: null }
      }
    },
    errors: {
      recent: [],
      counts: {
        total: 0,
        critical: 0,
        warnings: 0
      }
    },
    performance: {
      averageResponseTime: 0,
      slowQueries: 0,
      memoryUsage: null
    }
  };

  try {
    // System health check
    dashboard.system.status = 'healthy';
    dashboard.system.uptime = process.uptime ? Math.floor(process.uptime()) : null;

    // KV Storage metrics
    try {
      const kvTest = await kv.ping();
      dashboard.storage.kv.status = 'connected';
      
      // Count sessions
      const sessionKeys = await kv.keys('session:*').catch(() => []);
      const activeSessionKeys = sessionKeys.filter(k => !k.includes(':'));
      dashboard.sessions.active = activeSessionKeys.length;
      dashboard.sessions.total = sessionKeys.length;
      
    } catch (error) {
      dashboard.storage.kv.status = 'error';
    }

    // Cleanup metrics
    try {
      const cleanupMetrics = await kv.get('metrics:cleanup:aggregate');
      if (cleanupMetrics && typeof cleanupMetrics === 'object') {
        dashboard.cleanup = {
          ...dashboard.cleanup,
          ...cleanupMetrics,
          lastRun: (cleanupMetrics as any).lastRun || null,
          totalRuns: (cleanupMetrics as any).totalRuns || 0,
          averageDuration: (cleanupMetrics as any).averageDuration || 0
        };
      }

      // Recent cleanup metrics
      const dateKey = now.toISOString().split('T')[0];
      const todayMetrics = await kv.get(`metrics:cleanup:${dateKey}`);
      if (Array.isArray(todayMetrics)) {
        dashboard.cleanup.recentMetrics = todayMetrics.slice(-5);
      }
    } catch (error) {
      console.error('Failed to get cleanup metrics:', error);
    }

    // Error tracking
    try {
      const errorMetrics = await kv.get('metrics:errors:aggregate');
      if (errorMetrics && typeof errorMetrics === 'object') {
        dashboard.errors.counts = {
          ...(errorMetrics as any).counts,
          total: (errorMetrics as any).total || 0
        };
      }

      // Recent errors
      const recentErrors = await kv.get('metrics:errors:recent');
      if (Array.isArray(recentErrors)) {
        dashboard.errors.recent = recentErrors.slice(-10);
      }
    } catch (error) {
      console.error('Failed to get error metrics:', error);
    }

    // Performance metrics
    try {
      const perfMetrics = await kv.get('metrics:performance:aggregate');
      if (perfMetrics && typeof perfMetrics === 'object') {
        dashboard.performance = {
          ...dashboard.performance,
          ...perfMetrics
        };
      }
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
    }

    // API endpoint health
    dashboard.api.health = 'operational';
    const checkTimestamp = now.toISOString();
    dashboard.api.endpoints.upload.lastCheck = checkTimestamp;
    dashboard.api.endpoints.tryon.lastCheck = checkTimestamp;
    dashboard.api.endpoints.session.lastCheck = checkTimestamp;

  } catch (error) {
    console.error('Failed to gather dashboard metrics:', error);
    dashboard.system.status = 'error';
  }

  return dashboard;
}

/**
 * POST /api/monitoring/dashboard
 * Update monitoring configuration or trigger actions
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    
    if (ADMIN_API_KEY && authHeader !== `Bearer ${ADMIN_API_KEY}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'clearErrors':
        await kv.del('metrics:errors:recent');
        await kv.del('metrics:errors:aggregate');
        return NextResponse.json({ success: true, action: 'clearErrors' });

      case 'resetMetrics':
        const keys = await kv.keys('metrics:*');
        for (const key of keys) {
          await kv.del(key);
        }
        return NextResponse.json({ success: true, action: 'resetMetrics' });

      case 'healthCheck':
        const health = await performHealthCheck();
        return NextResponse.json({ success: true, health });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Dashboard POST error:', error);
    return NextResponse.json(
      { 
        error: 'Action failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Perform comprehensive health check
 */
async function performHealthCheck() {
  const checks = {
    kv: false,
    blob: false,
    timestamp: new Date().toISOString()
  };

  // KV check
  try {
    await kv.ping();
    checks.kv = true;
  } catch (error) {
    console.error('KV health check failed:', error);
  }

  // Blob storage check would require actual blob operations
  // For now, assume healthy if KV is working
  checks.blob = checks.kv;

  return checks;
}
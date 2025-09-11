/**
 * Error Tracking API
 * Collects and manages application errors
 */

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { headers } from 'next/headers';
import { z } from 'zod';

export const runtime = 'edge';

// Error report schema
const errorReportSchema = z.object({
  level: z.enum(['error', 'warning', 'info']),
  message: z.string().min(1),
  stack: z.string().optional(),
  context: z.object({
    url: z.string().optional(),
    userAgent: z.string().optional(),
    sessionId: z.string().optional(),
    userId: z.string().optional(),
    endpoint: z.string().optional(),
    method: z.string().optional(),
    statusCode: z.number().optional()
  }).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

/**
 * POST /api/monitoring/errors
 * Report an error to the tracking system
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const errorReport = errorReportSchema.parse(body);
    
    // Add tracking metadata
    const headersList = await headers();
    const error = {
      id: generateErrorId(),
      timestamp: new Date().toISOString(),
      ...errorReport,
      context: {
        ...errorReport.context,
        ip: headersList.get('x-forwarded-for') || 'unknown',
        userAgent: errorReport.context?.userAgent || headersList.get('user-agent') || 'unknown'
      }
    };

    // Store error
    await storeError(error);
    
    return NextResponse.json({
      success: true,
      errorId: error.id,
      timestamp: error.timestamp
    });

  } catch (error) {
    console.error('Error tracking failed:', error);
    
    // Don't fail the original request if error tracking fails
    return NextResponse.json(
      { 
        success: false,
        error: 'Error tracking failed'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/monitoring/errors
 * Retrieve error reports (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
    
    if (ADMIN_API_KEY && authHeader !== `Bearer ${ADMIN_API_KEY}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const limit = parseInt(searchParams.get('limit') || '50');
    const since = searchParams.get('since'); // ISO string
    
    const errors = await getErrors({ level, limit, since });
    const summary = await getErrorSummary();
    
    return NextResponse.json({
      errors,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error retrieval failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve errors'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/monitoring/errors
 * Clear error logs (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authentication check
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
    
    if (ADMIN_API_KEY && authHeader !== `Bearer ${ADMIN_API_KEY}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const olderThan = searchParams.get('olderThan'); // ISO string
    
    const deletedCount = await clearErrors(olderThan);
    
    return NextResponse.json({
      success: true,
      deletedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error clearing failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clear errors'
      },
      { status: 500 }
    );
  }
}

/**
 * Store error in KV with proper indexing
 */
async function storeError(error: any) {
  const errorKey = `error:${error.timestamp}:${error.id}`;
  
  // Store individual error
  await kv.set(errorKey, error, {
    ex: 7 * 24 * 60 * 60 // Keep for 7 days
  });
  
  // Add to recent errors list (keep last 100)
  const recentKey = 'metrics:errors:recent';
  const recent = await kv.get(recentKey) as any[] || [];
  recent.unshift(error);
  
  // Keep only last 100 errors
  const trimmed = recent.slice(0, 100);
  await kv.set(recentKey, trimmed, {
    ex: 7 * 24 * 60 * 60
  });
  
  // Update aggregate metrics
  await updateErrorMetrics(error);
  
  // Check for critical errors and alert
  if (error.level === 'error') {
    await checkErrorThresholds();
  }
}

/**
 * Update error aggregation metrics
 */
async function updateErrorMetrics(error: any) {
  const aggregateKey = 'metrics:errors:aggregate';
  const aggregate = await kv.get(aggregateKey) as any || {
    counts: { total: 0, error: 0, warning: 0, info: 0 },
    lastError: null,
    endpoints: {},
    hourly: {}
  };
  
  // Update counts
  aggregate.counts.total += 1;
  aggregate.counts[error.level] = (aggregate.counts[error.level] || 0) + 1;
  aggregate.lastError = error.timestamp;
  
  // Track by endpoint
  if (error.context?.endpoint) {
    const endpoint = error.context.endpoint;
    aggregate.endpoints[endpoint] = (aggregate.endpoints[endpoint] || 0) + 1;
  }
  
  // Track by hour
  const hour = error.timestamp.substring(0, 13); // YYYY-MM-DDTHH
  aggregate.hourly[hour] = (aggregate.hourly[hour] || 0) + 1;
  
  // Keep only last 24 hours of hourly data
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().substring(0, 13);
  Object.keys(aggregate.hourly).forEach(key => {
    if (key < cutoff) {
      delete aggregate.hourly[key];
    }
  });
  
  await kv.set(aggregateKey, aggregate, {
    ex: 7 * 24 * 60 * 60
  });
}

/**
 * Check error thresholds and trigger alerts
 */
async function checkErrorThresholds() {
  const aggregate = await kv.get('metrics:errors:aggregate') as any;
  if (!aggregate) return;
  
  // Check if error rate is too high
  const recentHours = Object.values(aggregate.hourly || {}) as number[];
  const lastHourErrors = recentHours[recentHours.length - 1] || 0;
  
  // Alert if more than 10 errors in the last hour
  if (lastHourErrors > 10) {
    await storeAlert({
      level: 'critical',
      message: `High error rate: ${lastHourErrors} errors in the last hour`,
      timestamp: new Date().toISOString(),
      context: { errorRate: lastHourErrors }
    });
  }
}

/**
 * Store an alert
 */
async function storeAlert(alert: any) {
  const alertKey = `alert:${alert.timestamp}:${Math.random().toString(36).substring(2, 8)}`;
  await kv.set(alertKey, alert, {
    ex: 24 * 60 * 60 // Keep for 24 hours
  });
  
  // Add to alerts list
  const recentAlertsKey = 'metrics:alerts:recent';
  const alerts = await kv.get(recentAlertsKey) as any[] || [];
  alerts.unshift(alert);
  
  // Keep only last 50 alerts
  await kv.set(recentAlertsKey, alerts.slice(0, 50), {
    ex: 24 * 60 * 60
  });
  
  console.error('ALERT:', alert.message, alert.context);
}

/**
 * Get errors with filtering
 */
async function getErrors(options: {
  level?: string | null;
  limit?: number;
  since?: string | null;
}) {
  const recent = await kv.get('metrics:errors:recent') as any[] || [];
  
  let filtered = recent;
  
  // Filter by level
  if (options.level) {
    filtered = filtered.filter(error => error.level === options.level);
  }
  
  // Filter by time
  if (options.since) {
    const sinceTime = new Date(options.since).getTime();
    filtered = filtered.filter(error => new Date(error.timestamp).getTime() >= sinceTime);
  }
  
  // Limit results
  return filtered.slice(0, options.limit || 50);
}

/**
 * Get error summary statistics
 */
async function getErrorSummary() {
  const aggregate = await kv.get('metrics:errors:aggregate');
  const alerts = await kv.get('metrics:alerts:recent') as any[] || [];
  
  return {
    aggregate: aggregate || { counts: { total: 0, error: 0, warning: 0, info: 0 } },
    recentAlerts: alerts.slice(0, 5),
    alertCount: alerts.length
  };
}

/**
 * Clear errors older than specified time
 */
async function clearErrors(olderThan?: string | null): Promise<number> {
  const recent = await kv.get('metrics:errors:recent') as any[] || [];
  
  if (olderThan) {
    const cutoffTime = new Date(olderThan).getTime();
    const filtered = recent.filter(error => new Date(error.timestamp).getTime() >= cutoffTime);
    
    await kv.set('metrics:errors:recent', filtered, {
      ex: 7 * 24 * 60 * 60
    });
    
    return recent.length - filtered.length;
  } else {
    // Clear all
    await kv.del('metrics:errors:recent');
    await kv.del('metrics:errors:aggregate');
    await kv.del('metrics:alerts:recent');
    
    return recent.length;
  }
}

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}
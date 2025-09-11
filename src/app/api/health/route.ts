/**
 * Comprehensive Health Check API
 * System status monitoring with detailed service checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { kvGet, kvSet } from '@/lib/kv';
import { rateLimiters, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';
import { withErrorHandler } from '@/lib/error-handler';
import { successResponse, errorResponse } from '@/lib/response';
import type { HealthStatus, HealthResponse } from '@/types/api';

export const runtime = 'edge';

// ================================
// Constants & Configuration
// ================================

const HEALTH_CHECK_VERSION = '1.0.0';
const HEALTH_CACHE_KEY = 'health:status';
const HEALTH_CACHE_TTL = 30; // 30 seconds
const SERVICE_TIMEOUT = 5000; // 5 seconds
const STARTUP_TIME = Date.now();

// ================================
// Utility Functions
// ================================

function getRequestContext(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent');
  
  return {
    ip,
    userAgent,
    requestId: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  };
}

async function checkRateLimit(request: NextRequest) {
  const context = getRequestContext(request);
  const identifier = getClientIdentifier(context.ip);
  
  const limiter = rateLimiters.api;
  const result = await limiter.checkLimit(identifier);
  
  return {
    allowed: result.allowed,
    headers: getRateLimitHeaders(result.info),
    info: result.info
  };
}

// ================================
// Service Health Checkers
// ================================

async function checkDatabaseHealth(): Promise<'connected' | 'disconnected' | 'error'> {
  try {
    // Test KV connection by trying to get/set a test value
    const testKey = 'health:db:test';
    const testValue = Date.now().toString();
    
    await kvSet(testKey, testValue, 10); // 10 second TTL
    const retrieved = await kvGet<string>(testKey);
    
    if (retrieved === testValue) {
      return 'connected';
    } else {
      return 'error';
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    return 'error';
  }
}

async function checkStorageHealth(): Promise<'connected' | 'disconnected' | 'error'> {
  try {
    // Check if blob storage token is configured
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return 'disconnected';
    }
    
    // Could add actual blob storage connectivity test here
    // For now, just check if credentials are present
    return 'connected';
  } catch (error) {
    console.error('Storage health check failed:', error);
    return 'error';
  }
}

async function checkAIHealth(): Promise<'connected' | 'disconnected' | 'error'> {
  try {
    // Check if AI API key is configured
    const aiKey = process.env.GOOGLE_AI_API_KEY;
    if (!aiKey) {
      return 'disconnected';
    }
    
    // Could add actual AI service connectivity test here
    // For now, just check if credentials are present
    return 'connected';
  } catch (error) {
    console.error('AI health check failed:', error);
    return 'error';
  }
}

async function checkCacheHealth(): Promise<'connected' | 'disconnected' | 'error'> {
  try {
    // Test cache by trying to set/get a value
    // Using same KV for caching, so this is similar to database check
    const testKey = 'health:cache:test';
    const testValue = { timestamp: Date.now(), test: true };
    
    await kvSet(testKey, testValue, 5); // 5 second TTL
    const retrieved = await kvGet<typeof testValue>(testKey);
    
    if (retrieved && retrieved.timestamp === testValue.timestamp) {
      return 'connected';
    } else {
      return 'error';
    }
  } catch (error) {
    console.error('Cache health check failed:', error);
    return 'error';
  }
}

// ================================
// Metrics Collection
// ================================

async function collectSystemMetrics() {
  try {
    // Get basic metrics from KV
    const metricsKey = 'metrics:system';
    const metrics = await kvGet<any>(metricsKey) || {
      totalSessions: 0,
      activeSessions: 0,
      totalUploads: 0,
      totalTryOns: 0,
      errorCount: 0,
      requestCount: 0
    };

    // Calculate derived metrics
    const uptime = Math.floor((Date.now() - STARTUP_TIME) / 1000);
    const errorRate = metrics.requestCount > 0 
      ? (metrics.errorCount / metrics.requestCount) * 100 
      : 0;

    return {
      totalSessions: metrics.totalSessions || 0,
      activeSessions: metrics.activeSessions || 0,
      totalUploads: metrics.totalUploads || 0,
      totalTryOns: metrics.totalTryOns || 0,
      averageResponseTime: metrics.averageResponseTime || 0,
      errorRate: Math.round(errorRate * 100) / 100,
      uptime,
      requestCount: metrics.requestCount || 0,
      errorCount: metrics.errorCount || 0
    };
  } catch (error) {
    console.error('Failed to collect metrics:', error);
    return {
      totalSessions: 0,
      activeSessions: 0,
      totalUploads: 0,
      totalTryOns: 0,
      averageResponseTime: 0,
      errorRate: 0,
      uptime: Math.floor((Date.now() - STARTUP_TIME) / 1000),
      requestCount: 0,
      errorCount: 0
    };
  }
}

// ================================
// Health Status Aggregation
// ================================

async function getHealthStatus(): Promise<HealthStatus> {
  const timestamp = new Date().toISOString();
  const uptime = Math.floor((Date.now() - STARTUP_TIME) / 1000);

  try {
    // Run all health checks in parallel with timeout
    const healthChecks = await Promise.allSettled([
      Promise.race([
        checkDatabaseHealth(),
        new Promise<'error'>((_, reject) => 
          setTimeout(() => reject(new Error('Database check timeout')), SERVICE_TIMEOUT)
        )
      ]),
      Promise.race([
        checkStorageHealth(),
        new Promise<'error'>((_, reject) => 
          setTimeout(() => reject(new Error('Storage check timeout')), SERVICE_TIMEOUT)
        )
      ]),
      Promise.race([
        checkAIHealth(),
        new Promise<'error'>((_, reject) => 
          setTimeout(() => reject(new Error('AI check timeout')), SERVICE_TIMEOUT)
        )
      ]),
      Promise.race([
        checkCacheHealth(),
        new Promise<'error'>((_, reject) => 
          setTimeout(() => reject(new Error('Cache check timeout')), SERVICE_TIMEOUT)
        )
      ])
    ]);

    const [databaseResult, storageResult, aiResult, cacheResult] = healthChecks;

    const services = {
      database: databaseResult.status === 'fulfilled' ? databaseResult.value : 'error',
      storage: storageResult.status === 'fulfilled' ? storageResult.value : 'error',
      ai: aiResult.status === 'fulfilled' ? aiResult.value : 'error',
      cache: cacheResult.status === 'fulfilled' ? cacheResult.value : 'error'
    };

    // Collect metrics
    const metrics = await collectSystemMetrics();

    // Determine overall status
    const serviceStatuses = Object.values(services);
    const hasErrors = serviceStatuses.includes('error');
    const hasDisconnected = serviceStatuses.includes('disconnected');
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (hasErrors) {
      overallStatus = 'unhealthy';
    } else if (hasDisconnected) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    return {
      status: overallStatus,
      timestamp,
      version: HEALTH_CHECK_VERSION,
      uptime,
      services,
      metrics
    };

  } catch (error) {
    console.error('Health status collection failed:', error);
    
    return {
      status: 'unhealthy',
      timestamp,
      version: HEALTH_CHECK_VERSION,
      uptime,
      services: {
        database: 'error',
        storage: 'error',
        ai: 'error',
        cache: 'error'
      },
      metrics: {
        totalSessions: 0,
        activeSessions: 0,
        totalUploads: 0,
        totalTryOns: 0,
        averageResponseTime: 0,
        errorRate: 100
      }
    };
  }
}

// ================================
// Cached Health Check
// ================================

async function getCachedHealthStatus(): Promise<HealthStatus> {
  try {
    // Try to get cached health status
    const cached = await kvGet<HealthStatus>(HEALTH_CACHE_KEY);
    if (cached) {
      // Check if cache is still fresh (within TTL)
      const cacheAge = Date.now() - Date.parse(cached.timestamp);
      if (cacheAge < HEALTH_CACHE_TTL * 1000) {
        return cached;
      }
    }
  } catch (error) {
    console.warn('Failed to get cached health status:', error);
  }

  // Generate fresh health status
  const healthStatus = await getHealthStatus();
  
  try {
    // Cache the result
    await kvSet(HEALTH_CACHE_KEY, healthStatus, HEALTH_CACHE_TTL);
  } catch (error) {
    console.warn('Failed to cache health status:', error);
  }

  return healthStatus;
}

// ================================
// GET /api/health - Health Check
// ================================

export const GET = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  // Rate limiting (more lenient for health checks)
  const rateLimit = await checkRateLimit(request);
  if (!rateLimit.allowed) {
    return errorResponse(
      'Too many requests',
      429
    ).then(response => {
      Object.entries(rateLimit.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    });
  }

  const context = getRequestContext(request);
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get('detailed') === 'true';
  const fresh = searchParams.get('fresh') === 'true';

  try {
    // Get health status (cached or fresh)
    const healthStatus = fresh 
      ? await getHealthStatus() 
      : await getCachedHealthStatus();

    // Filter response based on detail level
    const responseData = detailed ? healthStatus : {
      status: healthStatus.status,
      timestamp: healthStatus.timestamp,
      version: healthStatus.version,
      uptime: healthStatus.uptime,
      services: healthStatus.services
    };

    // Determine HTTP status code based on health
    let statusCode: number;
    switch (healthStatus.status) {
      case 'healthy':
        statusCode = 200;
        break;
      case 'degraded':
        statusCode = 200; // Still operational
        break;
      case 'unhealthy':
        statusCode = 503; // Service unavailable
        break;
      default:
        statusCode = 500;
    }

    const response = successResponse(responseData, statusCode);

    // Add rate limit headers
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', context.requestId);
    response.headers.set('X-Health-Status', healthStatus.status);
    response.headers.set('X-Health-Version', HEALTH_CHECK_VERSION);
    
    // Cache headers based on health status
    if (healthStatus.status === 'healthy') {
      response.headers.set('Cache-Control', `public, max-age=${HEALTH_CACHE_TTL}`);
    } else {
      response.headers.set('Cache-Control', 'no-cache, max-age=0');
    }

    return response;

  } catch (error) {
    console.error('Health check failed:', error);
    
    // Return unhealthy status on error
    const response = successResponse({
      status: 'unhealthy',
      timestamp: context.timestamp,
      version: HEALTH_CHECK_VERSION,
      uptime: Math.floor((Date.now() - STARTUP_TIME) / 1000),
      error: 'Health check system failure'
    }, 503);

    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', context.requestId);
    response.headers.set('X-Health-Status', 'unhealthy');
    response.headers.set('Cache-Control', 'no-cache, max-age=0');

    return response;
  }
});

// ================================
// POST /api/health - Update Metrics
// ================================

export const POST = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  // Rate limiting
  const rateLimit = await checkRateLimit(request);
  if (!rateLimit.allowed) {
    return errorResponse(
      'Too many requests',
      429
    ).then(response => {
      Object.entries(rateLimit.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    });
  }

  const context = getRequestContext(request);

  try {
    const body = await request.json();
    const metricsKey = 'metrics:system';
    
    // Get current metrics
    const currentMetrics = await kvGet<any>(metricsKey) || {};
    
    // Update with provided metrics
    const updatedMetrics = {
      ...currentMetrics,
      ...body,
      lastUpdated: context.timestamp
    };
    
    // Store updated metrics with 1 hour TTL
    await kvSet(metricsKey, updatedMetrics, 3600);
    
    // Invalidate health cache to force refresh
    try {
      const { kvDel } = await import('@/lib/kv');
      await kvDel(HEALTH_CACHE_KEY);
    } catch (e) {
      console.warn('Failed to invalidate health cache:', e);
    }

    const response = successResponse({
      updated: true,
      metrics: updatedMetrics,
      requestId: context.requestId
    });

    // Add rate limit headers
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', context.requestId);

    return response;

  } catch (error) {
    console.error('Metrics update failed:', error);
    throw error;
  }
});

// ================================
// OPTIONS - CORS Preflight
// ================================

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
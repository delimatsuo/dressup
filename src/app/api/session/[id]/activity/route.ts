/**
 * Session Activity Tracking API
 * Tracks user activity and updates session TTL
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionManager } from '@/lib/session-manager';
import { withErrorHandler, ValidationError, NotFoundError } from '@/lib/error-handler';
import { successResponse } from '@/lib/response';
import { validateRequest } from '@/lib/validation';
import { rateLimiters, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'edge';

// ================================
// Request Validation Schema
// ================================

const activitySchema = z.object({
  action: z.string().min(1).max(100),
  metadata: z.record(z.string(), z.any()).optional()
});

// ================================
// POST /api/session/[id]/activity
// ================================

export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  const resolvedParams = await params;
  const sessionId = resolvedParams.id;
  
  // Light rate limiting for activity tracking (more permissive)
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const identifier = getClientIdentifier(ip, sessionId);
  
  // Use the standard rate limiter but with permissive checking
  const activityLimiter = rateLimiters.api;
  
  const rateLimit = await activityLimiter.checkLimit(identifier);
  if (!rateLimit.allowed) {
    // Silently drop excessive activity tracking to avoid disrupting UX
    return successResponse({ tracked: false, reason: 'rate_limited' });
  }

  // Parse and validate request body
  const body = await request.json();
  const validation = validateRequest(activitySchema, body);
  
  if (!validation.success) {
    throw new ValidationError('Invalid activity data', validation.errors);
  }

  const { action, metadata } = validation.data!;

  try {
    // Get session manager
    const sessionManager = getSessionManager();
    
    // Check if session exists
    const session = await sessionManager.getExtendedSession(sessionId);
    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }
    
    if (session.status !== 'active') {
      return successResponse({ 
        tracked: false, 
        reason: 'session_inactive',
        sessionStatus: session.status 
      });
    }

    // Track the activity
    await sessionManager.trackActivity(sessionId, action, {
      ...metadata,
      ip,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    });

    // Get updated session stats
    const stats = await sessionManager.getSessionStats(sessionId);

    const response = successResponse({
      tracked: true,
      sessionId,
      action,
      stats,
      ttlRefreshed: true
    });

    // Add light rate limit headers
    response.headers.set('X-RateLimit-Limit', '60');
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.info.remaining));
    
    return response;

  } catch (error) {
    // Log but don't fail hard for activity tracking
    console.error('Activity tracking failed:', error);
    
    if (error instanceof NotFoundError) {
      throw error;
    }
    
    // Return success even if tracking fails to avoid disrupting UX
    return successResponse({ 
      tracked: false, 
      reason: 'tracking_error' 
    });
  }
});

// ================================
// GET /api/session/[id]/activity - Get Activity History
// ================================

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  const resolvedParams = await params;
  const sessionId = resolvedParams.id;
  
  // Standard rate limiting for reads
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const identifier = getClientIdentifier(ip, sessionId);
  const rateLimit = await rateLimiters.api.checkLimit(identifier);
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { 
        status: 429,
        headers: getRateLimitHeaders(rateLimit.info)
      }
    );
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const validLimit = Math.min(Math.max(1, limit), 100);

  try {
    const sessionManager = getSessionManager();
    
    // Check if session exists
    const session = await sessionManager.getExtendedSession(sessionId);
    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }

    // Get activity history
    const activities = await sessionManager.getActivityHistory(sessionId, validLimit);
    
    // Get session stats
    const stats = await sessionManager.getSessionStats(sessionId);

    const response = successResponse({
      sessionId,
      activities,
      stats,
      count: activities.length,
      limit: validLimit
    });

    // Add rate limit headers
    Object.entries(getRateLimitHeaders(rateLimit.info)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    response.headers.set('Cache-Control', 'private, max-age=10');
    
    return response;

  } catch (error) {
    console.error('Failed to get activity history:', error);
    throw error;
  }
});

// ================================
// OPTIONS - CORS Preflight
// ================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
      'Access-Control-Max-Age': '86400'
    }
  });
}
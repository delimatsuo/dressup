/**
 * Enhanced Individual Session Management API
 * CRUD operations for specific sessions with comprehensive validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, updateSession, deleteSession, SESSION_TTL } from '@/lib/session';
import { rateLimiters, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';
import { withErrorHandler, ValidationError, NotFoundError } from '@/lib/error-handler';
import { successResponse, errorResponse, noContentResponse } from '@/lib/response';
import { validateRequest, sessionIdSchema } from '@/lib/validation';
import type { UpdateSessionRequest, SessionResponse } from '@/types/api';

export const runtime = 'edge';

// ================================
// Request Validation Schemas
// ================================

const updateSessionSchema = z.object({
  userPhotos: z.array(z.string().url()).optional(),
  garmentPhotos: z.array(z.string().url()).optional(),
  metadata: z.record(z.any()).optional(),
  status: z.enum(['active', 'expired', 'deleted', 'cleanup']).optional()
});

// ================================
// Utility Functions
// ================================

function getRequestContext(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent');
  const referer = request.headers.get('referer');
  const sessionId = request.headers.get('x-session-id');
  
  return {
    ip,
    userAgent,
    referer,
    sessionId,
    requestId: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  };
}

async function checkRateLimit(request: NextRequest, endpoint: 'session' | 'api' = 'api') {
  const context = getRequestContext(request);
  const identifier = getClientIdentifier(context.ip, context.sessionId);
  
  const limiter = rateLimiters[endpoint];
  const result = await limiter.checkLimit(identifier);
  
  return {
    allowed: result.allowed,
    headers: getRateLimitHeaders(result.info),
    info: result.info
  };
}

function validateSessionId(sessionId: string) {
  const validation = validateRequest(sessionIdSchema, sessionId);
  if (!validation.success) {
    throw new ValidationError('Invalid session ID format', validation.errors);
  }
  return validation.data;
}

// ================================
// GET /api/session/[id] - Get Session
// ================================

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> => {
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

  const { id } = params;
  validateSessionId(id);
  
  const context = getRequestContext(request);

  try {
    const session = await getSession(id);
    
    if (!session) {
      throw new NotFoundError(`Session ${id} not found`);
    }

    // Check if session is expired and update status if needed
    const now = Date.now();
    const expiresAt = Date.parse(session.expiresAt);
    const isExpired = now >= expiresAt;
    
    if (isExpired && session.status === 'active') {
      session.status = 'expired';
    }

    const response = successResponse({
      ...session,
      ttl: SESSION_TTL,
      expiresIn: Math.max(0, expiresAt - now),
      isExpired
    });

    // Add rate limit headers
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', context.requestId);
    response.headers.set('Cache-Control', 'no-cache, max-age=0');
    
    // Add session-specific headers
    response.headers.set('X-Session-Status', session.status);
    response.headers.set('X-Session-Expires', session.expiresAt);

    return response;

  } catch (error) {
    console.error(`Session retrieval failed for ${id}:`, error);
    throw error;
  }
});

// ================================
// PUT /api/session/[id] - Update Session
// ================================

export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> => {
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

  const { id } = params;
  validateSessionId(id);
  
  // Parse and validate request body
  const body = await request.json();
  const validation = validateRequest(updateSessionSchema, body);
  
  if (!validation.success) {
    throw new ValidationError('Invalid request data', validation.errors);
  }

  const updates = validation.data as UpdateSessionRequest;
  const context = getRequestContext(request);

  try {
    // Check if session exists first
    const existingSession = await getSession(id);
    if (!existingSession) {
      throw new NotFoundError(`Session ${id} not found`);
    }

    // Add update metadata
    const enhancedUpdates = {
      ...updates,
      metadata: {
        ...existingSession.metadata,
        ...updates.metadata,
        lastUpdatedBy: {
          ip: context.ip,
          userAgent: context.userAgent,
          requestId: context.requestId,
          timestamp: context.timestamp
        }
      }
    };

    const updatedSession = await updateSession(id, enhancedUpdates);
    
    if (!updatedSession) {
      throw new NotFoundError(`Session ${id} could not be updated`);
    }

    const response = successResponse({
      ...updatedSession,
      ttl: SESSION_TTL,
      expiresIn: Date.parse(updatedSession.expiresAt) - Date.now()
    });

    // Add rate limit headers
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', context.requestId);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return response;

  } catch (error) {
    console.error(`Session update failed for ${id}:`, error);
    throw error;
  }
});

// ================================
// PATCH /api/session/[id] - Partial Update Session
// ================================

export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> => {
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

  const { id } = params;
  validateSessionId(id);
  
  // Parse and validate request body (allow partial updates)
  const body = await request.json();
  const validation = validateRequest(updateSessionSchema.partial(), body);
  
  if (!validation.success) {
    throw new ValidationError('Invalid request data', validation.errors);
  }

  const updates = validation.data;
  const context = getRequestContext(request);

  try {
    // Check if session exists first
    const existingSession = await getSession(id);
    if (!existingSession) {
      throw new NotFoundError(`Session ${id} not found`);
    }

    // Merge metadata instead of replacing
    const enhancedUpdates = {
      ...updates,
      ...(updates.metadata && {
        metadata: {
          ...existingSession.metadata,
          ...updates.metadata,
          lastUpdatedBy: {
            ip: context.ip,
            userAgent: context.userAgent,
            requestId: context.requestId,
            timestamp: context.timestamp
          }
        }
      })
    };

    const updatedSession = await updateSession(id, enhancedUpdates);
    
    if (!updatedSession) {
      throw new NotFoundError(`Session ${id} could not be updated`);
    }

    const response = successResponse({
      ...updatedSession,
      ttl: SESSION_TTL,
      expiresIn: Date.parse(updatedSession.expiresAt) - Date.now()
    });

    // Add rate limit headers
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', context.requestId);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return response;

  } catch (error) {
    console.error(`Session patch failed for ${id}:`, error);
    throw error;
  }
});

// ================================
// DELETE /api/session/[id] - Delete Session
// ================================

export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> => {
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

  const { id } = params;
  validateSessionId(id);
  
  const context = getRequestContext(request);

  try {
    // Check if session exists first
    const existingSession = await getSession(id);
    if (!existingSession) {
      throw new NotFoundError(`Session ${id} not found`);
    }

    const deleted = await deleteSession(id);
    
    if (!deleted) {
      throw new Error(`Failed to delete session ${id}`);
    }

    const response = noContentResponse();

    // Add rate limit headers
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', context.requestId);
    response.headers.set('X-Session-Deleted', 'true');
    response.headers.set('X-Deleted-At', context.timestamp);

    return response;

  } catch (error) {
    console.error(`Session deletion failed for ${id}:`, error);
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
      'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
      'Access-Control-Max-Age': '86400'
    }
  });
}
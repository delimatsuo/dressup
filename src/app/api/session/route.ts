/**
 * Enhanced Session Management API
 * Comprehensive CRUD operations with rate limiting and validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession, getSession, updateSession, deleteSession, SESSION_TTL } from '@/lib/session';
import { rateLimiters, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';
import { withErrorHandler, ValidationError, NotFoundError } from '@/lib/error-handler';
import { successResponse, errorResponse } from '@/lib/response';
import { validateRequest } from '@/lib/validation';
import type { 
  CreateSessionRequest, 
  UpdateSessionRequest, 
  SessionResponse,
  SessionListResponse,
  ApiResponse 
} from '@/types/api';

export const runtime = 'edge';

// ================================
// Request Validation Schemas
// ================================

const createSessionSchema = z.object({
  metadata: z.record(z.string(), z.any()).optional(),
  ttlMinutes: z.number().min(1).max(240).optional() // 1 minute to 4 hours
});

const updateSessionSchema = z.object({
  userPhotos: z.array(z.string().url()).optional(),
  garmentPhotos: z.array(z.string().url()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  status: z.enum(['active', 'expired', 'deleted', 'cleanup']).optional()
});

const querySchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).refine(val => !isNaN(val) && val > 0).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).refine(val => !isNaN(val) && val > 0 && val <= 100).optional(),
  status: z.enum(['active', 'expired', 'deleted', 'cleanup']).optional(),
  includeExpired: z.string().transform(val => val === 'true').optional()
});

// ================================
// Utility Functions
// ================================

function getRequestContext(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
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

async function checkRateLimit(request: NextRequest, endpoint: 'session' | 'api' = 'session') {
  const context = getRequestContext(request);
  const identifier = getClientIdentifier(context.ip, context.sessionId || undefined);
  
  const limiter = rateLimiters[endpoint];
  const result = await limiter.checkLimit(identifier);
  
  return {
    allowed: result.allowed,
    headers: getRateLimitHeaders(result.info),
    info: result.info
  };
}

// ================================
// POST /api/session - Create Session
// ================================

export const POST = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  // Rate limiting
  const rateLimit = await checkRateLimit(request, 'session');
  if (!rateLimit.allowed) {
    const response = await errorResponse('Too many session creation requests', 429);
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Parse and validate request body
  const body = await request.json().catch(() => ({}));
  const validation = validateRequest(createSessionSchema, body);
  
  if (!validation.success) {
    throw new ValidationError('Invalid request data', validation.errors);
  }

  const requestData = validation.data as CreateSessionRequest;
  const context = getRequestContext(request);

  try {
    // Create session with optional metadata
    const session = await createSession();
    
    // If metadata provided, update the session
    if (requestData.metadata) {
      const updatedSession = await updateSession(session.sessionId, {} as any);
      
      if (updatedSession) {
        Object.assign(session, updatedSession);
      }
    }

    // Add request context to metadata
    (session as any).metadata = {
      ...(session as any).metadata,
      createdBy: {
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId
      }
    };

    const response = successResponse({
      ...session,
      ttl: SESSION_TTL,
      expiresIn: SESSION_TTL * 1000 // milliseconds
    }, 201);

    // Add rate limit headers
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add security headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('X-Request-ID', context.requestId);

    return response;

  } catch (error) {
    console.error('Session creation failed:', error);
    throw error;
  }
});

// ================================
// GET /api/session - List Sessions (for admin/debugging)
// ================================

export const GET = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  // Rate limiting
  const rateLimit = await checkRateLimit(request, 'api');
  if (!rateLimit.allowed) {
    const response = await errorResponse('Too many requests', 429);
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const queryValidation = validateRequest(querySchema, {
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
    status: searchParams.get('status'),
    includeExpired: searchParams.get('includeExpired')
  });

  if (!queryValidation.success) {
    throw new ValidationError('Invalid query parameters', queryValidation.errors);
  }

  const {
    page = 1,
    limit = 10,
    status,
    includeExpired = false
  } = queryValidation.data || {};

  const context = getRequestContext(request);

  try {
    // For now, return mock data since we don't have session listing in the basic implementation
    // In a real implementation, you'd query KV for session keys and paginate
    
    const mockSessions: any[] = [];
    const total = 0;

    const response = NextResponse.json({
      success: true,
      data: mockSessions,
      metadata: {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        requestId: context.requestId,
        timestamp: context.timestamp,
        filters: {
          status,
          includeExpired
        }
      }
    });

    // Add rate limit headers
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', context.requestId);
    response.headers.set('Cache-Control', 'no-cache, max-age=0');

    return response;

  } catch (error) {
    console.error('Session listing failed:', error);
    throw error;
  }
});

// ================================
// PATCH /api/session - Bulk Update Sessions
// ================================

export const PATCH = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  // Rate limiting
  const rateLimit = await checkRateLimit(request, 'api');
  if (!rateLimit.allowed) {
    const response = await errorResponse('Too many requests', 429);
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  const bulkUpdateSchema = z.object({
    sessionIds: z.array(z.string()).min(1).max(50), // Limit bulk operations
    updates: updateSessionSchema
  });

  // Parse and validate request body
  const body = await request.json();
  const validation = validateRequest(bulkUpdateSchema, body);
  
  if (!validation.success) {
    throw new ValidationError('Invalid request data', validation.errors);
  }

  const { sessionIds, updates } = validation.data!;
  const context = getRequestContext(request);

  try {
    const results = await Promise.allSettled(
      sessionIds.map(async (sessionId) => {
        const session = await getSession(sessionId);
        if (!session) {
          throw new NotFoundError(`Session ${sessionId} not found`);
        }
        
        return await updateSession(sessionId, updates);
      })
    );

    const successful = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(Boolean);

    const failed = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason.message);

    const response = successResponse({
      updated: successful.length,
      failed: failed.length,
      errors: failed,
      sessions: successful
    });

    // Add rate limit headers
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', context.requestId);

    return response;

  } catch (error) {
    console.error('Bulk session update failed:', error);
    throw error;
  }
});

// ================================
// DELETE /api/session - Bulk Delete Sessions
// ================================

export const DELETE = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  // Rate limiting
  const rateLimit = await checkRateLimit(request, 'api');
  if (!rateLimit.allowed) {
    const response = await errorResponse('Too many requests', 429);
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  const bulkDeleteSchema = z.object({
    sessionIds: z.array(z.string()).min(1).max(50), // Limit bulk operations
    reason: z.string().optional()
  });

  // Parse and validate request body
  const body = await request.json();
  const validation = validateRequest(bulkDeleteSchema, body);
  
  if (!validation.success) {
    throw new ValidationError('Invalid request data', validation.errors);
  }

  const { sessionIds, reason } = validation.data!;
  const context = getRequestContext(request);

  try {
    const results = await Promise.allSettled(
      sessionIds.map(sessionId => deleteSession(sessionId))
    );

    const successful = results
      .filter((result): result is PromiseFulfilledResult<boolean> => 
        result.status === 'fulfilled' && result.value === true)
      .length;

    const failed = results
      .filter(result => result.status === 'rejected' || 
        (result.status === 'fulfilled' && result.value === false))
      .length;

    const response = successResponse({
      deleted: successful,
      failed,
      reason,
      requestId: context.requestId
    });

    // Add rate limit headers
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', context.requestId);

    return response;

  } catch (error) {
    console.error('Bulk session deletion failed:', error);
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
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
      'Access-Control-Max-Age': '86400'
    }
  });
}
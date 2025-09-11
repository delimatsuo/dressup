/**
 * Session Restoration API
 * Allows session recovery using restoration tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionManager } from '@/lib/session-manager';
import { withErrorHandler, ValidationError } from '@/lib/error-handler';
import { successResponse, errorResponse } from '@/lib/response';
import { validateRequest } from '@/lib/validation';
import { rateLimiters, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'edge';

// ================================
// Request Validation Schema
// ================================

const restoreSchema = z.object({
  token: z.string().uuid(),
  extendTTL: z.boolean().optional().default(true),
  deviceInfo: z.object({
    userAgent: z.string().optional(),
    platform: z.string().optional(),
    language: z.string().optional()
  }).optional()
});

// ================================
// POST /api/session/restore - Restore Session
// ================================

export const POST = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  // Rate limiting (strict for restoration to prevent token brute-forcing)
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const identifier = getClientIdentifier(ip);
  const rateLimit = await rateLimiters.session.checkLimit(identifier);
  
  if (!rateLimit.allowed) {
    return errorResponse(
      'Too many restoration attempts',
      429
    ).then(response => {
      Object.entries(getRateLimitHeaders(rateLimit.info)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    });
  }

  // Parse and validate request body
  const body = await request.json();
  const validation = validateRequest(restoreSchema, body);
  
  if (!validation.success) {
    throw new ValidationError('Invalid restoration data', validation.errors);
  }

  const { token, extendTTL, deviceInfo } = validation.data;

  try {
    const sessionManager = getSessionManager();
    
    // Attempt to restore session
    const restoredSession = await sessionManager.restoreSession(token, {
      extendTTL,
      validateDevice: true
    });

    if (!restoredSession) {
      // Invalid or expired token
      return errorResponse(
        'Invalid or expired restoration token',
        401
      ).then(response => {
        Object.entries(getRateLimitHeaders(rateLimit.info)).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      });
    }

    // Generate new restoration token for future use
    const newToken = await sessionManager.generateRestorationToken(restoredSession.sessionId);

    // Track restoration with device info
    await sessionManager.trackActivity(restoredSession.sessionId, 'session_restored', {
      ip,
      userAgent: request.headers.get('user-agent'),
      providedDeviceInfo: deviceInfo,
      restorationMethod: 'token'
    });

    const response = successResponse({
      session: restoredSession,
      restorationToken: newToken,
      ttlExtended: extendTTL,
      message: 'Session successfully restored'
    }, 200);

    // Add rate limit headers
    Object.entries(getRateLimitHeaders(rateLimit.info)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Security headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    
    return response;

  } catch (error) {
    console.error('Session restoration failed:', error);
    
    // Log potential security issue
    if (error instanceof Error && error.message.includes('token')) {
      console.warn('Potential token brute-force attempt from IP:', ip);
    }
    
    throw error;
  }
});

// ================================
// GET /api/session/restore/generate - Generate Restoration Token
// ================================

export const GET = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  // Get session ID from header or query
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId') || request.headers.get('x-session-id');
  
  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  // Rate limiting
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const identifier = getClientIdentifier(ip, sessionId);
  const rateLimit = await rateLimiters.api.checkLimit(identifier);
  
  if (!rateLimit.allowed) {
    return errorResponse(
      'Too many requests',
      429
    ).then(response => {
      Object.entries(getRateLimitHeaders(rateLimit.info)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    });
  }

  try {
    const sessionManager = getSessionManager();
    
    // Check if session exists and is active
    const session = await sessionManager.getExtendedSession(sessionId);
    if (!session) {
      return errorResponse('Session not found', 404);
    }
    
    if (session.status !== 'active') {
      return errorResponse('Session is not active', 400);
    }

    // Generate restoration token
    const token = await sessionManager.generateRestorationToken(sessionId);

    // Track token generation
    await sessionManager.trackActivity(sessionId, 'restoration_token_generated', {
      ip,
      userAgent: request.headers.get('user-agent')
    });

    const response = successResponse({
      sessionId,
      restorationToken: token,
      expiresIn: 86400, // 24 hours in seconds
      message: 'Restoration token generated successfully'
    });

    // Add rate limit headers
    Object.entries(getRateLimitHeaders(rateLimit.info)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Security headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    return response;

  } catch (error) {
    console.error('Failed to generate restoration token:', error);
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
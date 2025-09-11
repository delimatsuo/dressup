/**
 * Enhanced AI Processing Try-On API
 * Comprehensive try-on processing with validation, rate limiting, and status tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { type TryOnRequest, submitTryOn } from '@/lib/tryon';
import { updateSession, getSession } from '@/lib/session';
import { processWithGemini } from '@/lib/tryon-processing';
import { rateLimiters, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';
import { withErrorHandler, ValidationError, NotFoundError } from '@/lib/error-handler';
import { successResponse, errorResponse } from '@/lib/response';
import { validateRequest, tryOnRequestSchema } from '@/lib/validation';
import { kvGet, kvSet, kvDel } from '@/lib/kv';
import type { 
  TryOnResponse, 
  TryOnStatusResponse, 
  TryOnJob,
  TryOnResult,
  TryOnStatus 
} from '@/types/api';

export const runtime = 'edge';

// ================================
// Request Validation Schemas
// ================================

const processTryOnSchema = z.object({
  sessionId: z.string().min(1),
  userPhotos: z.object({
    front: z.string().url(),
    side: z.string().url(),
    back: z.string().url().optional()
  }),
  garmentPhotos: z.object({
    front: z.string().url(),
    side: z.string().url(),
    back: z.string().url().optional()
  }),
  options: z.object({
    generateMultiplePoses: z.boolean().optional().default(false),
    enhanceBackground: z.boolean().optional().default(false),
    outputFormat: z.enum(['jpg', 'png', 'webp']).optional().default('jpg'),
    quality: z.number().min(1).max(100).optional().default(85),
    backgroundRemoval: z.boolean().optional().default(false),
    styleTransfer: z.boolean().optional().default(false)
  }).optional().default({})
});

const statusQuerySchema = z.object({
  jobId: z.string().min(1),
  includeResults: z.string().transform(val => val === 'true').optional().default(false)
});

const batchStatusSchema = z.object({
  jobIds: z.array(z.string()).min(1).max(50),
  includeResults: z.boolean().optional().default(false)
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

async function checkRateLimit(request: NextRequest, endpoint: 'tryOn' | 'api' = 'tryOn') {
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

async function validateSession(sessionId: string): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) {
    throw new NotFoundError(`Session ${sessionId} not found`);
  }
  if (session.status !== 'active') {
    throw new ValidationError(`Session ${sessionId} is not active`);
  }
}

function generateJobId(): string {
  return `tryon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function storeJobData(jobId: string, jobData: TryOnJob): Promise<void> {
  const key = `tryon:job:${jobId}`;
  const ttl = 24 * 60 * 60; // 24 hours
  await kvSet(key, jobData, ttl);
}

async function getJobData(jobId: string): Promise<TryOnJob | null> {
  const key = `tryon:job:${jobId}`;
  return await kvGet<TryOnJob>(key);
}

async function updateJobStatus(
  jobId: string, 
  updates: Partial<TryOnJob>
): Promise<TryOnJob | null> {
  const existing = await getJobData(jobId);
  if (!existing) return null;
  
  const updated = { ...existing, ...updates };
  await storeJobData(jobId, updated);
  return updated;
}

async function validatePhotos(photos: any): Promise<void> {
  const { front, side, back } = photos;
  
  // Basic URL validation is done by schema
  // Additional validation could include:
  // - Check if URLs are accessible
  // - Validate image dimensions
  // - Check file types
  
  // For now, just ensure required photos exist
  if (!front || !side) {
    throw new ValidationError('Front and side photos are required');
  }
}

// ================================
// POST /api/try-on - Process Try-On Request
// ================================

export const POST = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  // Rate limiting
  const rateLimit = await checkRateLimit(request, 'tryOn');
  if (!rateLimit.allowed) {
    return errorResponse(
      'Too many try-on requests',
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
    // Parse and validate request body
    const body = await request.json();
    const validation = validateRequest(processTryOnSchema, body);
    
    if (!validation.success) {
      throw new ValidationError('Invalid try-on request', validation.errors);
    }

    const tryOnData = validation.data as TryOnRequest;

    // Validate session exists and is active
    await validateSession(tryOnData.sessionId);

    // Validate photos
    await validatePhotos(tryOnData.userPhotos);
    await validatePhotos(tryOnData.garmentPhotos);

    const jobId = generateJobId();

    // Create initial job data
    const jobData: TryOnJob = {
      jobId,
      sessionId: tryOnData.sessionId,
      status: 'queued',
      progress: 0,
      queuePosition: 1, // Simple queue simulation
      estimatedTime: 30, // 30 seconds estimated
      results: [],
      metadata: {
        requestData: tryOnData,
        requestContext: context,
        createdAt: context.timestamp
      }
    };

    // If we have an AI key, process synchronously for MVP
    if (process.env.GOOGLE_AI_API_KEY) {
      try {
        jobData.status = 'processing';
        jobData.startedAt = context.timestamp;
        await storeJobData(jobId, jobData);

        // Process with Gemini
        const results = await processWithGemini(tryOnData);
        
        // Update job with results
        const completedJob: TryOnJob = {
          ...jobData,
          status: 'completed',
          progress: 100,
          completedAt: context.timestamp,
          results: Array.isArray(results) ? results : [
            {
              type: 'standing',
              imageUrl: results.imageUrl || `https://placeholder.com/400x600?text=TryOn+Result`,
              confidence: results.confidence || 0.95,
              processingTime: Date.now() - Date.parse(context.timestamp),
              metadata: results.metadata || {}
            }
          ]
        };

        await storeJobData(jobId, completedJob);

        // Refresh session TTL on activity (best effort)
        try { 
          await updateSession(tryOnData.sessionId, {}); 
        } catch (e) {
          console.warn('Failed to update session TTL:', e);
        }

        const response = successResponse(completedJob, 201);

        // Add rate limit headers
        Object.entries(rateLimit.headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        response.headers.set('X-Request-ID', context.requestId);
        response.headers.set('X-Job-ID', jobId);
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

        return response;

      } catch (aiError) {
        console.error('AI processing failed:', aiError);
        
        // Update job with error
        const failedJob: TryOnJob = {
          ...jobData,
          status: 'failed',
          error: aiError instanceof Error ? aiError.message : 'AI processing failed',
          completedAt: context.timestamp
        };
        
        await storeJobData(jobId, failedJob);
        
        // Return the failed job data instead of throwing
        const response = successResponse(failedJob, 202);
        
        Object.entries(rateLimit.headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        
        response.headers.set('X-Request-ID', context.requestId);
        response.headers.set('X-Job-ID', jobId);
        
        return response;
      }
    } else {
      // No AI key - use traditional async processing
      await storeJobData(jobId, jobData);
      
      // Submit to processing queue (mock implementation)
      const job = await submitTryOn(tryOnData);
      
      const queuedJob: TryOnJob = {
        ...jobData,
        estimatedTime: job.estimatedTime,
        queuePosition: Math.floor(Math.random() * 5) + 1 // Mock queue position
      };
      
      await storeJobData(jobId, queuedJob);

      // Refresh session TTL on activity (best effort)
      try { 
        await updateSession(tryOnData.sessionId, {}); 
      } catch (e) {
        console.warn('Failed to update session TTL:', e);
      }

      const response = successResponse(queuedJob, 202);

      // Add rate limit headers
      Object.entries(rateLimit.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      response.headers.set('X-Request-ID', context.requestId);
      response.headers.set('X-Job-ID', jobId);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

      return response;
    }

  } catch (error) {
    console.error('Try-on processing error:', error);
    throw error;
  }
});

// ================================
// GET /api/try-on - Get Try-On Status
// ================================

export const GET = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  // Rate limiting
  const rateLimit = await checkRateLimit(request, 'api');
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
    const { searchParams } = new URL(request.url);
    const validation = validateRequest(statusQuerySchema, {
      jobId: searchParams.get('jobId'),
      includeResults: searchParams.get('includeResults')
    });

    if (!validation.success) {
      throw new ValidationError('Invalid query parameters', validation.errors);
    }

    const { jobId, includeResults } = validation.data;

    // Get job data
    const job = await getJobData(jobId);
    
    if (!job) {
      throw new NotFoundError(`Try-on job ${jobId} not found`);
    }

    // Filter results if not requested
    const responseData = includeResults ? job : {
      ...job,
      results: job.results.map(result => ({
        type: result.type,
        confidence: result.confidence,
        processingTime: result.processingTime
      }))
    };

    const response = successResponse(responseData);

    // Add rate limit headers
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', context.requestId);
    response.headers.set('X-Job-ID', jobId);
    
    // Cache based on job status
    if (job.status === 'completed' || job.status === 'failed') {
      response.headers.set('Cache-Control', 'public, max-age=3600'); // 1 hour
    } else {
      response.headers.set('Cache-Control', 'no-cache, max-age=0');
    }

    return response;

  } catch (error) {
    console.error('Status check error:', error);
    throw error;
  }
});

// ================================
// POST /api/try-on/batch-status - Get Multiple Job Statuses
// ================================

export const PUT = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  // Rate limiting
  const rateLimit = await checkRateLimit(request, 'api');
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
    const validation = validateRequest(batchStatusSchema, body);
    
    if (!validation.success) {
      throw new ValidationError('Invalid batch status request', validation.errors);
    }

    const { jobIds, includeResults } = validation.data;

    // Get all job data
    const jobResults = await Promise.allSettled(
      jobIds.map(async jobId => {
        const job = await getJobData(jobId);
        if (!job) {
          throw new NotFoundError(`Job ${jobId} not found`);
        }
        
        return includeResults ? job : {
          ...job,
          results: job.results.map(result => ({
            type: result.type,
            confidence: result.confidence,
            processingTime: result.processingTime
          }))
        };
      })
    );

    const successful = jobResults
      .filter((result): result is PromiseFulfilledResult<TryOnJob> => 
        result.status === 'fulfilled')
      .map(result => result.value);

    const failed = jobResults
      .filter((result): result is PromiseRejectedResult => 
        result.status === 'rejected')
      .map(result => result.reason.message);

    const response = successResponse({
      jobs: successful,
      found: successful.length,
      failed: failed.length,
      errors: failed,
      requestId: context.requestId
    });

    // Add rate limit headers
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', context.requestId);
    response.headers.set('Cache-Control', 'no-cache, max-age=0');

    return response;

  } catch (error) {
    console.error('Batch status check failed:', error);
    throw error;
  }
});

// ================================
// DELETE /api/try-on - Cancel Try-On Job
// ================================

export const DELETE = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  // Rate limiting
  const rateLimit = await checkRateLimit(request, 'api');
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
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      throw new ValidationError('Job ID is required');
    }

    // Get job data
    const job = await getJobData(jobId);
    
    if (!job) {
      throw new NotFoundError(`Try-on job ${jobId} not found`);
    }

    // Can only cancel queued or processing jobs
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      throw new ValidationError(`Cannot cancel job with status: ${job.status}`);
    }

    // Update job status to cancelled
    const cancelledJob = await updateJobStatus(jobId, {
      status: 'cancelled',
      completedAt: context.timestamp,
      error: 'Job cancelled by user request'
    });

    const response = successResponse({
      jobId,
      cancelled: true,
      cancelledAt: context.timestamp,
      previousStatus: job.status,
      requestId: context.requestId
    });

    // Add rate limit headers
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', context.requestId);
    response.headers.set('X-Job-ID', jobId);

    return response;

  } catch (error) {
    console.error('Job cancellation failed:', error);
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
      'Access-Control-Max-Age': '86400'
    }
  });
}
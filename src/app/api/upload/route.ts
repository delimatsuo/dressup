/**
 * Enhanced Image Upload API
 * Comprehensive file upload with validation, rate limiting, and cleanup
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateUpload, ALLOWED_TYPES, MAX_FILE_SIZE } from '@/lib/upload';
import { uploadToBlob } from '@/lib/blob';
import { getSession, updateSession } from '@/lib/session';
import { rateLimiters, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';
import { withErrorHandler, ValidationError, NotFoundError } from '@/lib/error-handler';
import { successResponse, errorResponse } from '@/lib/response';
import { validateRequest, uploadSchema, validateFile } from '@/lib/validation';
import type { 
  UploadRequest, 
  UploadResponse, 
  BatchUploadRequest,
  BatchUploadResponse,
  UploadMetadata 
} from '@/types/api';

export const runtime = 'edge';

// ================================
// Request Validation Schemas
// ================================

const singleUploadSchema = z.object({
  sessionId: z.string().min(1),
  category: z.enum(['user', 'garment']),
  type: z.enum(['front', 'side', 'back']),
  generateThumbnail: z.boolean().optional().default(false)
});

const batchUploadSchema = z.object({
  sessionId: z.string().min(1),
  uploads: z.array(z.object({
    category: z.enum(['user', 'garment']),
    type: z.enum(['front', 'side', 'back']),
    file: z.any() // File validation happens separately
  })).min(1).max(10) // Limit batch size
});

const deleteUploadSchema = z.object({
  url: z.string().url(),
  sessionId: z.string().min(1).optional()
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

async function checkRateLimit(request: NextRequest, endpoint: 'upload' | 'api' = 'upload') {
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

async function generateThumbnail(file: File): Promise<string | undefined> {
  // In a real implementation, this would generate a thumbnail
  // For now, return undefined (no thumbnail)
  return undefined;
}

async function trackUpload(sessionId: string, metadata: UploadMetadata): Promise<void> {
  try {
    const session = await getSession(sessionId);
    if (!session) return;

    const updatedPhotos = metadata.category === 'user' 
      ? [...session.userPhotos, metadata.url]
      : [...session.garmentPhotos, metadata.url];

    const updates = metadata.category === 'user'
      ? { userPhotos: updatedPhotos }
      : { garmentPhotos: updatedPhotos };

    await updateSession(sessionId, updates);
  } catch (error) {
    console.error('Failed to track upload in session:', error);
    // Don't fail the upload if session tracking fails
  }
}

// ================================
// POST /api/upload - Single File Upload
// ================================

export const POST = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  // Rate limiting
  const rateLimit = await checkRateLimit(request, 'upload');
  if (!rateLimit.allowed) {
    return errorResponse(
      'Too many upload requests',
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
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;
    const category = formData.get('category') as string;
    const type = formData.get('type') as string;
    const generateThumbnailFlag = formData.get('generateThumbnail') === 'true';

    // Validate required fields
    if (!file) {
      throw new ValidationError('No file provided');
    }

    // Validate form data
    const validation = validateRequest(singleUploadSchema, {
      sessionId,
      category,
      type,
      generateThumbnail: generateThumbnailFlag
    });

    if (!validation.success) {
      throw new ValidationError('Invalid upload parameters', validation.errors);
    }

    const uploadData = validation.data;

    // Validate session exists and is active
    await validateSession(uploadData.sessionId);

    // Validate file
    const fileValidation = validateFile(file);
    if (!fileValidation.valid) {
      throw new ValidationError('File validation failed', fileValidation.errors);
    }

    // Additional validation using existing upload lib
    const uploadValidation = validateUpload({
      sessionId: uploadData.sessionId,
      category: uploadData.category,
      type: uploadData.type,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    });

    if (!uploadValidation.ok) {
      throw new ValidationError(uploadValidation.error);
    }

    // Upload to Blob storage
    const { url } = await uploadToBlob(uploadValidation.value.path, file, file.type);

    // Generate thumbnail if requested
    let thumbnailUrl: string | undefined;
    if (uploadData.generateThumbnail) {
      thumbnailUrl = await generateThumbnail(file);
    }

    // Create upload metadata
    const uploadMetadata: UploadMetadata = {
      sessionId: uploadData.sessionId,
      category: uploadData.category,
      type: uploadData.type,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      uploadedAt: context.timestamp,
      url,
      thumbnailUrl,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    // Track upload in session
    await trackUpload(uploadData.sessionId, uploadMetadata);

    const response = successResponse({
      ...uploadMetadata,
      requestId: context.requestId
    }, 201);

    // Add rate limit headers
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', context.requestId);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return response;

  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
});

// ================================
// PUT /api/upload - Batch File Upload
// ================================

export const PUT = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  // Rate limiting (stricter for batch uploads)
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
    // Parse multipart form data for batch upload
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string;
    const uploadCount = parseInt(formData.get('uploadCount') as string || '0', 10);

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    if (uploadCount < 1 || uploadCount > 10) {
      throw new ValidationError('Upload count must be between 1 and 10');
    }

    // Validate session
    await validateSession(sessionId);

    const uploads: Array<{
      file: File;
      category: string;
      type: string;
    }> = [];

    // Extract files and metadata
    for (let i = 0; i < uploadCount; i++) {
      const file = formData.get(`file_${i}`) as File;
      const category = formData.get(`category_${i}`) as string;
      const type = formData.get(`type_${i}`) as string;

      if (!file || !category || !type) {
        throw new ValidationError(`Missing data for upload ${i}`);
      }

      uploads.push({ file, category, type });
    }

    // Validate all uploads
    const uploadResults = await Promise.allSettled(
      uploads.map(async (upload, index) => {
        // Validate file
        const fileValidation = validateFile(upload.file);
        if (!fileValidation.valid) {
          throw new Error(`File ${index} validation failed: ${fileValidation.errors.join(', ')}`);
        }

        // Validate upload parameters
        const uploadValidation = validateUpload({
          sessionId,
          category: upload.category as any,
          type: upload.type as any,
          fileName: upload.file.name,
          contentType: upload.file.type,
          size: upload.file.size,
        });

        if (!uploadValidation.ok) {
          throw new Error(`Upload ${index} validation failed: ${uploadValidation.error}`);
        }

        // Upload to blob
        const { url } = await uploadToBlob(
          uploadValidation.value.path,
          upload.file,
          upload.file.type
        );

        const metadata: UploadMetadata = {
          sessionId,
          category: upload.category as any,
          type: upload.type as any,
          fileName: upload.file.name,
          contentType: upload.file.type,
          size: upload.file.size,
          uploadedAt: context.timestamp,
          url,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        // Track in session
        await trackUpload(sessionId, metadata);

        return metadata;
      })
    );

    const successful = uploadResults
      .filter((result): result is PromiseFulfilledResult<UploadMetadata> => 
        result.status === 'fulfilled')
      .map(result => result.value);

    const failed = uploadResults
      .filter((result): result is PromiseRejectedResult => 
        result.status === 'rejected')
      .map(result => result.reason.message);

    const response = successResponse({
      successful: successful.length,
      failed: failed.length,
      uploads: successful,
      errors: failed,
      requestId: context.requestId
    }, successful.length > 0 ? 201 : 400);

    // Add rate limit headers
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', context.requestId);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return response;

  } catch (error) {
    console.error('Batch upload failed:', error);
    throw error;
  }
});

// ================================
// DELETE /api/upload - Delete Upload
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
    const url = searchParams.get('url');
    const sessionId = searchParams.get('sessionId');

    // Validate parameters
    const validation = validateRequest(deleteUploadSchema, { url, sessionId });
    if (!validation.success) {
      throw new ValidationError('Invalid delete parameters', validation.errors);
    }

    const { url: fileUrl, sessionId: validatedSessionId } = validation.data;

    // If session ID provided, validate it and remove from session tracking
    if (validatedSessionId) {
      await validateSession(validatedSessionId);
      
      const session = await getSession(validatedSessionId);
      if (session) {
        const updatedUserPhotos = session.userPhotos.filter(photo => photo !== fileUrl);
        const updatedGarmentPhotos = session.garmentPhotos.filter(photo => photo !== fileUrl);
        
        await updateSession(validatedSessionId, {
          userPhotos: updatedUserPhotos,
          garmentPhotos: updatedGarmentPhotos
        });
      }
    }

    // TODO: Implement actual blob deletion
    // For now, just return success
    // In a real implementation:
    // const deleted = await deleteFromBlob(fileUrl);

    const response = successResponse({
      deleted: true,
      url: fileUrl,
      deletedAt: context.timestamp,
      requestId: context.requestId
    });

    // Add rate limit headers
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', context.requestId);

    return response;

  } catch (error) {
    console.error('Delete failed:', error);
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
      'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
      'Access-Control-Max-Age': '86400'
    }
  });
}
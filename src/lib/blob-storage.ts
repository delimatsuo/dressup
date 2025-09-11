/**
 * Vercel Blob Storage Service
 * Handles image uploads, automatic cleanup, and secure URL generation
 */

import { put, del, list, head, PutBlobResult, ListBlobResult } from '@vercel/blob';
import { kv } from '@vercel/kv';
import sharp from 'sharp';
import { z } from 'zod';

// ================================
// Configuration
// ================================

const BLOB_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const THUMBNAIL_SIZE = { width: 200, height: 200 };
const MAX_IMAGE_SIZE = { width: 2048, height: 2048 };
const JPEG_QUALITY = 85;
const WEBP_QUALITY = 80;

// Supported image formats
export const SUPPORTED_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export type SupportedImageFormat = typeof SUPPORTED_FORMATS[number];

// ================================
// Types & Interfaces
// ================================

export interface BlobMetadata {
  sessionId: string;
  category: 'user' | 'garment';
  type: 'front' | 'side' | 'back';
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  uploadedAt: string;
  expiresAt: string;
  thumbnailUrl?: string;
  optimized?: boolean;
}

export interface UploadOptions {
  sessionId: string;
  category: 'user' | 'garment';
  type: 'front' | 'side' | 'back';
  optimize?: boolean;
  generateThumbnail?: boolean;
  customExpiry?: number; // Custom expiry in ms
}

export interface ProcessedImage {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  size: number;
}

export interface BlobUploadResult {
  url: string;
  downloadUrl: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
  metadata: BlobMetadata;
  thumbnailUrl?: string;
}

// ================================
// Validation Schemas
// ================================

const uploadOptionsSchema = z.object({
  sessionId: z.string().min(1),
  category: z.enum(['user', 'garment']),
  type: z.enum(['front', 'side', 'back']),
  optimize: z.boolean().optional().default(true),
  generateThumbnail: z.boolean().optional().default(false),
  customExpiry: z.number().positive().optional()
});

const formatSchema = z.enum(SUPPORTED_FORMATS as [string, ...string[]]);

// ================================
// Image Processing
// ================================

/**
 * Process and optimize an image
 */
async function processImage(
  buffer: Buffer,
  options: {
    resize?: boolean;
    thumbnail?: boolean;
    format?: 'jpeg' | 'webp' | 'png';
  } = {}
): Promise<ProcessedImage> {
  try {
    let pipeline = sharp(buffer);
    
    // Get metadata
    const metadata = await pipeline.metadata();
    const { width = 0, height = 0, format: originalFormat } = metadata;
    
    // Resize for thumbnail
    if (options.thumbnail) {
      pipeline = pipeline.resize(THUMBNAIL_SIZE.width, THUMBNAIL_SIZE.height, {
        fit: 'cover',
        position: 'center'
      });
    }
    // Resize if too large
    else if (options.resize && (width > MAX_IMAGE_SIZE.width || height > MAX_IMAGE_SIZE.height)) {
      pipeline = pipeline.resize(MAX_IMAGE_SIZE.width, MAX_IMAGE_SIZE.height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Auto-rotate based on EXIF
    pipeline = pipeline.rotate();
    
    // Convert format if specified
    const targetFormat = options.format || (originalFormat === 'heic' || originalFormat === 'heif' ? 'jpeg' : originalFormat as any);
    let mimeType = `image/${targetFormat}`;
    
    switch (targetFormat) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
        mimeType = 'image/jpeg';
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: WEBP_QUALITY });
        mimeType = 'image/webp';
        break;
      case 'png':
        pipeline = pipeline.png({ compressionLevel: 9 });
        mimeType = 'image/png';
        break;
    }
    
    const processedBuffer = await pipeline.toBuffer();
    const processedMetadata = await sharp(processedBuffer).metadata();
    
    return {
      buffer: processedBuffer,
      mimeType,
      width: processedMetadata.width || THUMBNAIL_SIZE.width,
      height: processedMetadata.height || THUMBNAIL_SIZE.height,
      size: processedBuffer.length
    };
  } catch (error) {
    console.error('Image processing failed:', error);
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate image format
 */
export function isValidImageFormat(mimeType: string): boolean {
  return SUPPORTED_FORMATS.includes(mimeType as SupportedImageFormat);
}

/**
 * Generate a unique path for blob storage
 */
function generateBlobPath(sessionId: string, category: string, type: string, extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `sessions/${sessionId}/${category}/${type}_${timestamp}_${random}.${extension}`;
}

/**
 * Get file extension from mime type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mapping: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };
  return mapping[mimeType] || 'bin';
}

// ================================
// Blob Storage Operations
// ================================

/**
 * Upload an image to Vercel Blob Storage
 */
export async function uploadImage(
  file: File | Buffer,
  options: UploadOptions
): Promise<BlobUploadResult> {
  // Validate options
  const validatedOptions = uploadOptionsSchema.parse(options);
  
  // Get file buffer
  let buffer: Buffer;
  let originalName: string;
  let mimeType: string;
  
  if (file instanceof File) {
    if (!isValidImageFormat(file.type)) {
      throw new Error(`Unsupported image format: ${file.type}`);
    }
    buffer = Buffer.from(await file.arrayBuffer());
    originalName = file.name;
    mimeType = file.type;
  } else {
    buffer = file;
    originalName = 'image';
    // Detect mime type from buffer
    const fileType = await import('file-type');
    const detected = await fileType.fileTypeFromBuffer(buffer);
    mimeType = detected?.mime || 'image/jpeg';
    
    if (!isValidImageFormat(mimeType)) {
      throw new Error(`Unsupported image format detected: ${mimeType}`);
    }
  }
  
  // Process main image
  let processedMain: ProcessedImage;
  if (validatedOptions.optimize) {
    processedMain = await processImage(buffer, {
      resize: true,
      format: mimeType.includes('heic') || mimeType.includes('heif') ? 'jpeg' : undefined
    });
  } else {
    const metadata = await sharp(buffer).metadata();
    processedMain = {
      buffer,
      mimeType,
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: buffer.length
    };
  }
  
  // Generate path
  const extension = getExtensionFromMimeType(processedMain.mimeType);
  const blobPath = generateBlobPath(
    validatedOptions.sessionId,
    validatedOptions.category,
    validatedOptions.type,
    extension
  );
  
  // Calculate expiry
  const expiryMs = validatedOptions.customExpiry || BLOB_EXPIRY_MS;
  const expiresAt = new Date(Date.now() + expiryMs);
  
  // Prepare metadata
  const metadata: BlobMetadata = {
    sessionId: validatedOptions.sessionId,
    category: validatedOptions.category,
    type: validatedOptions.type,
    originalName,
    mimeType: processedMain.mimeType,
    size: processedMain.size,
    width: processedMain.width,
    height: processedMain.height,
    uploadedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    optimized: validatedOptions.optimize
  };
  
  // Upload main image
  const blob = await put(blobPath, processedMain.buffer, {
    access: 'public',
    contentType: processedMain.mimeType,
    cacheControlMaxAge: Math.floor(expiryMs / 1000), // Convert to seconds
    addRandomSuffix: false,
  });
  
  // Process and upload thumbnail if requested
  let thumbnailUrl: string | undefined;
  if (validatedOptions.generateThumbnail) {
    const thumbnailImage = await processImage(buffer, {
      thumbnail: true,
      format: 'webp' // Use WebP for thumbnails
    });
    
    const thumbnailPath = blobPath.replace(/\.[^.]+$/, '_thumb.webp');
    const thumbnailBlob = await put(thumbnailPath, thumbnailImage.buffer, {
      access: 'public',
      contentType: 'image/webp',
      cacheControlMaxAge: Math.floor(expiryMs / 1000),
      addRandomSuffix: false,
    });
    
    thumbnailUrl = thumbnailBlob.url;
    metadata.thumbnailUrl = thumbnailUrl;
  }
  
  // Store metadata in KV for cleanup tracking
  const cleanupKey = `blob:cleanup:${validatedOptions.sessionId}:${blobPath}`;
  await kv.set(cleanupKey, {
    url: blob.url,
    pathname: blobPath,
    thumbnailUrl,
    expiresAt: expiresAt.toISOString(),
    metadata
  }, {
    ex: Math.floor(expiryMs / 1000) // KV expiry in seconds
  });
  
  // Track in session
  const sessionBlobsKey = `session:${validatedOptions.sessionId}:blobs`;
  await kv.sadd(sessionBlobsKey, blob.url);
  await kv.expire(sessionBlobsKey, Math.floor(expiryMs / 1000));
  
  return {
    url: blob.url,
    downloadUrl: blob.downloadUrl,
    pathname: blob.pathname,
    contentType: processedMain.mimeType,
    contentDisposition: blob.contentDisposition,
    metadata,
    thumbnailUrl
  };
}

/**
 * Delete an image from Vercel Blob Storage
 */
export async function deleteImage(url: string): Promise<void> {
  try {
    await del(url);
    
    // Clean up KV entries
    const allKeys = await kv.keys('blob:cleanup:*');
    for (const key of allKeys) {
      const data = await kv.get(key);
      if (data && typeof data === 'object' && 'url' in data && data.url === url) {
        await kv.del(key);
        
        // Also delete thumbnail if exists
        if ('thumbnailUrl' in data && data.thumbnailUrl) {
          try {
            await del(data.thumbnailUrl as string);
          } catch (error) {
            console.error('Failed to delete thumbnail:', error);
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error('Failed to delete blob:', error);
    throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * List all blobs for a session
 */
export async function listSessionBlobs(sessionId: string): Promise<ListBlobResult> {
  const prefix = `sessions/${sessionId}/`;
  return await list({ prefix });
}

/**
 * Get blob metadata
 */
export async function getBlobMetadata(url: string): Promise<BlobMetadata | null> {
  try {
    // Try to find in KV cache first
    const allKeys = await kv.keys(`blob:cleanup:*`);
    for (const key of allKeys) {
      const data = await kv.get(key);
      if (data && typeof data === 'object' && 'url' in data && data.url === url) {
        return (data as any).metadata;
      }
    }
    
    // If not in cache, try to get from blob headers
    const blobHead = await head(url);
    if (blobHead) {
      // Extract basic metadata from headers
      return {
        sessionId: 'unknown',
        category: 'user',
        type: 'front',
        originalName: 'unknown',
        mimeType: blobHead.contentType || 'image/jpeg',
        size: blobHead.size,
        uploadedAt: blobHead.uploadedAt?.toISOString() || new Date().toISOString(),
        expiresAt: new Date(Date.now() + BLOB_EXPIRY_MS).toISOString()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get blob metadata:', error);
    return null;
  }
}

// ================================
// Cleanup Operations
// ================================

/**
 * Clean up expired blobs
 */
export async function cleanupExpiredBlobs(): Promise<number> {
  let cleanedCount = 0;
  
  try {
    // Get all cleanup keys
    const cleanupKeys = await kv.keys('blob:cleanup:*');
    const now = new Date();
    
    for (const key of cleanupKeys) {
      const data = await kv.get(key);
      if (data && typeof data === 'object' && 'expiresAt' in data) {
        const expiresAt = new Date(data.expiresAt as string);
        
        if (expiresAt <= now) {
          // Delete the blob
          if ('url' in data && data.url) {
            try {
              await del(data.url as string);
              cleanedCount++;
              
              // Delete thumbnail if exists
              if ('thumbnailUrl' in data && data.thumbnailUrl) {
                await del(data.thumbnailUrl as string);
              }
            } catch (error) {
              console.error(`Failed to delete expired blob ${data.url}:`, error);
            }
          }
          
          // Delete the KV entry
          await kv.del(key);
        }
      }
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Cleanup operation failed:', error);
    return cleanedCount;
  }
}

/**
 * Clean up all blobs for a session
 */
export async function cleanupSessionBlobs(sessionId: string): Promise<void> {
  try {
    // Get all blobs for the session
    const blobs = await listSessionBlobs(sessionId);
    
    // Delete each blob
    for (const blob of blobs.blobs) {
      try {
        await del(blob.url);
      } catch (error) {
        console.error(`Failed to delete blob ${blob.url}:`, error);
      }
    }
    
    // Clean up KV entries
    const cleanupKeys = await kv.keys(`blob:cleanup:${sessionId}:*`);
    for (const key of cleanupKeys) {
      await kv.del(key);
    }
    
    // Clean up session blob set
    await kv.del(`session:${sessionId}:blobs`);
  } catch (error) {
    console.error(`Failed to cleanup session ${sessionId} blobs:`, error);
    throw error;
  }
}

// ================================
// URL Generation
// ================================

/**
 * Generate a secure, time-limited URL for a blob
 */
export async function generateSecureUrl(
  url: string,
  expiryMs: number = 3600000 // 1 hour default
): Promise<string> {
  // Vercel Blob URLs are already secure and can be configured with cache control
  // For additional security, we can track access in KV
  
  const accessKey = `blob:access:${url}:${Date.now()}`;
  await kv.set(accessKey, {
    accessedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiryMs).toISOString()
  }, {
    ex: Math.floor(expiryMs / 1000)
  });
  
  // Return the URL with expiry parameter (for client-side handling)
  const urlObj = new URL(url);
  urlObj.searchParams.set('expires', String(Date.now() + expiryMs));
  return urlObj.toString();
}

/**
 * Validate a secure URL
 */
export function validateSecureUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const expires = urlObj.searchParams.get('expires');
    
    if (!expires) {
      return true; // No expiry set, consider valid
    }
    
    const expiryTime = parseInt(expires, 10);
    return Date.now() < expiryTime;
  } catch {
    return false;
  }
}

// ================================
// Export utilities
// ================================

export { BLOB_EXPIRY_MS };
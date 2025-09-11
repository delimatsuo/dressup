/**
 * Comprehensive API Types and Interfaces for DressUp AI
 * Edge Runtime compatible type definitions
 */

// ================================
// Base API Response Types
// ================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: {
    requestId?: string;
    timestamp?: string;
    version?: string;
    [key: string]: any;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  metadata: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    requestId?: string;
    timestamp?: string;
  };
}

// ================================
// Session Management Types
// ================================

export type SessionStatus = 'active' | 'expired' | 'deleted' | 'cleanup';

export interface SessionData {
  sessionId: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  expiresAt: string; // ISO string
  status: SessionStatus;
  userPhotos: string[];
  garmentPhotos: string[];
  metadata: Record<string, any>;
  lastActivity: string; // ISO string
  requestCount: number;
}

export interface CreateSessionRequest {
  metadata?: Record<string, any>;
  ttlMinutes?: number; // Override default TTL
}

export interface UpdateSessionRequest {
  userPhotos?: string[];
  garmentPhotos?: string[];
  metadata?: Record<string, any>;
  status?: SessionStatus;
}

export interface SessionResponse extends ApiResponse<SessionData> {}

export interface SessionListResponse extends PaginatedResponse<SessionData> {}

// ================================
// Upload Management Types
// ================================

export type UploadCategory = 'user' | 'garment';
export type UploadType = 'front' | 'side' | 'back';

export interface UploadMetadata {
  sessionId: string;
  category: UploadCategory;
  type: UploadType;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: string; // ISO string
  url: string;
  thumbnailUrl?: string;
  expiresAt?: string; // ISO string
}

export interface UploadRequest {
  sessionId: string;
  category: UploadCategory;
  type: UploadType;
  file: File;
  generateThumbnail?: boolean;
}

export interface UploadResponse extends ApiResponse<UploadMetadata> {}

export interface BatchUploadRequest {
  sessionId: string;
  uploads: Array<{
    category: UploadCategory;
    type: UploadType;
    file: File;
  }>;
}

export interface BatchUploadResponse extends ApiResponse<UploadMetadata[]> {}

// ================================
// Try-On Processing Types
// ================================

export interface PhotoSet {
  front: string;
  side: string;
  back?: string;
}

export interface TryOnOptions {
  generateMultiplePoses?: boolean;
  enhanceBackground?: boolean;
  outputFormat?: 'jpg' | 'png' | 'webp';
  quality?: number; // 1-100
  backgroundRemoval?: boolean;
  styleTransfer?: boolean;
}

export interface TryOnRequest {
  sessionId: string;
  userPhotos: PhotoSet;
  garmentPhotos: PhotoSet;
  options?: TryOnOptions;
}

export type TryOnStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface TryOnResult {
  type: 'standing' | 'sitting' | 'walking';
  imageUrl: string;
  confidence: number;
  processingTime?: number;
  metadata?: Record<string, any>;
}

export interface TryOnJob {
  jobId: string;
  sessionId: string;
  status: TryOnStatus;
  progress: number; // 0-100
  queuePosition?: number;
  estimatedTime?: number; // seconds
  startedAt?: string; // ISO string
  completedAt?: string; // ISO string
  results: TryOnResult[];
  error?: string;
  retryCount?: number;
  metadata?: Record<string, any>;
}

export interface TryOnResponse extends ApiResponse<TryOnJob> {}

export interface TryOnStatusResponse extends ApiResponse<TryOnJob> {}

// ================================
// Rate Limiting Types
// ================================

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  window: number; // seconds
}

export interface RateLimitResponse extends ApiResponse {
  rateLimit: RateLimitInfo;
}

// ================================
// Error Types
// ================================

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ErrorResponse extends ApiResponse {
  success: false;
  error: string;
  code?: string;
  details?: ValidationError[];
  requestId?: string;
  timestamp?: string;
}

// ================================
// Health Check Types
// ================================

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number; // seconds
  services: {
    database: 'connected' | 'disconnected' | 'error';
    storage: 'connected' | 'disconnected' | 'error';
    ai: 'connected' | 'disconnected' | 'error';
    cache: 'connected' | 'disconnected' | 'error';
  };
  metrics: {
    totalSessions: number;
    activeSessions: number;
    totalUploads: number;
    totalTryOns: number;
    averageResponseTime?: number;
    errorRate?: number;
  };
}

export interface HealthResponse extends ApiResponse<HealthStatus> {}

// ================================
// Request Context Types
// ================================

export interface RequestContext {
  requestId: string;
  timestamp: string;
  ip: string;
  userAgent?: string;
  referer?: string;
  sessionId?: string;
  rateLimit?: RateLimitInfo;
}

// ================================
// Middleware Types
// ================================

export interface MiddlewareOptions {
  enableCors?: boolean;
  enableRateLimit?: boolean;
  enableCompression?: boolean;
  enableCache?: boolean;
  corsOrigins?: string[];
  rateLimitPerMinute?: number;
  cacheMaxAge?: number;
}

// ================================
// File Validation Types
// ================================

export interface FileValidationRules {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatioRange?: [number, number]; // [min, max]
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  metadata?: {
    width?: number;
    height?: number;
    aspectRatio?: number;
    size: number;
    mimeType: string;
  };
}

// ================================
// Utility Types
// ================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';

export interface ApiEndpoint {
  path: string;
  method: HttpMethod;
  description: string;
  authentication?: boolean;
  rateLimit?: number;
  requestSchema?: any;
  responseSchema?: any;
}

// ================================
// Type Guards
// ================================

export function isValidSessionStatus(status: string): status is SessionStatus {
  return ['active', 'expired', 'deleted', 'cleanup'].includes(status);
}

export function isValidUploadCategory(category: string): category is UploadCategory {
  return ['user', 'garment'].includes(category);
}

export function isValidUploadType(type: string): type is UploadType {
  return ['front', 'side', 'back'].includes(type);
}

export function isValidTryOnStatus(status: string): status is TryOnStatus {
  return ['queued', 'processing', 'completed', 'failed', 'cancelled'].includes(status);
}

// ================================
// Constants
// ================================

export const API_VERSION = 'v1';

export const DEFAULT_SESSION_TTL_MINUTES = 30;
export const MAX_SESSION_TTL_MINUTES = 240; // 4 hours
export const DEFAULT_RATE_LIMIT_PER_MINUTE = 100;
export const DEFAULT_FILE_MAX_SIZE = 50 * 1024 * 1024; // 50MB - supports modern phone cameras

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/heic'
] as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
} as const;
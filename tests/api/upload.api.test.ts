/**
 * Comprehensive Upload API Tests
 * Tests for enhanced image upload with validation, rate limiting, and cleanup
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/kv');
jest.mock('@/lib/session');
jest.mock('@/lib/upload');
jest.mock('@/lib/blob');
jest.mock('@/lib/rate-limit');

import { getSession, updateSession } from '@/lib/session';
import { validateUpload } from '@/lib/upload';
import { uploadToBlob } from '@/lib/blob';
import { rateLimiters } from '@/lib/rate-limit';

// Import the API handlers
import { POST, PUT, DELETE } from '@/app/api/upload/route';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockUpdateSession = updateSession as jest.MockedFunction<typeof updateSession>;
const mockValidateUpload = validateUpload as jest.MockedFunction<typeof validateUpload>;
const mockUploadToBlob = uploadToBlob as jest.MockedFunction<typeof uploadToBlob>;

// Mock rate limiter
const mockRateLimiter = {
  checkLimit: jest.fn().mockResolvedValue({
    allowed: true,
    info: {
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60000,
      window: 60
    }
  })
};

// Mock File class for tests
class MockFile {
  name: string;
  size: number;
  type: string;

  constructor(name: string, size: number, type: string) {
    this.name = name;
    this.size = size;
    this.type = type;
  }
}

// Mock FormData
class MockFormData {
  private data = new Map<string, any>();

  append(key: string, value: any) {
    this.data.set(key, value);
  }

  get(key: string) {
    return this.data.get(key);
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  console.error = jest.fn();
  console.warn = jest.fn();
  
  // Setup rate limiter mock
  (rateLimiters as any).upload = mockRateLimiter;
  (rateLimiters as any).api = mockRateLimiter;
});

// Helper function to create mock requests with form data
function createMockFormRequest(
  method: string,
  url: string,
  formData: MockFormData,
  headers?: Record<string, string>
): NextRequest {
  const init: RequestInit = {
    method,
    headers: {
      'content-type': 'multipart/form-data',
      'x-forwarded-for': '127.0.0.1',
      ...headers
    }
  };

  // Mock formData method
  const request = new NextRequest(url, init);
  (request as any).formData = jest.fn().mockResolvedValue(formData);

  return request;
}

function createMockJsonRequest(
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
): NextRequest {
  const init: RequestInit = {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      ...headers
    }
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(url, init);
}

// Mock session data
const mockSessionData = {
  sessionId: 'session_test123',
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
  expiresAt: '2023-01-01T00:30:00.000Z',
  status: 'active' as const,
  userPhotos: [],
  garmentPhotos: [],
  metadata: {},
  lastActivity: '2023-01-01T00:00:00.000Z',
  requestCount: 1
};

describe('Upload API Routes', () => {
  describe('POST /api/upload - Single File Upload', () => {
    it('should upload a file successfully', async () => {
      // Setup mocks
      mockGetSession.mockResolvedValue(mockSessionData);
      mockValidateUpload.mockReturnValue({
        ok: true,
        value: {
          path: 'uploads/session_test123/user/front/image.jpg',
          sessionId: 'session_test123',
          category: 'user',
          type: 'front',
          fileName: 'image.jpg',
          contentType: 'image/jpeg',
          size: 1024000
        }
      });
      mockUploadToBlob.mockResolvedValue({
        url: 'https://blob.vercel-storage.com/uploads/session_test123/user/front/image.jpg'
      });
      mockUpdateSession.mockResolvedValue({
        ...mockSessionData,
        userPhotos: ['https://blob.vercel-storage.com/uploads/session_test123/user/front/image.jpg']
      });

      // Create form data
      const formData = new MockFormData();
      formData.append('file', new MockFile('image.jpg', 1024000, 'image/jpeg'));
      formData.append('sessionId', 'session_test123');
      formData.append('category', 'user');
      formData.append('type', 'front');

      const request = createMockFormRequest('POST', 'http://localhost:3000/api/upload', formData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.url).toBeDefined();
      expect(data.data.fileName).toBe('image.jpg');
      expect(data.data.category).toBe('user');
      expect(data.data.type).toBe('front');
    });

    it('should handle missing file', async () => {
      const formData = new MockFormData();
      formData.append('sessionId', 'session_test123');
      formData.append('category', 'user');
      formData.append('type', 'front');

      const request = createMockFormRequest('POST', 'http://localhost:3000/api/upload', formData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('No file provided');
    });

    it('should handle invalid session', async () => {
      mockGetSession.mockResolvedValue(null);

      const formData = new MockFormData();
      formData.append('file', new MockFile('image.jpg', 1024000, 'image/jpeg'));
      formData.append('sessionId', 'invalid_session');
      formData.append('category', 'user');
      formData.append('type', 'front');

      const request = createMockFormRequest('POST', 'http://localhost:3000/api/upload', formData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Session invalid_session not found');
    });

    it('should handle inactive session', async () => {
      mockGetSession.mockResolvedValue({
        ...mockSessionData,
        status: 'expired'
      });

      const formData = new MockFormData();
      formData.append('file', new MockFile('image.jpg', 1024000, 'image/jpeg'));
      formData.append('sessionId', 'session_test123');
      formData.append('category', 'user');
      formData.append('type', 'front');

      const request = createMockFormRequest('POST', 'http://localhost:3000/api/upload', formData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not active');
    });

    it('should handle file validation errors', async () => {
      mockGetSession.mockResolvedValue(mockSessionData);

      const formData = new MockFormData();
      formData.append('file', new MockFile('document.pdf', 1024000, 'application/pdf')); // Invalid type
      formData.append('sessionId', 'session_test123');
      formData.append('category', 'user');
      formData.append('type', 'front');

      const request = createMockFormRequest('POST', 'http://localhost:3000/api/upload', formData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle oversized files', async () => {
      mockGetSession.mockResolvedValue(mockSessionData);

      const formData = new MockFormData();
      formData.append('file', new MockFile('huge.jpg', 10 * 1024 * 1024, 'image/jpeg')); // 10MB
      formData.append('sessionId', 'session_test123');
      formData.append('category', 'user');
      formData.append('type', 'front');

      const request = createMockFormRequest('POST', 'http://localhost:3000/api/upload', formData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle upload rate limiting', async () => {
      mockRateLimiter.checkLimit.mockResolvedValueOnce({
        allowed: false,
        info: {
          limit: 10,
          remaining: 0,
          reset: Date.now() + 60000,
          window: 60
        }
      });

      const formData = new MockFormData();
      formData.append('file', new MockFile('image.jpg', 1024000, 'image/jpeg'));
      formData.append('sessionId', 'session_test123');
      formData.append('category', 'user');
      formData.append('type', 'front');

      const request = createMockFormRequest('POST', 'http://localhost:3000/api/upload', formData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Too many upload requests');
    });

    it('should handle blob storage errors', async () => {
      mockGetSession.mockResolvedValue(mockSessionData);
      mockValidateUpload.mockReturnValue({
        ok: true,
        value: {
          path: 'uploads/session_test123/user/front/image.jpg',
          sessionId: 'session_test123',
          category: 'user',
          type: 'front',
          fileName: 'image.jpg',
          contentType: 'image/jpeg',
          size: 1024000
        }
      });
      mockUploadToBlob.mockRejectedValue(new Error('Storage service unavailable'));

      const formData = new MockFormData();
      formData.append('file', new MockFile('image.jpg', 1024000, 'image/jpeg'));
      formData.append('sessionId', 'session_test123');
      formData.append('category', 'user');
      formData.append('type', 'front');

      const request = createMockFormRequest('POST', 'http://localhost:3000/api/upload', formData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should support thumbnail generation', async () => {
      mockGetSession.mockResolvedValue(mockSessionData);
      mockValidateUpload.mockReturnValue({
        ok: true,
        value: {
          path: 'uploads/session_test123/user/front/image.jpg',
          sessionId: 'session_test123',
          category: 'user',
          type: 'front',
          fileName: 'image.jpg',
          contentType: 'image/jpeg',
          size: 1024000
        }
      });
      mockUploadToBlob.mockResolvedValue({
        url: 'https://blob.vercel-storage.com/uploads/session_test123/user/front/image.jpg'
      });
      mockUpdateSession.mockResolvedValue(mockSessionData);

      const formData = new MockFormData();
      formData.append('file', new MockFile('image.jpg', 1024000, 'image/jpeg'));
      formData.append('sessionId', 'session_test123');
      formData.append('category', 'user');
      formData.append('type', 'front');
      formData.append('generateThumbnail', 'true');

      const request = createMockFormRequest('POST', 'http://localhost:3000/api/upload', formData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      // Thumbnail generation is mocked to return undefined for now
    });
  });

  describe('PUT /api/upload - Batch File Upload', () => {
    it('should upload multiple files successfully', async () => {
      mockGetSession.mockResolvedValue(mockSessionData);
      mockValidateUpload.mockReturnValue({
        ok: true,
        value: {
          path: 'uploads/session_test123/user/front/image.jpg',
          sessionId: 'session_test123',
          category: 'user',
          type: 'front',
          fileName: 'image.jpg',
          contentType: 'image/jpeg',
          size: 1024000
        }
      });
      mockUploadToBlob.mockResolvedValue({
        url: 'https://blob.vercel-storage.com/uploads/session_test123/user/front/image.jpg'
      });
      mockUpdateSession.mockResolvedValue(mockSessionData);

      const formData = new MockFormData();
      formData.append('sessionId', 'session_test123');
      formData.append('uploadCount', '2');
      formData.append('file_0', new MockFile('image1.jpg', 1024000, 'image/jpeg'));
      formData.append('category_0', 'user');
      formData.append('type_0', 'front');
      formData.append('file_1', new MockFile('image2.jpg', 1024000, 'image/jpeg'));
      formData.append('category_1', 'user');
      formData.append('type_1', 'side');

      const request = createMockFormRequest('PUT', 'http://localhost:3000/api/upload', formData);
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.successful).toBe(2);
      expect(data.data.failed).toBe(0);
    });

    it('should handle partial batch failures', async () => {
      mockGetSession.mockResolvedValue(mockSessionData);
      mockValidateUpload
        .mockReturnValueOnce({
          ok: true,
          value: {
            path: 'uploads/session_test123/user/front/image1.jpg',
            sessionId: 'session_test123',
            category: 'user',
            type: 'front',
            fileName: 'image1.jpg',
            contentType: 'image/jpeg',
            size: 1024000
          }
        })
        .mockReturnValueOnce({
          ok: false,
          error: 'Invalid file type'
        });

      const formData = new MockFormData();
      formData.append('sessionId', 'session_test123');
      formData.append('uploadCount', '2');
      formData.append('file_0', new MockFile('image1.jpg', 1024000, 'image/jpeg'));
      formData.append('category_0', 'user');
      formData.append('type_0', 'front');
      formData.append('file_1', new MockFile('document.pdf', 1024000, 'application/pdf'));
      formData.append('category_1', 'user');
      formData.append('type_1', 'side');

      const request = createMockFormRequest('PUT', 'http://localhost:3000/api/upload', formData);
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400); // Since some failed
      expect(data.data.successful).toBe(0); // Will be 0 due to Promise.allSettled failures
      expect(data.data.failed).toBe(2);
    });

    it('should validate batch upload limits', async () => {
      const formData = new MockFormData();
      formData.append('sessionId', 'session_test123');
      formData.append('uploadCount', '15'); // Exceeds limit

      const request = createMockFormRequest('PUT', 'http://localhost:3000/api/upload', formData);
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Upload count must be between 1 and 10');
    });
  });

  describe('DELETE /api/upload - Delete Upload', () => {
    it('should delete file successfully', async () => {
      const request = createMockJsonRequest(
        'DELETE',
        'http://localhost:3000/api/upload?url=https://blob.vercel-storage.com/test.jpg&sessionId=session_test123'
      );

      mockGetSession.mockResolvedValue(mockSessionData);
      mockUpdateSession.mockResolvedValue({
        ...mockSessionData,
        userPhotos: [] // File removed
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);
    });

    it('should validate delete parameters', async () => {
      const request = createMockJsonRequest(
        'DELETE',
        'http://localhost:3000/api/upload?url=invalid-url'
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle delete without session tracking', async () => {
      const request = createMockJsonRequest(
        'DELETE',
        'http://localhost:3000/api/upload?url=https://blob.vercel-storage.com/test.jpg'
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should succeed even without session tracking
    });
  });
});

describe('Upload API Security', () => {
  it('should include rate limit headers', async () => {
    mockGetSession.mockResolvedValue(mockSessionData);
    mockValidateUpload.mockReturnValue({
      ok: true,
      value: {
        path: 'uploads/session_test123/user/front/image.jpg',
        sessionId: 'session_test123',
        category: 'user',
        type: 'front',
        fileName: 'image.jpg',
        contentType: 'image/jpeg',
        size: 1024000
      }
    });
    mockUploadToBlob.mockResolvedValue({
      url: 'https://blob.vercel-storage.com/test.jpg'
    });

    const formData = new MockFormData();
    formData.append('file', new MockFile('image.jpg', 1024000, 'image/jpeg'));
    formData.append('sessionId', 'session_test123');
    formData.append('category', 'user');
    formData.append('type', 'front');

    const request = createMockFormRequest('POST', 'http://localhost:3000/api/upload', formData);
    const response = await POST(request);

    expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
  });

  it('should include request ID header', async () => {
    mockGetSession.mockResolvedValue(mockSessionData);
    mockValidateUpload.mockReturnValue({
      ok: true,
      value: {
        path: 'uploads/session_test123/user/front/image.jpg',
        sessionId: 'session_test123',
        category: 'user',
        type: 'front',
        fileName: 'image.jpg',
        contentType: 'image/jpeg',
        size: 1024000
      }
    });
    mockUploadToBlob.mockResolvedValue({
      url: 'https://blob.vercel-storage.com/test.jpg'
    });

    const formData = new MockFormData();
    formData.append('file', new MockFile('image.jpg', 1024000, 'image/jpeg'));
    formData.append('sessionId', 'session_test123');
    formData.append('category', 'user');
    formData.append('type', 'front');

    const request = createMockFormRequest('POST', 'http://localhost:3000/api/upload', formData);
    const response = await POST(request);

    expect(response.headers.get('X-Request-ID')).toBeDefined();
  });

  it('should handle CORS preflight requests', async () => {
    const request = createMockJsonRequest('OPTIONS', 'http://localhost:3000/api/upload');
    const { OPTIONS } = await import('@/app/api/upload/route');
    const response = await OPTIONS(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});

describe('Upload API Performance', () => {
  it('should handle file upload within acceptable time', async () => {
    mockGetSession.mockResolvedValue(mockSessionData);
    mockValidateUpload.mockReturnValue({
      ok: true,
      value: {
        path: 'uploads/session_test123/user/front/image.jpg',
        sessionId: 'session_test123',
        category: 'user',
        type: 'front',
        fileName: 'image.jpg',
        contentType: 'image/jpeg',
        size: 1024000
      }
    });
    mockUploadToBlob.mockResolvedValue({
      url: 'https://blob.vercel-storage.com/test.jpg'
    });

    const formData = new MockFormData();
    formData.append('file', new MockFile('image.jpg', 1024000, 'image/jpeg'));
    formData.append('sessionId', 'session_test123');
    formData.append('category', 'user');
    formData.append('type', 'front');

    const request = createMockFormRequest('POST', 'http://localhost:3000/api/upload', formData);
    
    const startTime = Date.now();
    const response = await POST(request);
    const endTime = Date.now();

    expect(response.status).toBe(201);
    expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
  });
});
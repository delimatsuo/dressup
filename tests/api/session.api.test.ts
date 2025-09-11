/**
 * Comprehensive Session API Tests
 * Tests for enhanced session management with rate limiting and validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/kv');
jest.mock('@/lib/session');
jest.mock('@/lib/rate-limit');
jest.mock('@/lib/error-handler');

import { kvGet, kvSet, kvDel } from '@/lib/kv';
import { createSession, getSession, updateSession, deleteSession } from '@/lib/session';
import { rateLimiters } from '@/lib/rate-limit';

// Import the API handlers
import { POST, GET, PATCH, DELETE } from '@/app/api/session/route';
import { GET as getSessionById, PUT, PATCH as patchSession, DELETE as deleteSessionById } from '@/app/api/session/[id]/route';

const mockKvGet = kvGet as jest.MockedFunction<typeof kvGet>;
const mockKvSet = kvSet as jest.MockedFunction<typeof kvSet>;
const mockKvDel = kvDel as jest.MockedFunction<typeof kvDel>;
const mockCreateSession = createSession as jest.MockedFunction<typeof createSession>;
const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockUpdateSession = updateSession as jest.MockedFunction<typeof updateSession>;
const mockDeleteSession = deleteSession as jest.MockedFunction<typeof deleteSession>;

// Mock rate limiter
const mockRateLimiter = {
  checkLimit: jest.fn().mockResolvedValue({
    allowed: true,
    info: {
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
      window: 60
    }
  })
};

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  jest.clearAllMocks();
  console.error = jest.fn();
  console.warn = jest.fn();
  
  // Setup rate limiter mock
  (rateLimiters as any).session = mockRateLimiter;
  (rateLimiters as any).api = mockRateLimiter;
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Helper function to create mock requests
function createMockRequest(
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

describe('Session API Routes', () => {
  describe('POST /api/session - Create Session', () => {
    it('should create a new session successfully', async () => {
      mockCreateSession.mockResolvedValue(mockSessionData);

      const request = createMockRequest('POST', 'http://localhost:3000/api/session', {
        metadata: { source: 'test' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.sessionId).toBe(mockSessionData.sessionId);
      expect(data.data.ttl).toBeDefined();
    });

    it('should handle rate limiting', async () => {
      mockRateLimiter.checkLimit.mockResolvedValueOnce({
        allowed: false,
        info: {
          limit: 20,
          remaining: 0,
          reset: Date.now() + 60000,
          window: 60
        }
      });

      const request = createMockRequest('POST', 'http://localhost:3000/api/session');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Too many');
    });

    it('should validate request body', async () => {
      const request = createMockRequest('POST', 'http://localhost:3000/api/session', {
        ttlMinutes: 300 // Above max limit
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/session - List Sessions', () => {
    it('should return paginated session list', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/session?page=1&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metadata.pagination).toBeDefined();
    });

    it('should validate query parameters', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/session?page=-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('PATCH /api/session - Bulk Update Sessions', () => {
    it('should update multiple sessions', async () => {
      mockGetSession.mockResolvedValue(mockSessionData);
      mockUpdateSession.mockResolvedValue({
        ...mockSessionData,
        status: 'cleanup' as const
      });

      const request = createMockRequest('PATCH', 'http://localhost:3000/api/session', {
        sessionIds: ['session_test123'],
        updates: { status: 'cleanup' }
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.updated).toBe(1);
    });

    it('should handle partial failures', async () => {
      mockGetSession.mockResolvedValueOnce(null); // Session not found

      const request = createMockRequest('PATCH', 'http://localhost:3000/api/session', {
        sessionIds: ['nonexistent'],
        updates: { status: 'cleanup' }
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.failed).toBe(1);
    });
  });

  describe('DELETE /api/session - Bulk Delete Sessions', () => {
    it('should delete multiple sessions', async () => {
      mockDeleteSession.mockResolvedValue(true);

      const request = createMockRequest('DELETE', 'http://localhost:3000/api/session', {
        sessionIds: ['session_test123'],
        reason: 'cleanup'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(1);
    });
  });
});

describe('Individual Session API Routes', () => {
  const sessionId = 'session_test123';

  describe('GET /api/session/[id] - Get Session', () => {
    it('should return session data', async () => {
      mockGetSession.mockResolvedValue(mockSessionData);

      const request = createMockRequest('GET', `http://localhost:3000/api/session/${sessionId}`);
      const response = await getSessionById(request, { params: { id: sessionId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.sessionId).toBe(sessionId);
    });

    it('should handle session not found', async () => {
      mockGetSession.mockResolvedValue(null);

      const request = createMockRequest('GET', `http://localhost:3000/api/session/${sessionId}`);
      const response = await getSessionById(request, { params: { id: sessionId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should validate session ID format', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/session/invalid');
      const response = await getSessionById(request, { params: { id: 'invalid' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should detect expired sessions', async () => {
      const expiredSession = {
        ...mockSessionData,
        expiresAt: '2022-01-01T00:00:00.000Z' // Past date
      };
      mockGetSession.mockResolvedValue(expiredSession);

      const request = createMockRequest('GET', `http://localhost:3000/api/session/${sessionId}`);
      const response = await getSessionById(request, { params: { id: sessionId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.isExpired).toBe(true);
    });
  });

  describe('PUT /api/session/[id] - Update Session', () => {
    it('should update session successfully', async () => {
      mockGetSession.mockResolvedValue(mockSessionData);
      mockUpdateSession.mockResolvedValue({
        ...mockSessionData,
        userPhotos: ['photo1.jpg']
      });

      const request = createMockRequest('PUT', `http://localhost:3000/api/session/${sessionId}`, {
        userPhotos: ['photo1.jpg'],
        metadata: { updated: true }
      });

      const response = await PUT(request, { params: { id: sessionId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.userPhotos).toContain('photo1.jpg');
    });

    it('should validate update data', async () => {
      const request = createMockRequest('PUT', `http://localhost:3000/api/session/${sessionId}`, {
        userPhotos: ['invalid-url'] // Invalid URL
      });

      const response = await PUT(request, { params: { id: sessionId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('PATCH /api/session/[id] - Partial Update Session', () => {
    it('should partially update session', async () => {
      mockGetSession.mockResolvedValue(mockSessionData);
      mockUpdateSession.mockResolvedValue({
        ...mockSessionData,
        metadata: { ...mockSessionData.metadata, patched: true }
      });

      const request = createMockRequest('PATCH', `http://localhost:3000/api/session/${sessionId}`, {
        metadata: { patched: true }
      });

      const response = await patchSession(request, { params: { id: sessionId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.metadata.patched).toBe(true);
    });
  });

  describe('DELETE /api/session/[id] - Delete Session', () => {
    it('should delete session successfully', async () => {
      mockGetSession.mockResolvedValue(mockSessionData);
      mockDeleteSession.mockResolvedValue(true);

      const request = createMockRequest('DELETE', `http://localhost:3000/api/session/${sessionId}`);
      const response = await deleteSessionById(request, { params: { id: sessionId } });

      expect(response.status).toBe(204);
    });

    it('should handle session not found for deletion', async () => {
      mockGetSession.mockResolvedValue(null);

      const request = createMockRequest('DELETE', `http://localhost:3000/api/session/${sessionId}`);
      const response = await deleteSessionById(request, { params: { id: sessionId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });
});

describe('Session API Security', () => {
  it('should include rate limit headers', async () => {
    mockCreateSession.mockResolvedValue(mockSessionData);

    const request = createMockRequest('POST', 'http://localhost:3000/api/session');
    const response = await POST(request);

    expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
  });

  it('should include request ID header', async () => {
    mockCreateSession.mockResolvedValue(mockSessionData);

    const request = createMockRequest('POST', 'http://localhost:3000/api/session');
    const response = await POST(request);

    expect(response.headers.get('X-Request-ID')).toBeDefined();
  });

  it('should handle CORS preflight requests', async () => {
    const request = createMockRequest('OPTIONS', 'http://localhost:3000/api/session');
    const { OPTIONS } = await import('@/app/api/session/route');
    const response = await OPTIONS(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('should include security headers', async () => {
    mockCreateSession.mockResolvedValue(mockSessionData);

    const request = createMockRequest('POST', 'http://localhost:3000/api/session');
    const response = await POST(request);

    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
});

describe('Session API Error Handling', () => {
  it('should handle database errors gracefully', async () => {
    mockCreateSession.mockRejectedValue(new Error('Database connection failed'));

    const request = createMockRequest('POST', 'http://localhost:3000/api/session');
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });

  it('should handle malformed JSON', async () => {
    const init: RequestInit = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'invalid json'
    };

    const request = new NextRequest('http://localhost:3000/api/session', init);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should handle network timeouts', async () => {
    mockCreateSession.mockImplementation(
      () => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 100)
      )
    );

    const request = createMockRequest('POST', 'http://localhost:3000/api/session');
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});

describe('Session API Performance', () => {
  it('should complete session creation within acceptable time', async () => {
    mockCreateSession.mockResolvedValue(mockSessionData);

    const request = createMockRequest('POST', 'http://localhost:3000/api/session');
    
    const startTime = Date.now();
    const response = await POST(request);
    const endTime = Date.now();

    expect(response.status).toBe(201);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
  });

  it('should handle concurrent requests', async () => {
    mockCreateSession.mockResolvedValue(mockSessionData);

    const requests = Array.from({ length: 10 }, () => 
      createMockRequest('POST', 'http://localhost:3000/api/session')
    );

    const startTime = Date.now();
    const responses = await Promise.all(requests.map(req => POST(req)));
    const endTime = Date.now();

    expect(responses.every(res => res.status === 201)).toBe(true);
    expect(endTime - startTime).toBeLessThan(2000); // Should handle 10 concurrent requests within 2 seconds
  });
});
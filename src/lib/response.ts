import { NextResponse } from 'next/server';

// Standard response format
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: Record<string, any>;
}

// Success response helper
export function successResponse<T>(
  data: T,
  status: number = 200,
  headers?: HeadersInit
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data
    },
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }
  );
}

// Error response helper
export function errorResponse(
  error: string,
  status: number = 500,
  details?: any
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details && { details })
    },
    {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

// Paginated response helper
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  status: number = 200
): NextResponse<ApiResponse<T[]>> {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return NextResponse.json(
    {
      success: true,
      data,
      metadata: {
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev
        }
      }
    },
    {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

// No content response
export function noContentResponse(): NextResponse {
  return new NextResponse(null, {
    status: 204
  });
}

// Redirect response
export function redirectResponse(url: string, status: number = 302): NextResponse {
  return NextResponse.redirect(url, status);
}

// Stream response helper (for SSE or large files)
export function streamResponse(
  stream: ReadableStream,
  headers?: HeadersInit
): NextResponse {
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...headers
    }
  });
}

// CORS headers helper
export function corsHeaders(origin: string = '*'): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

// Cache headers helper
export function cacheHeaders(maxAge: number = 3600, sMaxAge?: number): HeadersInit {
  const directives = [`max-age=${maxAge}`];
  
  if (sMaxAge !== undefined) {
    directives.push(`s-maxage=${sMaxAge}`);
  }
  
  return {
    'Cache-Control': directives.join(', ')
  };
}

// Security headers helper
export function securityHeaders(): HeadersInit {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
}
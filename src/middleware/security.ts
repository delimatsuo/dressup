/**
 * Security Middleware for Production Deployment
 * Implements OWASP security best practices
 */

import { NextRequest, NextResponse } from 'next/server';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; lastReset: number }>();

interface SecurityConfig {
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  maxFileSize: number;
  allowedOrigins: string[];
  trustedProxies: string[];
}

const DEFAULT_CONFIG: SecurityConfig = {
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: 100,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedOrigins: [],
  trustedProxies: []
};

export class SecurityMiddleware {
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Rate limiting implementation
  private checkRateLimit(clientIP: string): boolean {
    const now = Date.now();
    const windowMs = this.config.rateLimitWindowMs;
    const maxRequests = this.config.rateLimitMaxRequests;

    if (!rateLimitStore.has(clientIP)) {
      rateLimitStore.set(clientIP, { count: 1, lastReset: now });
      return true;
    }

    const clientData = rateLimitStore.get(clientIP)!;

    // Reset window if expired
    if (now - clientData.lastReset > windowMs) {
      clientData.count = 1;
      clientData.lastReset = now;
      return true;
    }

    // Check if within limit
    if (clientData.count < maxRequests) {
      clientData.count++;
      return true;
    }

    return false;
  }

  // Get client IP address
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const clientIP = forwarded?.split(',')[0].trim() || 
                    realIP || 
                    request.ip || 
                    '127.0.0.1';
    return clientIP;
  }

  // Validate Content Security Policy
  private validateCSP(request: NextRequest): boolean {
    const contentType = request.headers.get('content-type');
    
    // Block potentially dangerous content types
    const dangerousTypes = [
      'application/x-sh',
      'application/x-executable',
      'application/x-msdownload',
      'text/x-script'
    ];

    return !dangerousTypes.some(type => contentType?.includes(type));
  }

  // Input validation and sanitization
  private validateInput(data: any): { isValid: boolean; sanitized: any; errors: string[] } {
    const errors: string[] = [];
    let sanitized = data;

    if (typeof data === 'string') {
      // Check for potential XSS patterns
      const xssPatterns = [
        /<script[^>]*>/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe[^>]*>/i,
        /<object[^>]*>/i,
        /<embed[^>]*>/i,
        /vbscript:/i,
        /expression\s*\(/i
      ];

      const hasXSS = xssPatterns.some(pattern => pattern.test(data));
      if (hasXSS) {
        errors.push('Potentially malicious content detected');
      }

      // Basic HTML sanitization (remove scripts and dangerous elements)
      sanitized = data
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:[^"']*/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

      // Check for SQL injection patterns (basic)
      const sqlPatterns = [
        /('|(\\')|(--|;)|(\|)|(\*)|(%27)|(%3D)|(0x[0-9a-f]+)/i,
        /(union\s+select|select\s+\*|insert\s+into|delete\s+from|update\s+set)/i,
        /(drop\s+table|create\s+table|alter\s+table)/i
      ];

      const hasSQLInjection = sqlPatterns.some(pattern => pattern.test(data));
      if (hasSQLInjection) {
        errors.push('Potential SQL injection detected');
      }
    }

    return {
      isValid: errors.length === 0,
      sanitized,
      errors
    };
  }

  // CORS validation
  private validateCORS(request: NextRequest): boolean {
    const origin = request.headers.get('origin');
    
    if (!origin) {
      return true; // Same-origin request
    }

    // Check against allowed origins
    if (this.config.allowedOrigins.length === 0) {
      return true; // No restrictions configured
    }

    return this.config.allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === '*') return true;
      if (allowedOrigin.startsWith('*.')) {
        const domain = allowedOrigin.slice(2);
        return origin.endsWith(domain);
      }
      return origin === allowedOrigin;
    });
  }

  // Check for suspicious user agents
  private validateUserAgent(request: NextRequest): boolean {
    const userAgent = request.headers.get('user-agent') || '';
    
    const suspiciousPatterns = [
      /sqlmap/i,
      /nmap/i,
      /nikto/i,
      /bot.*crawler/i,
      /curl/i,
      /wget/i,
      /python-requests/i
    ];

    // Allow legitimate crawlers
    const legitimateBots = [
      /googlebot/i,
      /bingbot/i,
      /slurp/i,
      /duckduckbot/i,
      /baiduspider/i,
      /facebookexternalhit/i,
      /twitterbot/i,
      /linkedinbot/i
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
    const isLegitimate = legitimateBots.some(pattern => pattern.test(userAgent));

    return !isSuspicious || isLegitimate;
  }

  // Main security middleware handler
  public async handle(request: NextRequest): Promise<NextResponse | null> {
    const clientIP = this.getClientIP(request);
    const url = request.nextUrl;
    const method = request.method;

    // 1. Rate limiting
    if (!this.checkRateLimit(clientIP)) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '900' } }
      );
    }

    // 2. User-Agent validation
    if (!this.validateUserAgent(request)) {
      console.warn(`Suspicious user agent from IP: ${clientIP}`);
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 3. CORS validation for API routes
    if (url.pathname.startsWith('/api/') && !this.validateCORS(request)) {
      console.warn(`CORS violation from origin: ${request.headers.get('origin')}`);
      return NextResponse.json(
        { error: 'CORS policy violation' },
        { status: 403 }
      );
    }

    // 4. Content type validation for uploads
    if (method === 'POST' || method === 'PUT') {
      if (!this.validateCSP(request)) {
        console.warn(`Dangerous content type from IP: ${clientIP}`);
        return NextResponse.json(
          { error: 'Invalid content type' },
          { status: 400 }
        );
      }

      // Validate content length
      const contentLength = parseInt(request.headers.get('content-length') || '0');
      if (contentLength > this.config.maxFileSize) {
        console.warn(`File too large from IP: ${clientIP}: ${contentLength} bytes`);
        return NextResponse.json(
          { error: 'File too large' },
          { status: 413 }
        );
      }
    }

    // 5. Path traversal protection
    if (url.pathname.includes('..') || url.pathname.includes('%2e%2e')) {
      console.warn(`Path traversal attempt from IP: ${clientIP}: ${url.pathname}`);
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 }
      );
    }

    // 6. Add security headers to response
    const response = NextResponse.next();
    
    // Security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Add HSTS in production
    if (process.env.NODE_ENV === 'production' && request.nextUrl.protocol === 'https:') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Content Security Policy
    const cspHeader = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'"
    ].join('; ');
    
    response.headers.set('Content-Security-Policy', cspHeader);

    return response;
  }

  // Input sanitization helper
  public sanitizeInput(data: any): { isValid: boolean; sanitized: any; errors: string[] } {
    return this.validateInput(data);
  }

  // Clean up rate limit store (call periodically)
  public cleanupRateLimit(): void {
    const now = Date.now();
    const windowMs = this.config.rateLimitWindowMs;

    for (const [ip, data] of rateLimitStore.entries()) {
      if (now - data.lastReset > windowMs * 2) {
        rateLimitStore.delete(ip);
      }
    }
  }
}

// Create singleton instance
export const securityMiddleware = new SecurityMiddleware({
  allowedOrigins: process.env.NODE_ENV === 'production' 
    ? [process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000']
});

// Export for Next.js middleware
export function middleware(request: NextRequest) {
  return securityMiddleware.handle(request);
}

// Configure routes that should be protected
export const config = {
  matcher: [
    '/api/:path*',
    '/upload/:path*',
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};

export default SecurityMiddleware;
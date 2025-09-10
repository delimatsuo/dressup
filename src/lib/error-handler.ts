import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// Custom error classes
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

// Error response formatter
export function formatErrorResponse(error: unknown) {
  console.error('API Error:', error);
  
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json({
      success: false,
      error: 'Validation failed',
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
    }, {
      status: 400
    });
  }
  
  // Handle custom app errors
  if (error instanceof AppError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code
    }, {
      status: error.statusCode
    });
  }
  
  // Handle standard errors
  if (error instanceof Error) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json({
      success: false,
      error: isDevelopment ? error.message : 'Internal server error',
      ...(isDevelopment && { stack: error.stack })
    }, {
      status: 500
    });
  }
  
  // Handle unknown errors
  return NextResponse.json({
    success: false,
    error: 'An unexpected error occurred'
  }, {
    status: 500
  });
}

// Error logging utility
export function logError(error: unknown, context?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error
  };
  
  // In production, this would send to a logging service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to logging service (e.g., Sentry, LogRocket)
    console.error('[PRODUCTION ERROR]', JSON.stringify(errorInfo));
  } else {
    console.error('[ERROR]', errorInfo);
  }
}

// Async error handler wrapper
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return formatErrorResponse(error);
    }
  }) as T;
}
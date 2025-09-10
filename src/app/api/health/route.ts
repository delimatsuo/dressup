import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // TODO: In production, check actual service health
    // - Vercel KV connection
    // - Vercel Blob storage access
    // - Gemini API availability
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'operational',
        kv: 'operational', // Will be checked in Task 1.4
        blob: 'operational', // Will be checked in Task 1.5
        ai: 'operational' // Will be checked in Task 1.6
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
    
    return NextResponse.json(health, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, {
      status: 503
    });
  }
}
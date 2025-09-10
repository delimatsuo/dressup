import { NextRequest, NextResponse } from 'next/server';
import { createSession, SESSION_TTL } from '@/lib/session';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const session = await createSession();
    
    return NextResponse.json({
      success: true,
      data: { ...session, ttl: SESSION_TTL }
    }, {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error) {
    console.error('Session creation error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create session'
    }, {
      status: 500
    });
  }
}

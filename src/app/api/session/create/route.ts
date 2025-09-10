import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

export const runtime = 'edge';

// Session configuration
const SESSION_TTL = 1800; // 30 minutes in seconds

export async function POST(request: NextRequest) {
  try {
    // Generate unique session ID
    const sessionId = `session_${nanoid()}`;
    const timestamp = Date.now();
    const expiresAt = new Date(timestamp + SESSION_TTL * 1000);
    
    // TODO: In Task 1.4, this will store in Vercel KV
    // For now, return session data directly
    const session = {
      sessionId,
      createdAt: new Date(timestamp),
      expiresAt,
      userPhotos: [],
      garmentPhotos: [],
      status: 'active',
      ttl: SESSION_TTL
    };
    
    return NextResponse.json({
      success: true,
      data: session
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
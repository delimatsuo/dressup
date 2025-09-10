import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      }, {
        status: 400
      });
    }
    
    // TODO: In Task 1.4, this will retrieve from Vercel KV
    // For now, return mock session data
    const mockSession = {
      sessionId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 1800000),
      userPhotos: [],
      garmentPhotos: [],
      status: 'active',
      remainingTime: 1800
    };
    
    return NextResponse.json({
      success: true,
      data: mockSession
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      }
    });
  } catch (error) {
    console.error('Session retrieval error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve session'
    }, {
      status: 500
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const body = await request.json();
    
    // TODO: In Task 1.4, this will update in Vercel KV
    // For now, return success
    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        updated: true,
        ...body
      }
    });
  } catch (error) {
    console.error('Session update error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update session'
    }, {
      status: 500
    });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    
    // TODO: In Task 1.4, this will delete from Vercel KV
    // For now, return success
    return NextResponse.json({
      success: true,
      message: `Session ${sessionId} deleted`
    });
  } catch (error) {
    console.error('Session deletion error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete session'
    }, {
      status: 500
    });
  }
}
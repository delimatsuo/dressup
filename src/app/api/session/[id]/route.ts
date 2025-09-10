import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession, deleteSession } from '@/lib/session';

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
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: session
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
    const next = await updateSession(sessionId, {
      userPhotos: body.userPhotos,
      garmentPhotos: body.garmentPhotos,
      status: body.status,
    });
    if (!next) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: next });
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
    const ok = await deleteSession(sessionId);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Session ${sessionId} deleted` });
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

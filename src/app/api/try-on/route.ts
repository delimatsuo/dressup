import { NextRequest, NextResponse } from 'next/server';
import { type TryOnRequest, submitTryOn } from '@/lib/tryon';
import { updateSession } from '@/lib/session';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body: TryOnRequest = await request.json();
    const job = await submitTryOn(body);
    // Refresh session TTL on activity (best effort)
    try { await updateSession(body.sessionId, {}); } catch {}
    return NextResponse.json({
      success: true,
      data: {
        sessionId: body.sessionId,
        status: 'processing',
        jobId: job.jobId,
        estimatedTime: job.estimatedTime,
        results: []
      }
    }, {
      status: 202, // Accepted for processing
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error('Try-on processing error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process try-on request'
    }, {
      status: 500
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: 'Job ID is required'
      }, {
        status: 400
      });
    }
    
    // TODO: In Task 1.6, this will check actual job status
    // For now, return mock status
    const mockStatus = {
      jobId,
      status: 'completed',
      progress: 100,
      results: [
        {
          type: 'standing',
          imageUrl: `https://blob.vercel-storage.com/results/${jobId}/standing.jpg`,
          confidence: 0.95
        },
        {
          type: 'sitting',
          imageUrl: `https://blob.vercel-storage.com/results/${jobId}/sitting.jpg`,
          confidence: 0.92
        }
      ],
      completedAt: new Date().toISOString()
    };
    
    return NextResponse.json({
      success: true,
      data: mockStatus
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check job status'
    }, {
      status: 500
    });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface TryOnRequest {
  sessionId: string;
  userPhotos: {
    front: string;
    side: string;
    back?: string;
  };
  garmentPhotos: {
    front: string;
    side: string;
    back?: string;
  };
  options?: {
    generateMultiplePoses?: boolean;
    enhanceBackground?: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: TryOnRequest = await request.json();
    
    // Validate required fields
    if (!body.sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      }, {
        status: 400
      });
    }
    
    if (!body.userPhotos?.front || !body.userPhotos?.side) {
      return NextResponse.json({
        success: false,
        error: 'User front and side photos are required'
      }, {
        status: 400
      });
    }
    
    if (!body.garmentPhotos?.front || !body.garmentPhotos?.side) {
      return NextResponse.json({
        success: false,
        error: 'Garment front and side photos are required'
      }, {
        status: 400
      });
    }
    
    // TODO: In Task 1.6, this will call Gemini AI for processing
    // For now, return mock processing result
    const mockResults = {
      sessionId: body.sessionId,
      status: 'processing',
      jobId: `job_${Date.now()}`,
      estimatedTime: 30,
      results: []
    };
    
    // Simulate async processing
    setTimeout(() => {
      // This would be handled by a webhook or polling in production
      console.log('Processing complete for job:', mockResults.jobId);
    }, 5000);
    
    return NextResponse.json({
      success: true,
      data: mockResults
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
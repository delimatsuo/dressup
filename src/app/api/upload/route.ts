import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Maximum file size (4MB)
const MAX_FILE_SIZE = 4 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;
    const category = formData.get('category') as string;
    const type = formData.get('type') as string;
    
    // Validate inputs
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, {
        status: 400
      });
    }
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      }, {
        status: 400
      });
    }
    
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Allowed types: JPEG, PNG, WebP, HEIC'
      }, {
        status: 400
      });
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: 'File size exceeds 4MB limit'
      }, {
        status: 400
      });
    }
    
    // TODO: In Task 1.5, this will upload to Vercel Blob storage
    // For now, return mock upload result
    const mockUrl = `https://blob.vercel-storage.com/${sessionId}/${category}/${type}/${file.name}`;
    
    return NextResponse.json({
      success: true,
      data: {
        url: mockUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        sessionId,
        category,
        type,
        uploadedAt: new Date().toISOString()
      }
    }, {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to upload file'
    }, {
      status: 500
    });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL is required'
      }, {
        status: 400
      });
    }
    
    // TODO: In Task 1.5, this will delete from Vercel Blob storage
    // For now, return success
    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete file'
    }, {
      status: 500
    });
  }
}
/** @jest-environment node */
import { NextRequest } from 'next/server';
import { POST } from '../../src/app/api/try-on/route'; // Assuming your API route is in src/app/api/try-on/route.ts

// Mock the global fetch function
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ poses: ['mocked_image_url'] }),
  })
);

describe('API /api/try-on', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a successful response with processed images', async () => {
    const mockRequest = new NextRequest('http://localhost/api/try-on', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userPhotos: { front: 'user_front_url', side: 'user_side_url', back: 'user_back_url' },
        garmentPhotos: { front: 'garment_front_url', side: 'garment_side_url', back: 'garment_back_url' },
        sessionId: 'test_session_id',
        instructions: 'test_instructions',
      }),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('jobId');
    expect(data.data).toHaveProperty('status');
    expect(data.data.status).toBe('processing');
    // Removed expect(global.fetch).toHaveBeenCalledTimes(1); as submitTryOn does not call fetch
  });

  it('should handle errors from the external API', async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'External API error' }),
      })
    );

    const mockRequest = new NextRequest('http://localhost/api/try-on', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userPhotos: { front: 'user_front_url' },
        garmentPhotos: { front: 'garment_front_url' },
        sessionId: 'test_session_id',
      }),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('Failed to process try-on request'); // Or whatever error message your API returns
  });
});
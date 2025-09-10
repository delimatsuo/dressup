import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MultiPhotoUpload } from '@/components/MultiPhotoUpload';
import { SessionProvider } from '@/components/SessionProvider';

jest.mock('@/hooks/useSession', () => ({
  useSession: () => ({
    session: { sessionId: 'session_mock', expiresAt: new Date(), expiresIn: 1800 },
    loading: false,
    error: null,
    remainingTime: 1800,
    formattedRemainingTime: '30:00',
    createSession: jest.fn(),
    getSessionStatus: jest.fn(),
    extendSession: jest.fn(),
    clearSession: jest.fn(),
  }),
}));

describe('MultiPhotoUpload → /api/upload', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, data: { url: 'https://blob.vercel-storage.com/session_mock/user/front/test.png' } }),
    }));
  });

  it('uploads front and side and calls onUploadComplete with URLs', async () => {
    const onUploadComplete = jest.fn();
    render(
      <SessionProvider>
        <MultiPhotoUpload category="user" onUploadComplete={onUploadComplete} />
      </SessionProvider>
    );

    const inputs = screen.getAllByLabelText(/click to upload/i);
    // The label wraps an input; query for file inputs
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBeGreaterThan(0);

    const file = new File(['abc'], 'test.png', { type: 'image/png' });
    // Upload front
    fireEvent.change(fileInputs[0] as HTMLInputElement, { target: { files: [file] } });
    // Upload side
    fireEvent.change(fileInputs[1] as HTMLInputElement, { target: { files: [file] } });

    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalled();
      const arg = onUploadComplete.mock.calls[0][0];
      expect(arg.front).toMatch(/blob\.vercel-storage/);
      expect(arg.side).toMatch(/blob\.vercel-storage/);
    });
  });
});

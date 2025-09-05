import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiPhotoUpload } from '../MultiPhotoUpload';
import { SessionProvider } from '../SessionProvider';

// Mock Firebase
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
  getStorage: jest.fn(),
}));

jest.mock('@/lib/firebase', () => ({
  initializeFirebase: jest.fn(() => ({ name: 'test-app' })),
}));

// Mock SessionProvider context
const mockSessionContext = {
  sessionId: 'test-session-123',
  addPhotoToSession: jest.fn(() => Promise.resolve(true)),
  getSessionPhotos: jest.fn(),
  extendSession: jest.fn(),
  deleteSession: jest.fn(),
};

jest.mock('../SessionProvider', () => ({
  useSessionContext: () => mockSessionContext,
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const MockedMultiPhotoUpload = ({ category, onUploadComplete }: any) => (
  <SessionProvider>
    <MultiPhotoUpload category={category} onUploadComplete={onUploadComplete} />
  </SessionProvider>
);

describe('MultiPhotoUpload - URL Storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup Firebase mocks
    const mockStorage = require('firebase/storage');
    mockStorage.getStorage.mockReturnValue({ name: 'mock-storage' });
  });

  describe('Photo URL State Management', () => {
    it('should initialize with empty photo URLs', () => {
      render(<MockedMultiPhotoUpload category="user" />);
      
      // Check that no thumbnails are displayed initially
      const frontUpload = screen.getByLabelText(/front view/i);
      const sideUpload = screen.getByLabelText(/side view/i);
      const backUpload = screen.getByLabelText(/back view/i);
      
      expect(frontUpload).toBeInTheDocument();
      expect(sideUpload).toBeInTheDocument();
      expect(backUpload).toBeInTheDocument();
      
      // No success indicators should be visible
      expect(screen.queryByTestId('success-indicator-front')).not.toBeInTheDocument();
      expect(screen.queryByTestId('success-indicator-side')).not.toBeInTheDocument();
      expect(screen.queryByTestId('success-indicator-back')).not.toBeInTheDocument();
    });

    it('should store photo URLs in component state after successful upload', async () => {
      const mockOnUploadComplete = jest.fn();
      const mockUploadTask = {
        on: jest.fn((event, progressCallback, errorCallback, completeCallback) => {
          // Simulate successful upload
          setTimeout(() => {
            // Simulate progress
            progressCallback({
              bytesTransferred: 50,
              totalBytes: 100,
            });
            
            // Simulate completion
            completeCallback();
          }, 100);
        }),
        snapshot: {
          ref: 'mock-ref',
        },
      };

      const mockDownloadURL = 'https://example.com/photo-front.jpg';
      
      require('firebase/storage').uploadBytesResumable.mockReturnValue(mockUploadTask);
      require('firebase/storage').getDownloadURL.mockResolvedValue(mockDownloadURL);

      render(<MockedMultiPhotoUpload category="user" onUploadComplete={mockOnUploadComplete} />);
      
      const frontFileInput = screen.getByLabelText(/front view/i);
      const file = new File(['test'], 'test-front.jpg', { type: 'image/jpeg' });
      
      await userEvent.upload(frontFileInput, file);
      
      // Wait for upload completion and URL storage
      await waitFor(() => {
        expect(mockSessionContext.addPhotoToSession).toHaveBeenCalledWith(
          mockDownloadURL,
          'user',
          'front'
        );
      });

      // Check that the photo URL is stored and thumbnail is displayed
      await waitFor(() => {
        const thumbnail = screen.getByAltText('user front view');
        expect(thumbnail).toBeInTheDocument();
        expect(thumbnail.src).toMatch(new RegExp(encodeURIComponent(mockDownloadURL)));
      });
    });

    it('should maintain separate URLs for different photo types', async () => {
      const mockOnUploadComplete = jest.fn();
      const mockUploadTask = {
        on: jest.fn((event, progressCallback, errorCallback, completeCallback) => {
          setTimeout(() => completeCallback(), 100);
        }),
        snapshot: { ref: 'mock-ref' },
      };

      const frontURL = 'https://example.com/photo-front.jpg';
      const sideURL = 'https://example.com/photo-side.jpg';
      
      require('firebase/storage').uploadBytesResumable.mockReturnValue(mockUploadTask);
      require('firebase/storage').getDownloadURL
        .mockResolvedValueOnce(frontURL)
        .mockResolvedValueOnce(sideURL);

      render(<MockedMultiPhotoUpload category="user" onUploadComplete={mockOnUploadComplete} />);
      
      // Upload front photo
      const frontFileInput = screen.getByLabelText(/front view/i);
      const frontFile = new File(['test'], 'front.jpg', { type: 'image/jpeg' });
      await userEvent.upload(frontFileInput, frontFile);
      
      // Upload side photo
      const sideFileInput = screen.getByLabelText(/side view/i);
      const sideFile = new File(['test'], 'side.jpg', { type: 'image/jpeg' });
      await userEvent.upload(sideFileInput, sideFile);
      
      // Wait for both uploads to complete
      await waitFor(() => {
        expect(mockSessionContext.addPhotoToSession).toHaveBeenCalledWith(frontURL, 'user', 'front');
        expect(mockSessionContext.addPhotoToSession).toHaveBeenCalledWith(sideURL, 'user', 'side');
      });

      // Check that both thumbnails are displayed with correct URLs
      await waitFor(() => {
        const frontThumbnail = screen.getByAltText('user front view');
        const sideThumbnail = screen.getByAltText('user side view');
        
        expect(frontThumbnail.src).toMatch(new RegExp(encodeURIComponent(frontURL)));
        expect(sideThumbnail.src).toMatch(new RegExp(encodeURIComponent(sideURL)));
      });
    });

    it('should call onUploadComplete with all photo URLs when required photos are uploaded', async () => {
      const mockOnUploadComplete = jest.fn();
      const mockUploadTask = {
        on: jest.fn((event, progressCallback, errorCallback, completeCallback) => {
          setTimeout(() => completeCallback(), 100);
        }),
        snapshot: { ref: 'mock-ref' },
      };

      const frontURL = 'https://example.com/front.jpg';
      const sideURL = 'https://example.com/side.jpg';
      
      require('firebase/storage').uploadBytesResumable.mockReturnValue(mockUploadTask);
      require('firebase/storage').getDownloadURL
        .mockResolvedValueOnce(frontURL)
        .mockResolvedValueOnce(sideURL);

      render(<MockedMultiPhotoUpload category="user" onUploadComplete={mockOnUploadComplete} />);
      
      // Upload front photo
      const frontFileInput = screen.getByLabelText(/front view/i);
      const frontFile = new File(['test'], 'front.jpg', { type: 'image/jpeg' });
      await userEvent.upload(frontFileInput, frontFile);
      
      // Upload side photo (this should trigger onUploadComplete)
      const sideFileInput = screen.getByLabelText(/side view/i);
      const sideFile = new File(['test'], 'side.jpg', { type: 'image/jpeg' });
      await userEvent.upload(sideFileInput, sideFile);
      
      // Wait for onUploadComplete to be called with the photo URLs
      await waitFor(() => {
        expect(mockOnUploadComplete).toHaveBeenCalledWith({
          front: frontURL,
          side: sideURL,
          back: '', // back is optional
        });
      });
    });

    it('should clear photo URLs when photos are removed', async () => {
      const mockUploadTask = {
        on: jest.fn((event, progressCallback, errorCallback, completeCallback) => {
          setTimeout(() => completeCallback(), 100);
        }),
        snapshot: { ref: 'mock-ref' },
      };

      const frontURL = 'https://example.com/front.jpg';
      
      require('firebase/storage').uploadBytesResumable.mockReturnValue(mockUploadTask);
      require('firebase/storage').getDownloadURL.mockResolvedValue(frontURL);

      render(<MockedMultiPhotoUpload category="user" />);
      
      // Upload photo
      const frontFileInput = screen.getByLabelText(/front view/i);
      const frontFile = new File(['test'], 'front.jpg', { type: 'image/jpeg' });
      await userEvent.upload(frontFileInput, frontFile);
      
      // Wait for upload completion
      await waitFor(() => {
        expect(screen.getByAltText('user front view')).toBeInTheDocument();
      });

      // Remove photo
      const removeButton = screen.getByRole('button', { name: /remove.*user.*front.*photo/i });
      fireEvent.click(removeButton);
      
      // Check that thumbnail is removed and state is cleared
      await waitFor(() => {
        expect(screen.queryByAltText('user front view')).not.toBeInTheDocument();
      });
      
      // Check that upload area is back to initial state (front view should show upload text)
      const frontArea = screen.getByLabelText(/front view/i).closest('.relative');
      expect(frontArea).toHaveTextContent('Click to upload');
    });
  });

  describe('Error State Management', () => {
    it('should not store URL when upload fails', async () => {
      const mockOnUploadComplete = jest.fn();
      const mockUploadTask = {
        on: jest.fn((event, progressCallback, errorCallback, completeCallback) => {
          setTimeout(() => {
            errorCallback({ code: 'storage/unknown', message: 'Upload failed' });
          }, 100);
        }),
      };

      require('firebase/storage').uploadBytesResumable.mockReturnValue(mockUploadTask);

      render(<MockedMultiPhotoUpload category="user" onUploadComplete={mockOnUploadComplete} />);
      
      const frontFileInput = screen.getByLabelText(/front view/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      await userEvent.upload(frontFileInput, file);
      
      // Wait for error state (should show retry attempts message)
      await waitFor(() => {
        expect(screen.getByText(/upload failed.*attempts.*try again/i)).toBeInTheDocument();
      });

      // Ensure no thumbnail is displayed and onUploadComplete is not called
      expect(screen.queryByAltText('user front view')).not.toBeInTheDocument();
      expect(mockOnUploadComplete).not.toHaveBeenCalled();
    });
  });
});
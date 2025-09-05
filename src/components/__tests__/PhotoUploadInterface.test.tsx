import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoUploadInterface } from '../PhotoUploadInterface';
import { SessionProvider } from '../SessionProvider';

// Mock the generation service
jest.mock('@/services/generationService', () => ({
  generateOutfitPose: jest.fn(),
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

// Mock MultiPhotoUpload to simulate upload completion
jest.mock('../MultiPhotoUpload', () => ({
  MultiPhotoUpload: ({ onUploadComplete, category }: any) => {
    const mockPhotos = category === 'user' 
      ? { front: 'https://example.com/user-front.jpg', side: 'https://example.com/user-side.jpg', back: '' }
      : { front: 'https://example.com/garment-front.jpg', side: 'https://example.com/garment-side.jpg', back: '' };
    
    return (
      <div data-testid={`${category}-upload-mock`}>
        <button 
          onClick={() => onUploadComplete?.(mockPhotos)}
          data-testid={`complete-${category}-upload`}
        >
          Complete {category} Upload
        </button>
      </div>
    );
  },
}));

const MockedPhotoUploadInterface = (props: any) => (
  <SessionProvider>
    <PhotoUploadInterface {...props} />
  </SessionProvider>
);

describe('PhotoUploadInterface - Generate Button Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to simulate completing both upload steps
  const completeUploads = async () => {
    // Complete user photos
    const completeUserButton = screen.getByTestId('complete-user-upload');
    fireEvent.click(completeUserButton);
    
    // Wait for transition to garment step
    await waitFor(() => {
      const completeGarmentButton = screen.getByTestId('complete-garment-upload');
      fireEvent.click(completeGarmentButton);
    });
    
    // Wait for complete step
    await waitFor(() => {
      expect(screen.getByText(/Generate Outfit/i)).toBeInTheDocument();
    });
  };

  describe('Generate Button State Management', () => {
    it('should display Generate button after both uploads are complete', async () => {
      render(<MockedPhotoUploadInterface />);
      
      await completeUploads();
      
      const generateButton = screen.getByRole('button', { name: /Generate Outfit/i });
      expect(generateButton).toBeInTheDocument();
      expect(generateButton).not.toBeDisabled();
    });

    it('should disable Generate button and show loading state when clicked', async () => {
      const { generateOutfitPose } = require('@/services/generationService');
      generateOutfitPose.mockReturnValue(new Promise(resolve => {
        // Don't resolve immediately to test loading state
      }));

      render(<MockedPhotoUploadInterface />);
      await completeUploads();
      
      const generateButton = screen.getByRole('button', { name: /Generate Outfit/i });
      fireEvent.click(generateButton);
      
      // Button should be disabled during loading
      expect(generateButton).toBeDisabled();
      
      // Should show loading text or indicator
      expect(generateButton).toHaveTextContent(/Generating|Loading/i);
    });

    it('should call generateOutfitPose with correct parameters when Generate button is clicked', async () => {
      const { generateOutfitPose } = require('@/services/generationService');
      const mockResult = {
        imageUrl: 'https://example.com/generated-result.jpg',
        processingTime: 3.2,
        confidence: 0.95,
        description: 'Standing front pose generated successfully'
      };
      generateOutfitPose.mockResolvedValue(mockResult);

      render(<MockedPhotoUploadInterface />);
      await completeUploads();
      
      const generateButton = screen.getByRole('button', { name: /Generate Outfit/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(generateOutfitPose).toHaveBeenCalledWith(
          'test-session-123',
          'https://example.com/garment-front.jpg'
        );
      });
    });

    it('should display generated image on successful generation', async () => {
      const { generateOutfitPose } = require('@/services/generationService');
      const mockResult = {
        imageUrl: 'https://example.com/generated-result.jpg',
        processingTime: 3.2,
        confidence: 0.95,
        description: 'Standing front pose generated successfully'
      };
      generateOutfitPose.mockResolvedValue(mockResult);

      render(<MockedPhotoUploadInterface />);
      await completeUploads();
      
      const generateButton = screen.getByRole('button', { name: /Generate Outfit/i });
      fireEvent.click(generateButton);
      
      // Wait for generation to complete
      await waitFor(() => {
        const generatedImage = screen.getByAltText(/generated.*outfit|result/i);
        expect(generatedImage).toBeInTheDocument();
        expect(generatedImage).toHaveAttribute('src', mockResult.imageUrl);
      });
      
      // Button should be re-enabled
      expect(generateButton).not.toBeDisabled();
    });

    it('should display error message on generation failure', async () => {
      const { generateOutfitPose } = require('@/services/generationService');
      generateOutfitPose.mockRejectedValue(new Error('Generation failed - network error'));

      render(<MockedPhotoUploadInterface />);
      await completeUploads();
      
      const generateButton = screen.getByRole('button', { name: /Generate Outfit/i });
      fireEvent.click(generateButton);
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/generation failed|error/i)).toBeInTheDocument();
      });
      
      // Button should be re-enabled after error
      expect(generateButton).not.toBeDisabled();
    });

    it('should handle timeout errors with user-friendly message', async () => {
      const { generateOutfitPose } = require('@/services/generationService');
      generateOutfitPose.mockRejectedValue(new Error('Generation timeout - please try again'));

      render(<MockedPhotoUploadInterface />);
      await completeUploads();
      
      const generateButton = screen.getByRole('button', { name: /Generate Outfit/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/timeout.*try again/i)).toBeInTheDocument();
      });
    });

    it('should clear error state when retrying generation', async () => {
      const { generateOutfitPose } = require('@/services/generationService');
      
      // First call fails
      generateOutfitPose.mockRejectedValueOnce(new Error('Network error'));
      // Second call succeeds
      generateOutfitPose.mockResolvedValueOnce({
        imageUrl: 'https://example.com/success.jpg',
        processingTime: 2.1,
        confidence: 0.92,
        description: 'Success on retry'
      });

      render(<MockedPhotoUploadInterface />);
      await completeUploads();
      
      const generateButton = screen.getByRole('button', { name: /Generate Outfit/i });
      
      // First attempt - should show error
      fireEvent.click(generateButton);
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
      
      // Second attempt - should clear error and show success
      fireEvent.click(generateButton);
      await waitFor(() => {
        expect(screen.queryByText(/network error/i)).not.toBeInTheDocument();
        expect(screen.getByAltText(/generated.*outfit|result/i)).toBeInTheDocument();
      });
    });

    it('should show processing time and confidence when generation completes', async () => {
      const { generateOutfitPose } = require('@/services/generationService');
      const mockResult = {
        imageUrl: 'https://example.com/generated-result.jpg',
        processingTime: 4.7,
        confidence: 0.88,
        description: 'Standing front pose generated successfully'
      };
      generateOutfitPose.mockResolvedValue(mockResult);

      render(<MockedPhotoUploadInterface />);
      await completeUploads();
      
      const generateButton = screen.getByRole('button', { name: /Generate Outfit/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/4\.7.*seconds?/i)).toBeInTheDocument();
        expect(screen.getByText(/88%/i)).toBeInTheDocument();
        expect(screen.getByText(/confidence/i)).toBeInTheDocument();
      });
    });
  });
});
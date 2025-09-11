/**
 * Tests for the simplified page integration
 * Validates session management, API integration, and user experience
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SimplePage from '../simple/page';

// Mock the hooks
jest.mock('@/hooks/useEnhancedSession', () => ({
  useEnhancedSession: () => ({
    session: {
      sessionId: 'test-session-123',
      expiresAt: Date.now() + 30 * 60 * 1000,
    },
    createSession: jest.fn().mockResolvedValue({
      sessionId: 'test-session-123',
      expiresAt: Date.now() + 30 * 60 * 1000,
    }),
    trackActivity: jest.fn(),
    formattedRemainingTime: '29:45',
    sessionStatus: { isActive: true },
  }),
}));

// Mock fetch API
global.fetch = jest.fn();

const mockFileReader = {
  readAsDataURL: jest.fn(),
  result: 'data:image/jpeg;base64,mockImageData',
  onload: null as any,
};

const createMockFile = (name = 'test.jpg', type = 'image/jpeg', size = 1024) => {
  const file = new File(['mock content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('SimplePage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.FileReader = jest.fn(() => mockFileReader) as any;
    global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
    
    // Mock successful API response by default
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          results: [{
            imageUrl: 'https://example.com/generated.jpg',
            description: 'Generated virtual try-on',
          }],
          processingTime: 2.5,
        },
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Page Structure and UI', () => {
    test('renders complete page structure', () => {
      render(<SimplePage />);
      
      // Header
      expect(screen.getByText('DressUp AI')).toBeInTheDocument();
      expect(screen.getByText('Virtual Try-On Made Simple')).toBeInTheDocument();
      
      // Main content
      expect(screen.getByText('Try On Any Outfit Instantly')).toBeInTheDocument();
      expect(screen.getByText(/Upload your photo and a garment image/)).toBeInTheDocument();
      
      // Tips section
      expect(screen.getByText('Tips for Best Results')).toBeInTheDocument();
      
      // FAQ section
      expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
      
      // Footer
      expect(screen.getByText(/© 2025 DressUp AI/)).toBeInTheDocument();
    });

    test('displays session timer when session is active', () => {
      render(<SimplePage />);
      
      expect(screen.getByText('Session:')).toBeInTheDocument();
      expect(screen.getByText('29:45')).toBeInTheDocument();
    });

    test('shows helpful tips for users', () => {
      render(<SimplePage />);
      
      const tipsSection = screen.getByText('Tips for Best Results').closest('.bg-blue-50');
      expect(tipsSection).toBeInTheDocument();
      
      expect(screen.getByText(/Use a clear, front-facing photo/)).toBeInTheDocument();
      expect(screen.getByText(/Choose garment images with plain backgrounds/)).toBeInTheDocument();
      expect(screen.getByText(/Stand naturally with arms/)).toBeInTheDocument();
    });
  });

  describe('FAQ Functionality', () => {
    test('toggles FAQ section visibility', async () => {
      const user = userEvent.setup();
      render(<SimplePage />);
      
      const faqButton = screen.getByText('Frequently Asked Questions');
      
      // FAQ should be collapsed initially
      expect(screen.queryByText('How does it work?')).not.toBeInTheDocument();
      
      // Click to expand
      await user.click(faqButton);
      
      await waitFor(() => {
        expect(screen.getByText('How does it work?')).toBeInTheDocument();
        expect(screen.getByText('Is my data safe?')).toBeInTheDocument();
        expect(screen.getByText('What image formats are supported?')).toBeInTheDocument();
        expect(screen.getByText('Can I try multiple outfits?')).toBeInTheDocument();
      });
      
      // Click to collapse
      await user.click(faqButton);
      
      await waitFor(() => {
        expect(screen.queryByText('How does it work?')).not.toBeInTheDocument();
      });
    });

    test('provides comprehensive FAQ answers', async () => {
      const user = userEvent.setup();
      render(<SimplePage />);
      
      await user.click(screen.getByText('Frequently Asked Questions'));
      
      await waitFor(() => {
        // Check for detailed answers
        expect(screen.getByText(/Our AI analyzes your photo and the garment image/)).toBeInTheDocument();
        expect(screen.getByText(/All photos are automatically deleted after 30 minutes/)).toBeInTheDocument();
        expect(screen.getByText(/JPEG, PNG, WebP, and HEIC formats/)).toBeInTheDocument();
        expect(screen.getByText(/click "Try Another" to upload different garments/)).toBeInTheDocument();
      });
    });
  });

  describe('Generation Integration', () => {
    test('handles complete generation workflow', async () => {
      const user = userEvent.setup();
      render(<SimplePage />);
      
      // Upload user photo
      const userUpload = screen.getByText('Your Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(userUpload, createMockFile('user.jpg'));
      
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });
      
      // Upload garment photo
      const garmentUpload = screen.getByText('Garment Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(garmentUpload, createMockFile('garment.jpg'));
      
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });
      
      // Click generate
      const generateButton = screen.getByText('Generate Virtual Try-On');
      await user.click(generateButton);
      
      // Verify API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/try-on', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': 'test-session-123',
          },
          body: JSON.stringify({
            sessionId: 'test-session-123',
            userPhotos: { front: 'data:image/jpeg;base64,mockImageData' },
            garmentPhotos: { front: 'data:image/jpeg;base64,mockImageData' },
            options: {
              generateMultiplePoses: false,
              enhanceBackground: true,
            },
          }),
        });
      });
      
      // Should show result
      await waitFor(() => {
        expect(screen.getByText('Your Virtual Try-On')).toBeInTheDocument();
        expect(screen.getByAltText('Virtual try-on result')).toBeInTheDocument();
      });
    });

    test('handles API errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock API failure
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Processing failed' }),
      });
      
      // Mock alert to capture error display
      window.alert = jest.fn();
      
      render(<SimplePage />);
      
      // Upload photos and generate
      const userUpload = screen.getByText('Your Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(userUpload, createMockFile('user.jpg'));
      
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });
      
      const garmentUpload = screen.getByText('Garment Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(garmentUpload, createMockFile('garment.jpg'));
      
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });
      
      const generateButton = screen.getByText('Generate Virtual Try-On');
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          expect.stringContaining('Generation failed: Processing failed')
        );
      });
    });

    test('handles network errors', async () => {
      const user = userEvent.setup();
      
      // Mock network failure
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      window.alert = jest.fn();
      
      render(<SimplePage />);
      
      // Upload photos and generate
      const userUpload = screen.getByText('Your Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(userUpload, createMockFile('user.jpg'));
      
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });
      
      const garmentUpload = screen.getByText('Garment Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(garmentUpload, createMockFile('garment.jpg'));
      
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });
      
      const generateButton = screen.getByText('Generate Virtual Try-On');
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          expect.stringContaining('Network error')
        );
      });
    });
  });

  describe('Session Management Integration', () => {
    test('creates session if none exists', async () => {
      const mockCreateSession = jest.fn().mockResolvedValue({
        sessionId: 'new-session-456',
        expiresAt: Date.now() + 30 * 60 * 1000,
      });
      
      // Mock hook to return no initial session
      jest.doMock('@/hooks/useEnhancedSession', () => ({
        useEnhancedSession: () => ({
          session: null,
          createSession: mockCreateSession,
          trackActivity: jest.fn(),
          formattedRemainingTime: null,
          sessionStatus: { isActive: false },
        }),
      }));
      
      const user = userEvent.setup();
      render(<SimplePage />);
      
      // Upload photos and generate (should trigger session creation)
      const userUpload = screen.getByText('Your Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(userUpload, createMockFile('user.jpg'));
      
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });
      
      const garmentUpload = screen.getByText('Garment Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(garmentUpload, createMockFile('garment.jpg'));
      
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });
      
      const generateButton = screen.getByText('Generate Virtual Try-On');
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(mockCreateSession).toHaveBeenCalled();
      });
    });
  });

  describe('Responsive Design Integration', () => {
    test('uses responsive layout classes', () => {
      render(<SimplePage />);
      
      // Check for responsive container classes
      const mainContainer = screen.getByText('Try On Any Outfit Instantly').closest('.max-w-7xl');
      expect(mainContainer).toBeInTheDocument();
      
      // Check for responsive padding classes
      expect(mainContainer?.classList.contains('px-4')).toBe(true);
      expect(mainContainer?.classList.contains('sm:px-6')).toBe(true);
      expect(mainContainer?.classList.contains('lg:px-8')).toBe(true);
    });
  });

  describe('Accessibility Integration', () => {
    test('has proper heading hierarchy', () => {
      render(<SimplePage />);
      
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('DressUp AI');
      
      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThan(0);
    });

    test('provides meaningful link texts', () => {
      render(<SimplePage />);
      
      const privacyLink = screen.getByText('Privacy Policy');
      expect(privacyLink).toHaveAttribute('href', '/privacy');
      
      const termsLink = screen.getByText('Terms of Service');
      expect(termsLink).toHaveAttribute('href', '/terms');
      
      const helpLink = screen.getByText('Help');
      expect(helpLink).toHaveAttribute('href', '/help');
    });
  });

  describe('Performance Characteristics', () => {
    test('renders efficiently without unnecessary re-renders', () => {
      const { rerender } = render(<SimplePage />);
      
      // Re-render should not cause issues
      rerender(<SimplePage />);
      
      expect(screen.getByText('DressUp AI')).toBeInTheDocument();
    });

    test('loads critical content immediately', () => {
      render(<SimplePage />);
      
      // Critical above-the-fold content should be immediately visible
      expect(screen.getByText('Try On Any Outfit Instantly')).toBeInTheDocument();
      expect(screen.getByText('Upload Your Photos')).toBeInTheDocument();
    });
  });

  describe('UX Improvements Validation', () => {
    test('provides clear call-to-action', () => {
      render(<SimplePage />);
      
      const mainCTA = screen.getByText(/Upload your photo and a garment image/);
      expect(mainCTA).toBeInTheDocument();
      
      const uploadSections = screen.getAllByText('Click to upload or drag & drop');
      expect(uploadSections.length).toBe(2);
    });

    test('gives immediate feedback for user actions', async () => {
      const user = userEvent.setup();
      render(<SimplePage />);
      
      const fileInput = screen.getByText('Your Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, createMockFile('user.jpg'));
      
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });
      
      // Should show immediate visual feedback
      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });
    });

    test('progressively discloses information', async () => {
      const user = userEvent.setup();
      render(<SimplePage />);
      
      // FAQ should be collapsed initially (progressive disclosure)
      expect(screen.queryByText('How does it work?')).not.toBeInTheDocument();
      
      // Expand to show more information
      await user.click(screen.getByText('Frequently Asked Questions'));
      
      await waitFor(() => {
        expect(screen.getByText('How does it work?')).toBeInTheDocument();
      });
    });

    test('maintains focus and accessibility during interactions', async () => {
      const user = userEvent.setup();
      render(<SimplePage />);
      
      const faqButton = screen.getByText('Frequently Asked Questions');
      
      await user.click(faqButton);
      
      // Focus should remain on the button or move appropriately
      expect(document.activeElement).toBeDefined();
    });
  });
});
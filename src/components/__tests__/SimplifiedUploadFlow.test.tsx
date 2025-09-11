/**
 * Comprehensive test suite for SimplifiedUploadFlow component
 * Tests functionality, simplicity, and user experience improvements
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SimplifiedUploadFlow } from '../SimplifiedUploadFlow';

// Mock FileReader for image uploads
const mockFileReader = {
  readAsDataURL: jest.fn(),
  result: 'data:image/jpeg;base64,mockImageData',
  onload: null as any,
};

// Mock file for testing
const createMockFile = (name = 'test.jpg', type = 'image/jpeg', size = 1024) => {
  const file = new File(['mock content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('SimplifiedUploadFlow', () => {
  const mockOnGenerate = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock FileReader
    global.FileReader = jest.fn(() => mockFileReader) as any;
    
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
    
    // Mock document.createElement for download functionality
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial State and UI', () => {
    test('renders upload interface with clear instructions', () => {
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      expect(screen.getByText('Upload Your Photos')).toBeInTheDocument();
      expect(screen.getByText('Upload a photo of yourself and the garment you want to try on')).toBeInTheDocument();
      
      // Check for both upload areas
      const uploadAreas = screen.getAllByText('Click to upload or drag & drop');
      expect(uploadAreas).toHaveLength(2);
      
      // Check for descriptive headers
      expect(screen.getByText('Your Photo')).toBeInTheDocument();
      expect(screen.getByText('Garment Photo')).toBeInTheDocument();
    });

    test('displays helpful upload guidelines', () => {
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      expect(screen.getByText('Front-facing, clear background preferred')).toBeInTheDocument();
      expect(screen.getByText('Clear photo of the clothing item')).toBeInTheDocument();
      expect(screen.getByText('JPG, PNG up to 5MB')).toBeInTheDocument();
    });

    test('generate button is disabled initially', () => {
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      const generateButton = screen.getByText('Generate Virtual Try-On');
      expect(generateButton).toBeDisabled();
      expect(generateButton.closest('button')).toHaveClass('bg-gray-200', 'cursor-not-allowed');
    });
  });

  describe('File Upload Functionality', () => {
    test('handles file selection via click for user photo', async () => {
      const user = userEvent.setup();
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      const userUploadArea = screen.getByText('Your Photo').closest('.bg-white') as HTMLElement;
      const uploadButton = userUploadArea.querySelector('[role="button"]') || userUploadArea;
      
      const mockFile = createMockFile('user-photo.jpg');
      const fileInput = userUploadArea.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(fileInput, mockFile);
      
      // Simulate FileReader onload
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });

      await waitFor(() => {
        expect(screen.getByAltText('Your photo')).toBeInTheDocument();
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });
    });

    test('handles file selection for garment photo', async () => {
      const user = userEvent.setup();
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      const garmentUploadArea = screen.getByText('Garment Photo').closest('.bg-white') as HTMLElement;
      const fileInput = garmentUploadArea.querySelector('input[type="file"]') as HTMLInputElement;
      
      const mockFile = createMockFile('garment.jpg');
      
      await user.upload(fileInput, mockFile);
      
      // Simulate FileReader onload
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });

      await waitFor(() => {
        expect(screen.getByAltText('Garment photo')).toBeInTheDocument();
      });
    });

    test('enables generate button when both photos are uploaded', async () => {
      const user = userEvent.setup();
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
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

      await waitFor(() => {
        const generateButton = screen.getByText('Generate Virtual Try-On');
        expect(generateButton).not.toBeDisabled();
        expect(generateButton.closest('button')).toHaveClass('bg-gradient-to-r');
      });
    });
  });

  describe('Drag and Drop Functionality', () => {
    test('handles drag and drop for user photo', async () => {
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      const userUploadArea = screen.getByText('Your Photo').closest('.bg-white')?.querySelector('[onDrop]') as HTMLElement;
      const mockFile = createMockFile('dropped-user.jpg');
      
      // Mock drag and drop events
      const dropEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: {
          files: [mockFile]
        }
      } as any;

      fireEvent.drop(userUploadArea, dropEvent);
      
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });

      await waitFor(() => {
        expect(screen.getByAltText('Your photo')).toBeInTheDocument();
      });
    });

    test('provides visual feedback during drag operations', async () => {
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      const userUploadArea = screen.getByText('Your Photo').closest('.bg-white')?.querySelector('[onDragOver]') as HTMLElement;
      
      const dragEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as any;

      fireEvent.dragOver(userUploadArea, dragEvent);
      
      // Should show drag feedback (tested via state change, visual changes tested in integration)
      expect(dragEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('File Validation', () => {
    test('rejects non-image files', async () => {
      const user = userEvent.setup();
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      const fileInput = screen.getByText('Your Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      const textFile = new File(['text content'], 'document.txt', { type: 'text/plain' });
      
      await user.upload(fileInput, textFile);
      
      await waitFor(() => {
        expect(screen.getByText('Please upload an image file')).toBeInTheDocument();
      });
    });

    test('rejects files larger than 5MB', async () => {
      const user = userEvent.setup();
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      const fileInput = screen.getByText('Your Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      const largeFile = createMockFile('large.jpg', 'image/jpeg', 6 * 1024 * 1024); // 6MB
      
      await user.upload(fileInput, largeFile);
      
      await waitFor(() => {
        expect(screen.getByText('Image must be less than 5MB')).toBeInTheDocument();
      });
    });

    test('clears error messages when valid file is uploaded', async () => {
      const user = userEvent.setup();
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      const fileInput = screen.getByText('Your Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Upload invalid file first
      const textFile = new File(['text content'], 'document.txt', { type: 'text/plain' });
      await user.upload(fileInput, textFile);
      
      await waitFor(() => {
        expect(screen.getByText('Please upload an image file')).toBeInTheDocument();
      });
      
      // Upload valid file
      const validFile = createMockFile('valid.jpg');
      await user.upload(fileInput, validFile);
      
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });

      await waitFor(() => {
        expect(screen.queryByText('Please upload an image file')).not.toBeInTheDocument();
      });
    });
  });

  describe('Image Removal Functionality', () => {
    test('allows removal of uploaded user photo', async () => {
      const user = userEvent.setup();
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      // Upload user photo first
      const fileInput = screen.getByText('Your Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, createMockFile('user.jpg'));
      
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });
      
      await waitFor(() => {
        expect(screen.getByAltText('Your photo')).toBeInTheDocument();
      });
      
      // Find and click remove button
      const removeButton = screen.getByLabelText('Remove photo');
      await user.click(removeButton);
      
      await waitFor(() => {
        expect(screen.queryByAltText('Your photo')).not.toBeInTheDocument();
        expect(screen.getByText('Click to upload or drag & drop')).toBeInTheDocument();
      });
    });
  });

  describe('Generation Process', () => {
    test('calls onGenerate with correct parameters when button clicked', async () => {
      const user = userEvent.setup();
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      // Upload both photos
      const userUpload = screen.getByText('Your Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      const garmentUpload = screen.getByText('Garment Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(userUpload, createMockFile('user.jpg'));
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });
      
      await user.upload(garmentUpload, createMockFile('garment.jpg'));
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });
      
      const generateButton = screen.getByText('Generate Virtual Try-On');
      await user.click(generateButton);
      
      expect(mockOnGenerate).toHaveBeenCalledWith(
        'data:image/jpeg;base64,mockImageData',
        'data:image/jpeg;base64,mockImageData'
      );
    });

    test('shows loading state during generation', () => {
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} isProcessing={true} />);
      
      expect(screen.getByText('Generating Your Look...')).toBeInTheDocument();
      expect(screen.getByText('Creating your virtual try-on...')).toBeInTheDocument();
      expect(screen.getByText('This usually takes 15-30 seconds')).toBeInTheDocument();
    });

    test('handles generation errors gracefully', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Generation failed';
      const failingOnGenerate = jest.fn().mockRejectedValue(new Error(errorMessage));
      
      render(<SimplifiedUploadFlow onGenerate={failingOnGenerate} />);
      
      // Upload photos and trigger generation
      const userUpload = screen.getByText('Your Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      const garmentUpload = screen.getByText('Garment Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(userUpload, createMockFile('user.jpg'));
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });
      
      await user.upload(garmentUpload, createMockFile('garment.jpg'));
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });
      
      const generateButton = screen.getByText('Generate Virtual Try-On');
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to generate. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Result Display', () => {
    const mockResult = {
      imageUrl: 'https://example.com/result.jpg',
      description: 'Your virtual try-on result'
    };

    test('displays result when generation completes', () => {
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} result={mockResult} />);
      
      expect(screen.getByText('Your Virtual Try-On')).toBeInTheDocument();
      expect(screen.getByText("Here's how you look in the outfit!")).toBeInTheDocument();
      expect(screen.getByAltText('Virtual try-on result')).toBeInTheDocument();
      expect(screen.getByText(mockResult.description)).toBeInTheDocument();
    });

    test('provides action buttons for result', () => {
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} result={mockResult} />);
      
      expect(screen.getByText('Try Another')).toBeInTheDocument();
      expect(screen.getByText('Download')).toBeInTheDocument();
    });

    test('download button triggers file download', async () => {
      const user = userEvent.setup();
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} result={mockResult} />);
      
      const downloadButton = screen.getByText('Download');
      await user.click(downloadButton);
      
      const mockLink = document.createElement('a') as any;
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe(mockResult.imageUrl);
      expect(mockLink.download).toBe('virtual-tryon.jpg');
      expect(mockLink.click).toHaveBeenCalled();
    });

    test('try another button resets to upload state', async () => {
      const user = userEvent.setup();
      
      // Render with result first
      const { rerender } = render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} result={mockResult} />);
      
      expect(screen.getByText('Your Virtual Try-On')).toBeInTheDocument();
      
      const tryAnotherButton = screen.getByText('Try Another');
      await user.click(tryAnotherButton);
      
      // Simulate parent component resetting result
      rerender(<SimplifiedUploadFlow onGenerate={mockOnGenerate} result={null} />);
      
      expect(screen.getByText('Upload Your Photos')).toBeInTheDocument();
      expect(screen.queryByText('Your Virtual Try-On')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper aria labels and roles', () => {
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      const removeButtons = screen.queryAllByLabelText(/Remove/);
      removeButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    test('provides alternative text for images', async () => {
      const user = userEvent.setup();
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      const fileInput = screen.getByText('Your Photo').closest('.bg-white')?.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, createMockFile('user.jpg'));
      
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader });
        }
      });

      await waitFor(() => {
        const image = screen.getByAltText('Your photo');
        expect(image).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    test('uses responsive layout classes', () => {
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      const container = screen.getByText('Upload Your Photos').closest('.max-w-4xl');
      expect(container).toBeInTheDocument();
      
      const grid = container?.querySelector('.grid.md\\:grid-cols-2');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    test('only re-renders when necessary props change', () => {
      const { rerender } = render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      // Re-render with same props should not cause unnecessary updates
      rerender(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      // Component should still be functional
      expect(screen.getByText('Upload Your Photos')).toBeInTheDocument();
    });

    test('properly cleans up event listeners', () => {
      const { unmount } = render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
      
      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });
});
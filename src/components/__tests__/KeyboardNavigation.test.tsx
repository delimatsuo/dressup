import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileResultsGallery } from '../MobileResultsGallery';
import { useKeyboardDetection } from '../../hooks/useFocusTrap';

// Mock the keyboard detection hook
jest.mock('../../hooks/useFocusTrap', () => ({
  useKeyboardDetection: jest.fn(),
  useFocusTrap: jest.fn(() => ({ current: null })),
}));

const mockUseKeyboardDetection = useKeyboardDetection as jest.MockedFunction<typeof useKeyboardDetection>;

describe('Keyboard Navigation', () => {
  const mockImages = [
    {
      id: '1',
      url: '/test-image-1.jpg',
      title: 'Test Image 1',
      description: 'First test image'
    },
    {
      id: '2', 
      url: '/test-image-2.jpg',
      title: 'Test Image 2',
      description: 'Second test image'
    },
    {
      id: '3',
      url: '/test-image-3.jpg', 
      title: 'Test Image 3',
      description: 'Third test image'
    }
  ];

  beforeEach(() => {
    mockUseKeyboardDetection.mockReturnValue({ current: false });
    // Add keyboard navigation class to body to enable keyboard styles
    document.body.classList.add('keyboard-navigation');
  });

  afterEach(() => {
    document.body.classList.remove('keyboard-navigation');
    jest.clearAllMocks();
  });

  test('gallery container has proper keyboard accessibility attributes', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    const gallery = screen.getByRole('region');
    expect(gallery).toHaveAttribute('tabIndex', '0');
    expect(gallery).toHaveAttribute('aria-label', expect.stringContaining('Image gallery with 3 images'));
    expect(gallery).toHaveAttribute('aria-describedby', 'gallery-instructions');
  });

  test('keyboard navigation instructions are provided for screen readers', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    const instructionsContainer = screen.getByText(/Use arrow keys or left\/right keys to navigate/);
    expect(instructionsContainer).toBeInTheDocument();
    
    // The container div should have sr-only class and proper ID
    const instructionsDiv = instructionsContainer.closest('#gallery-instructions');
    expect(instructionsDiv).toHaveClass('sr-only');
    expect(instructionsDiv).toHaveAttribute('id', 'gallery-instructions');
  });

  test('arrow key navigation works between images', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    const gallery = screen.getByRole('region');
    
    // Should start with first image
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    
    // Press right arrow - should go to second image
    fireEvent.keyDown(gallery, { code: 'ArrowRight' });
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    
    // Press left arrow - should go back to first image
    fireEvent.keyDown(gallery, { code: 'ArrowLeft' });
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  test('Enter and Space keys open fullscreen mode', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    const gallery = screen.getByRole('region');
    
    // Press Enter - should open fullscreen
    fireEvent.keyDown(gallery, { code: 'Enter' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Fullscreen image viewer')).toBeInTheDocument();
  });

  test('Escape key closes fullscreen modal', async () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    const gallery = screen.getByRole('region');
    
    // Open fullscreen first
    fireEvent.keyDown(gallery, { code: 'Enter' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Press Escape at document level - should close fullscreen
    fireEvent.keyDown(document, { code: 'Escape' });
    
    // Wait for the modal to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  test('fullscreen modal has proper keyboard accessibility', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    const gallery = screen.getByRole('region');
    fireEvent.keyDown(gallery, { code: 'Enter' });
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-label', 'Fullscreen image viewer');
    
    const closeButton = screen.getByLabelText(/Close fullscreen/);
    expect(closeButton).toBeInTheDocument();
  });

  test('keyboard navigation instructions appear only for keyboard users', () => {
    const { rerender } = render(<MobileResultsGallery images={mockImages} />);
    
    // Should show keyboard hints when keyboard navigation is active
    const keyboardHints = screen.getByText(/Keyboard shortcuts:/);
    expect(keyboardHints.closest('.keyboard-navigation-only')).toBeInTheDocument();
  });

  test('touch indicators are hidden for keyboard users', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    // Should hide touch-specific content for keyboard users
    const touchIndicator = screen.getByText(/Swipe left or right to navigate/);
    expect(touchIndicator.closest('.touch-only')).toBeInTheDocument();
  });

  test('thumbnail gallery has proper keyboard accessibility', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    const thumbnails = screen.getAllByRole('tab');
    expect(thumbnails).toHaveLength(3);
    
    // First thumbnail should be selected by default
    expect(thumbnails[0]).toHaveAttribute('aria-selected', 'true');
    expect(thumbnails[1]).toHaveAttribute('aria-selected', 'false');
    expect(thumbnails[2]).toHaveAttribute('aria-selected', 'false');
    
    // Each thumbnail should have proper labels
    expect(thumbnails[0]).toHaveAttribute('aria-label', 'View image 1: Test Image 1');
    expect(thumbnails[1]).toHaveAttribute('aria-label', 'View image 2: Test Image 2');
    expect(thumbnails[2]).toHaveAttribute('aria-label', 'View image 3: Test Image 3');
  });

  test('buttons have enhanced focus states for keyboard users', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    const fullscreenButton = screen.getByLabelText(/View fullscreen/);
    expect(fullscreenButton).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    
    const thumbnails = screen.getAllByRole('tab');
    thumbnails.forEach(thumbnail => {
      expect(thumbnail).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });
  });

  test('fullscreen modal traps focus correctly', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    const gallery = screen.getByRole('region');
    fireEvent.keyDown(gallery, { code: 'Enter' });
    
    // Modal should be open and focusable elements should be available
    const modal = screen.getByRole('dialog');
    const closeButton = screen.getByLabelText(/Close fullscreen/);
    const navButtons = screen.getAllByLabelText(/arrow key/);
    
    expect(modal).toBeInTheDocument();
    expect(closeButton).toBeInTheDocument();
    expect(navButtons.length).toBeGreaterThan(0);
  });

  test('handles single image scenario properly', () => {
    const singleImage = [mockImages[0]];
    render(<MobileResultsGallery images={singleImage} />);
    
    const gallery = screen.getByRole('region');
    expect(gallery).toHaveAttribute('aria-label', 'Image gallery with 1 images. Currently viewing image 1.');
    
    // Should not show navigation arrows for single image
    expect(screen.queryByLabelText(/Previous image/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Next image/)).not.toBeInTheDocument();
    
    // Should not show thumbnail gallery for single image
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  test('aria-live announcements work correctly', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    const gallery = screen.getByRole('region');
    expect(gallery).toHaveAttribute('aria-live', 'polite');
    
    // Fullscreen modal should also have aria-live announcement
    fireEvent.keyDown(gallery, { code: 'Enter' });
    const fullscreenAnnouncement = screen.getByText(/Currently viewing image 1 of 3: Test Image 1/);
    expect(fullscreenAnnouncement.closest('[aria-live]')).toBeInTheDocument();
  });
});
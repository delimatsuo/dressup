import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MobilePhotoUpload } from '../MobilePhotoUpload';

describe('MobilePhotoUpload', () => {
  const mockOnComplete = jest.fn();
  const defaultProps = {
    views: ['front', 'side', 'back'] as string[],
    onComplete: mockOnComplete,
    title: 'Test Upload',
    description: 'Test description',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with title and description', () => {
    render(<MobilePhotoUpload {...defaultProps} />);
    
    expect(screen.getByText('Test Upload')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should show correct number of views', () => {
    render(<MobilePhotoUpload {...defaultProps} />);
    
    expect(screen.getByText('front view')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should show progress indicator for current view', () => {
    render(<MobilePhotoUpload {...defaultProps} />);
    
    const currentViewIndicator = screen.getByText('1').parentElement;
    expect(currentViewIndicator).toHaveClass('bg-purple-500');
  });

  it('should handle photo capture', async () => {
    render(<MobilePhotoUpload {...defaultProps} />);
    
    const fileInput = screen.getByLabelText('Tap to take photo');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.queryByText('Tap to take photo')).not.toBeInTheDocument();
    });
  });

  it('should allow navigation between views', () => {
    render(<MobilePhotoUpload {...defaultProps} />);
    
    expect(screen.getByText('front View')).toBeInTheDocument();
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    expect(screen.getByText('side View')).toBeInTheDocument();
  });

  it('should show previous button when not on first view', () => {
    render(<MobilePhotoUpload {...defaultProps} />);
    
    expect(screen.queryByText('Previous')).not.toBeInTheDocument();
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    expect(screen.getByText('Previous')).toBeInTheDocument();
  });

  it('should show complete button on last view', () => {
    render(<MobilePhotoUpload {...defaultProps} />);
    
    // Navigate to last view
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton); // Go to side
    fireEvent.click(screen.getByText('Next')); // Go to back
    
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('should disable complete button until all photos are captured', () => {
    render(<MobilePhotoUpload {...defaultProps} />);
    
    // Navigate to last view
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    fireEvent.click(screen.getByText('Next'));
    
    const completeButton = screen.getByText('Complete');
    expect(completeButton).toBeDisabled();
  });

  it('should display photo count status', () => {
    render(<MobilePhotoUpload {...defaultProps} />);
    
    expect(screen.getByText('0 of 3 photos captured')).toBeInTheDocument();
  });

  it('should show thumbnail gallery when photos are captured', async () => {
    render(<MobilePhotoUpload {...defaultProps} />);
    
    const fileInput = screen.getByLabelText('Tap to take photo');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByAltText('front thumbnail')).toBeInTheDocument();
    });
  });

  it('should handle mobile-specific attributes', () => {
    render(<MobilePhotoUpload {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute('accept', 'image/*');
    expect(fileInput).toHaveAttribute('capture', 'environment');
  });
});
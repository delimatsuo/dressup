import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResultsDisplay from '../ResultsDisplay';

const mockResult = {
  id: 'result-1',
  originalImageUrl: '/images/user-photo.jpg',
  processedImageUrl: '/images/result.jpg',
  garmentName: 'Casual T-Shirt',
  processingTime: 3.2,
  timestamp: new Date().toISOString(),
};

describe('ResultsDisplay', () => {
  it('should show loading state during processing', () => {
    render(<ResultsDisplay loading={true} />);
    expect(screen.getByText(/processing.*outfit/i)).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display result when available', () => {
    render(<ResultsDisplay result={mockResult} />);
    
    expect(screen.getByText(/your new look/i)).toBeInTheDocument();
    expect(screen.getByAltText(/result/i)).toBeInTheDocument();
    expect(screen.getByAltText(/result/i)).toHaveAttribute('src', mockResult.processedImageUrl);
  });

  it('should show before and after comparison', () => {
    render(<ResultsDisplay result={mockResult} showComparison={true} />);
    
    expect(screen.getByText(/before/i)).toBeInTheDocument();
    expect(screen.getByText(/after/i)).toBeInTheDocument();
    
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('src', mockResult.originalImageUrl);
    expect(images[1]).toHaveAttribute('src', mockResult.processedImageUrl);
  });

  it('should display processing time', () => {
    render(<ResultsDisplay result={mockResult} />);
    expect(screen.getByText(/processed in.*3.2.*seconds/i)).toBeInTheDocument();
  });

  it('should show download button for result', () => {
    render(<ResultsDisplay result={mockResult} />);
    
    const downloadButton = screen.getByRole('button', { name: /download/i });
    expect(downloadButton).toBeInTheDocument();
  });

  it('should handle download action', async () => {
    const mockOnDownload = jest.fn();
    render(<ResultsDisplay result={mockResult} onDownload={mockOnDownload} />);
    
    const downloadButton = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadButton);
    
    expect(mockOnDownload).toHaveBeenCalledWith(mockResult);
  });

  it('should show share button', () => {
    render(<ResultsDisplay result={mockResult} />);
    
    const shareButton = screen.getByRole('button', { name: /share/i });
    expect(shareButton).toBeInTheDocument();
  });

  it('should show "Try Another" button', () => {
    const mockOnTryAnother = jest.fn();
    render(<ResultsDisplay result={mockResult} onTryAnother={mockOnTryAnother} />);
    
    const tryAnotherButton = screen.getByRole('button', { name: /try another/i });
    fireEvent.click(tryAnotherButton);
    
    expect(mockOnTryAnother).toHaveBeenCalled();
  });

  it('should display empty state when no result', () => {
    render(<ResultsDisplay />);
    expect(screen.getByText(/no result.*display/i)).toBeInTheDocument();
  });

  it('should show error state when processing fails', () => {
    render(<ResultsDisplay error="Failed to process image" />);
    expect(screen.getByText(/failed to process image/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
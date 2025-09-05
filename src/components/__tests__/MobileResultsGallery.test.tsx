import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MobileResultsGallery } from '../MobileResultsGallery';

describe('MobileResultsGallery', () => {
  const mockImages = [
    { id: '1', url: 'image1.jpg', title: 'Image 1', description: 'First image' },
    { id: '2', url: 'image2.jpg', title: 'Image 2', description: 'Second image' },
    { id: '3', url: 'image3.jpg', title: 'Image 3', description: 'Third image' },
  ];

  const mockOnDownload = jest.fn();
  const mockOnShare = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render first image by default', () => {
    render(
      <MobileResultsGallery 
        images={mockImages}
        onDownload={mockOnDownload}
        onShare={mockOnShare}
      />
    );
    
    expect(screen.getByAltText('Image 1')).toBeInTheDocument();
    expect(screen.getByText('Image 1')).toBeInTheDocument();
    expect(screen.getByText('First image')).toBeInTheDocument();
  });

  it('should display image counter', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('should navigate to next image on next button click', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    const nextButton = screen.getByLabelText('Next image');
    fireEvent.click(nextButton);
    
    expect(screen.getByAltText('Image 2')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('should navigate to previous image on previous button click', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    // Go to second image first
    const nextButton = screen.getByLabelText('Next image');
    fireEvent.click(nextButton);
    
    // Then go back
    const prevButton = screen.getByLabelText('Previous image');
    fireEvent.click(prevButton);
    
    expect(screen.getByAltText('Image 1')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('should wrap around when navigating past last image', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    const nextButton = screen.getByLabelText('Next image');
    fireEvent.click(nextButton); // Go to 2
    fireEvent.click(nextButton); // Go to 3
    fireEvent.click(nextButton); // Wrap to 1
    
    expect(screen.getByAltText('Image 1')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('should handle swipe gestures', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    const gallery = screen.getByAltText('Image 1').parentElement;
    
    // Simulate swipe left (next)
    fireEvent.touchStart(gallery!, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(gallery!, { changedTouches: [{ clientX: 20 }] });
    
    expect(screen.getByAltText('Image 2')).toBeInTheDocument();
  });

  it('should show thumbnail gallery', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    expect(screen.getByAltText('Thumbnail 1')).toBeInTheDocument();
    expect(screen.getByAltText('Thumbnail 2')).toBeInTheDocument();
    expect(screen.getByAltText('Thumbnail 3')).toBeInTheDocument();
  });

  it('should highlight current thumbnail', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    const firstThumbnail = screen.getByAltText('Thumbnail 1').parentElement;
    expect(firstThumbnail).toHaveClass('border-purple-500');
  });

  it('should navigate via thumbnail click', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    const thirdThumbnail = screen.getByAltText('Thumbnail 3').parentElement;
    fireEvent.click(thirdThumbnail!);
    
    expect(screen.getByAltText('Image 3')).toBeInTheDocument();
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  it('should call onDownload when download button is clicked', () => {
    render(
      <MobileResultsGallery 
        images={mockImages}
        onDownload={mockOnDownload}
      />
    );
    
    const downloadButton = screen.getByLabelText('Download image');
    fireEvent.click(downloadButton);
    
    expect(mockOnDownload).toHaveBeenCalledWith(mockImages[0]);
  });

  it('should call onShare when share button is clicked', () => {
    render(
      <MobileResultsGallery 
        images={mockImages}
        onShare={mockOnShare}
      />
    );
    
    const shareButton = screen.getByLabelText('Share image');
    fireEvent.click(shareButton);
    
    expect(mockOnShare).toHaveBeenCalledWith(mockImages[0]);
  });

  it('should open fullscreen mode', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    const fullscreenButton = screen.getByLabelText('View fullscreen');
    fireEvent.click(fullscreenButton);
    
    expect(screen.getByLabelText('Close fullscreen')).toBeInTheDocument();
  });

  it('should close fullscreen mode', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    const fullscreenButton = screen.getByLabelText('View fullscreen');
    fireEvent.click(fullscreenButton);
    
    const closeButton = screen.getByLabelText('Close fullscreen');
    fireEvent.click(closeButton);
    
    expect(screen.queryByLabelText('Close fullscreen')).not.toBeInTheDocument();
  });

  it('should show swipe indicator on mobile', () => {
    render(<MobileResultsGallery images={mockImages} />);
    
    expect(screen.getByText('Swipe left or right to navigate')).toBeInTheDocument();
  });

  it('should render nothing when images array is empty', () => {
    const { container } = render(<MobileResultsGallery images={[]} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should not show navigation for single image', () => {
    render(
      <MobileResultsGallery 
        images={[mockImages[0]]}
      />
    );
    
    expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument();
    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument();
  });
});
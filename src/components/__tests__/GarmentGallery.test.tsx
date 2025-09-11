import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GarmentGallery from '../GarmentGallery';

const mockGarments = [
  { id: '1', name: 'Casual T-Shirt', imageUrl: '/images/tshirt.jpg', category: 'casual' },
  { id: '2', name: 'Business Suit', imageUrl: '/images/suit.jpg', category: 'formal' },
  { id: '3', name: 'Summer Dress', imageUrl: '/images/dress.jpg', category: 'casual' },
  { id: '4', name: 'Evening Gown', imageUrl: '/images/gown.jpg', category: 'formal' },
];

describe('GarmentGallery', () => {
  it('should render gallery title', () => {
    render(<GarmentGallery garments={[]} />);
    expect(screen.getByText(/choose.*outfit/i)).toBeInTheDocument();
  });

  it('should display all garments', () => {
    render(<GarmentGallery garments={mockGarments} />);
    
    mockGarments.forEach(garment => {
      expect(screen.getByText(garment.name)).toBeInTheDocument();
      expect(screen.getByAltText(garment.name)).toBeInTheDocument();
    });
  });

  it('should show category filters', () => {
    render(<GarmentGallery garments={mockGarments} />);
    
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^casual$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^formal$/i })).toBeInTheDocument();
  });

  it('should filter garments by category', () => {
    render(<GarmentGallery garments={mockGarments} />);
    
    // Click on 'Casual' filter
    fireEvent.click(screen.getByRole('button', { name: /^casual$/i }));
    
    // Should show casual items
    expect(screen.getByText('Casual T-Shirt')).toBeInTheDocument();
    expect(screen.getByText('Summer Dress')).toBeInTheDocument();
    
    // Should not show formal items
    expect(screen.queryByText('Business Suit')).not.toBeInTheDocument();
    expect(screen.queryByText('Evening Gown')).not.toBeInTheDocument();
  });

  it('should allow selecting a garment', () => {
    const mockOnSelect = jest.fn();
    render(<GarmentGallery garments={mockGarments} onSelect={mockOnSelect} />);
    
    const firstGarment = screen.getByText('Casual T-Shirt').closest('button');
    fireEvent.click(firstGarment!);
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockGarments[0]);
  });

  it('should highlight selected garment', () => {
    const { rerender } = render(
      <GarmentGallery garments={mockGarments} selectedId="2" />
    );
    
    // Get the parent div that contains the selected class
    const selectedGarmentButton = screen.getByText('Business Suit').closest('button');
    const selectedGarmentDiv = selectedGarmentButton?.querySelector('div');
    expect(selectedGarmentDiv).toHaveClass('selected');
    
    // Change selection
    rerender(<GarmentGallery garments={mockGarments} selectedId="1" />);
    
    const newSelectedButton = screen.getByText('Casual T-Shirt').closest('button');
    const newSelectedDiv = newSelectedButton?.querySelector('div');
    expect(newSelectedDiv).toHaveClass('selected');
  });

  it('should display loading state', () => {
    render(<GarmentGallery garments={[]} loading={true} />);
    expect(screen.getByText(/loading.*outfits/i)).toBeInTheDocument();
  });

  it('should display empty state when no garments', () => {
    render(<GarmentGallery garments={[]} />);
    expect(screen.getByText(/no outfits available/i)).toBeInTheDocument();
  });
});
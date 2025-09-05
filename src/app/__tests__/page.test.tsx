import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from '../page';

// Mock the Firebase functions with default implementations
jest.mock('../../lib/firebase', () => ({
  initializeFirebase: jest.fn(),
  uploadImage: jest.fn(),
  getGarments: jest.fn(() => Promise.resolve([
    { id: '1', name: 'T-Shirt', imageUrl: '/tshirt.jpg', category: 'casual' }
  ])),
  processImage: jest.fn(() => Promise.resolve({
    processedImageUrl: 'processed-image-url',
    processingTime: 2.5,
    confidence: 0.95
  })),
  submitFeedback: jest.fn(() => Promise.resolve({ success: true })),
}));

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the main heading', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: /dressup/i })).toBeInTheDocument();
  });

  it('should render welcome message', () => {
    render(<HomePage />);
    expect(screen.getByText(/AI-powered virtual outfit/i)).toBeInTheDocument();
  });

  it('should display all main sections', async () => {
    render(<HomePage />);
    
    // Upload section
    expect(screen.getByText(/upload your photo/i)).toBeInTheDocument();
    
    // Gallery section - wait for it to load
    await waitFor(() => {
      expect(screen.getByText(/choose.*outfit/i)).toBeInTheDocument();
    });
    
    // Feedback section
    expect(screen.getByText(/share.*feedback/i)).toBeInTheDocument();
  });

  it('should show step-by-step instructions', () => {
    render(<HomePage />);
    
    expect(screen.getByText(/Upload Your Photo/i)).toBeInTheDocument();
    expect(screen.getByText(/Select an Outfit/i)).toBeInTheDocument();
    expect(screen.getByText(/See Your New Look/i)).toBeInTheDocument();
  });

  it('should handle image upload', async () => {
    render(<HomePage />);

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/upload.*photo/i);
    
    await userEvent.upload(fileInput, file);
    
    // The image should be displayed as preview
    await waitFor(() => {
      expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
    });
  });

  it('should load and display garments', async () => {
    const { getGarments } = require('../../lib/firebase');
    
    render(<HomePage />);

    await waitFor(() => {
      expect(getGarments).toHaveBeenCalled();
      expect(screen.getByText('T-Shirt')).toBeInTheDocument();
    });
  });

  it('should enable process button when image and garment are selected', async () => {
    render(<HomePage />);

    // Upload image
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/upload.*photo/i);
    await userEvent.upload(fileInput, file);

    // Wait for garments to load and select one
    await waitFor(() => {
      expect(screen.getByText('T-Shirt')).toBeInTheDocument();
    });
    
    const garmentButton = screen.getByText('T-Shirt').closest('button');
    fireEvent.click(garmentButton!);

    // Process button should appear
    await waitFor(() => {
      const processButton = screen.getByRole('button', { name: /generate.*look/i });
      expect(processButton).toBeInTheDocument();
    });
  });

  it('should include session tracking', async () => {
    render(<HomePage />);
    
    // Session should be initialized
    await waitFor(() => {
      const sessionId = window.sessionStorage.getItem('sessionId');
      expect(sessionId).toBeDefined();
    });
  });
});
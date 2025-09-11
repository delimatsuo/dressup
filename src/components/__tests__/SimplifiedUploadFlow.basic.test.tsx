/**
 * Basic test for SimplifiedUploadFlow component functionality
 * Focus on testing the simplification improvements
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SimplifiedUploadFlow } from '../SimplifiedUploadFlow';

describe('SimplifiedUploadFlow Basic Tests', () => {
  const mockOnGenerate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: jest.fn(),
      result: 'data:image/jpeg;base64,mockImageData',
      onload: null as any,
    };
    global.FileReader = jest.fn(() => mockFileReader) as any;
  });

  test('renders without crashing', () => {
    expect(() => {
      render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
    }).not.toThrow();
  });

  test('displays main heading', () => {
    render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
    expect(screen.getByText('Upload Your Photos')).toBeInTheDocument();
  });

  test('shows both upload areas simultaneously', () => {
    render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
    
    // Both upload sections should be visible at once (no step-by-step)
    expect(screen.getByText('Your Photo')).toBeInTheDocument();
    expect(screen.getByText('Garment Photo')).toBeInTheDocument();
  });

  test('has generate button present', () => {
    render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
    
    const generateButton = screen.getByText('Generate Virtual Try-On').closest('button');
    expect(generateButton).toBeInTheDocument();
    expect(generateButton).toBeDisabled(); // Should be disabled initially
  });

  test('displays result when provided', () => {
    const mockResult = {
      imageUrl: 'https://example.com/result.jpg',
      description: 'Test result'
    };
    
    render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} result={mockResult} />);
    
    // Should show result view instead of upload view
    expect(screen.getByText('Your Virtual Try-On')).toBeInTheDocument();
    expect(screen.getByAltText('Virtual try-on result')).toBeInTheDocument();
    expect(screen.getByText('Test result')).toBeInTheDocument();
  });

  test('shows processing state', () => {
    render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} isProcessing={true} />);
    
    expect(screen.getByText('Generating Your Look...')).toBeInTheDocument();
    expect(screen.getByText('Creating your virtual try-on...')).toBeInTheDocument();
  });

  test('has concise upload instructions', () => {
    render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} />);
    
    // Should have simple, clear instructions
    expect(screen.getByText('Upload a photo of yourself and the garment you want to try on')).toBeInTheDocument();
    expect(screen.getByText('Front-facing, clear background preferred')).toBeInTheDocument();
    expect(screen.getByText('Clear photo of the clothing item')).toBeInTheDocument();
  });

  test('result view has action buttons', () => {
    const mockResult = {
      imageUrl: 'https://example.com/result.jpg',
      description: 'Test result'
    };
    
    render(<SimplifiedUploadFlow onGenerate={mockOnGenerate} result={mockResult} />);
    
    expect(screen.getByText('Try Another')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });
});
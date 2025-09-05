import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedbackSection from '../FeedbackSection';

describe('FeedbackSection', () => {
  it('should render feedback title', () => {
    render(<FeedbackSection />);
    expect(screen.getByText(/share.*feedback/i)).toBeInTheDocument();
  });

  it('should display rating options', () => {
    render(<FeedbackSection />);
    
    // Should have 5 star rating options
    const stars = screen.getAllByRole('button', { name: /star/i });
    expect(stars).toHaveLength(5);
  });

  it('should allow selecting a rating', () => {
    const mockOnRate = jest.fn();
    render(<FeedbackSection onRate={mockOnRate} />);
    
    const fourthStar = screen.getAllByRole('button', { name: /star/i })[3];
    fireEvent.click(fourthStar);
    
    expect(mockOnRate).toHaveBeenCalledWith(4);
  });

  it('should highlight selected rating', () => {
    render(<FeedbackSection />);
    
    const thirdStar = screen.getAllByRole('button', { name: /star/i })[2];
    fireEvent.click(thirdStar);
    
    const stars = screen.getAllByRole('button', { name: /star/i });
    
    // First 3 stars should be filled
    stars.slice(0, 3).forEach(star => {
      expect(star).toHaveClass('filled');
    });
    
    // Last 2 stars should be empty
    stars.slice(3).forEach(star => {
      expect(star).not.toHaveClass('filled');
    });
  });

  it('should have a text area for written feedback', () => {
    render(<FeedbackSection />);
    
    const textarea = screen.getByPlaceholderText(/tell us.*experience/i);
    expect(textarea).toBeInTheDocument();
  });

  it('should allow typing feedback', async () => {
    render(<FeedbackSection />);
    
    const textarea = screen.getByPlaceholderText(/tell us.*experience/i);
    const feedbackText = 'Great app! The outfit suggestions are amazing.';
    
    await userEvent.type(textarea, feedbackText);
    
    expect(textarea).toHaveValue(feedbackText);
  });

  it('should have quick feedback buttons', () => {
    render(<FeedbackSection />);
    
    expect(screen.getByRole('button', { name: /love it/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /needs work/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /report issue/i })).toBeInTheDocument();
  });

  it('should handle quick feedback selection', () => {
    const mockOnQuickFeedback = jest.fn();
    render(<FeedbackSection onQuickFeedback={mockOnQuickFeedback} />);
    
    fireEvent.click(screen.getByRole('button', { name: /love it/i }));
    
    expect(mockOnQuickFeedback).toHaveBeenCalledWith('love-it');
  });

  it('should have a submit button', () => {
    render(<FeedbackSection />);
    
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('should handle feedback submission', async () => {
    const mockOnSubmit = jest.fn();
    render(<FeedbackSection onSubmit={mockOnSubmit} />);
    
    // Select rating
    const fourthStar = screen.getAllByRole('button', { name: /star/i })[3];
    fireEvent.click(fourthStar);
    
    // Type feedback
    const textarea = screen.getByPlaceholderText(/tell us.*experience/i);
    await userEvent.type(textarea, 'Good experience overall');
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    fireEvent.click(submitButton);
    
    expect(mockOnSubmit).toHaveBeenCalledWith({
      rating: 4,
      comment: 'Good experience overall',
    });
  });

  it('should show validation error if submitting without rating', () => {
    render(<FeedbackSection />);
    
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    fireEvent.click(submitButton);
    
    expect(screen.getByText(/please provide.*rating/i)).toBeInTheDocument();
  });

  it('should show success message after submission', async () => {
    const mockOnSubmit = jest.fn().mockResolvedValue(true);
    render(<FeedbackSection onSubmit={mockOnSubmit} />);
    
    // Select rating and submit
    const star = screen.getAllByRole('button', { name: /star/i })[4];
    fireEvent.click(star);
    
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/thank you.*feedback/i)).toBeInTheDocument();
    });
  });

  it('should disable form during submission', async () => {
    const mockOnSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<FeedbackSection onSubmit={mockOnSubmit} />);
    
    // Select rating and submit
    const star = screen.getAllByRole('button', { name: /star/i })[2];
    fireEvent.click(star);
    
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    fireEvent.click(submitButton);
    
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/submitting/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});
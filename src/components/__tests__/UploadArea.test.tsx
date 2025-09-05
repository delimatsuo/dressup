import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadArea from '../UploadArea';

describe('UploadArea', () => {
  it('should render upload area with title', () => {
    render(<UploadArea />);
    expect(screen.getByText(/upload your photo/i)).toBeInTheDocument();
  });

  it('should display drag and drop instructions', () => {
    render(<UploadArea />);
    expect(screen.getByText(/drag.*drop.*click.*upload/i)).toBeInTheDocument();
  });

  it('should have a file input for image upload', () => {
    render(<UploadArea />);
    const fileInput = screen.getByLabelText(/upload.*photo/i);
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('accept', 'image/*');
  });

  it('should call onUpload when a file is selected', async () => {
    const mockOnUpload = jest.fn();
    render(<UploadArea onUpload={mockOnUpload} />);
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/upload.*photo/i);
    
    await userEvent.upload(fileInput, file);
    
    expect(mockOnUpload).toHaveBeenCalledWith(file);
  });

  it('should show preview of uploaded image', async () => {
    render(<UploadArea />);
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/upload.*photo/i);
    
    await userEvent.upload(fileInput, file);
    
    await waitFor(() => {
      expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
    });
  });

  it('should show error for invalid file types', async () => {
    render(<UploadArea />);
    
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/upload.*photo/i);
    
    await userEvent.upload(fileInput, file);
    
    await waitFor(() => {
      expect(screen.getByText('Please upload an image file')).toBeInTheDocument();
    });
  });

  it('should support drag and drop for file upload', async () => {
    const mockOnUpload = jest.fn();
    render(<UploadArea onUpload={mockOnUpload} />);
    
    const dropZone = screen.getByTestId('drop-zone');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.dragOver(dropZone);
    expect(dropZone).toHaveClass('drag-over');

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] }
    });

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(file);
    });
  });
});
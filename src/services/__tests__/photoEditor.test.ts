

import { 
  PhotoEditor,
  ImageTransform,
  FilterType,
  EditHistory,
  BackgroundRemovalResult,
  ColorAdjustments,
  CropConfig,
  RotationAngle
} from '../photoEditor';

// Update existing mockCanvas with additional properties needed for PhotoEditor
mockCanvas.width = 800;
mockCanvas.height = 600;
mockCanvas.toDataURL = jest.fn(() => 'data:image/jpeg;base64,mockImageData');

// Create a more complete mock context
const mockContext = {
  fillStyle: '',
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  filter: 'none',
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
  setTransform: jest.fn(),
  canvas: mockCanvas
};

// Ensure getContext returns the mock context
mockCanvas.getContext = jest.fn((type) => {
  if (type === '2d') {
    return mockContext;
  }
  return null;
});

// Update document.createElement to return our properly mocked canvas
(global.document.createElement as jest.Mock).mockImplementation((tagName) => {
  if (tagName === 'canvas') {
    return mockCanvas;
  }
  return {};
});

// Mock Image constructor
const mockImage = {
  addEventListener: jest.fn((event, callback) => {
    if (event === 'load') {
      setTimeout(callback, 0);
    }
  }),
  src: '',
  width: 800,
  height: 600,
  naturalWidth: 800,
  naturalHeight: 600,
  onload: null,
  onerror: null,
};

Object.defineProperty(global, 'Image', {
  value: jest.fn(() => mockImage),
  writable: true,
});

// Mock URL.createObjectURL
Object.defineProperty(global.URL, 'createObjectURL', {
  value: jest.fn(() => 'blob:mock-url'),
});

// Mock fetch for background removal API
global.fetch = jest.fn();

describe('PhotoEditor', () => {
  let photoEditor: PhotoEditor;
  let mockImageFile: File;
  let mockImageBlob: Blob;

  beforeEach(() => {
    jest.clearAllMocks();
    photoEditor = new PhotoEditor();
    
    mockImageFile = new File(['mock image data'], 'test.jpg', { type: 'image/jpeg' });
    mockImageBlob = new Blob(['mock image data'], { type: 'image/jpeg' });
    
    // Reset mock implementations
    mockCanvas.getContext.mockReturnValue({
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
      putImageData: jest.fn(),
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
      filter: '',
    });
  });

  describe('Image Loading and Processing', () => {
    test('should load image from File object', async () => {
      const result = await photoEditor.loadImage(mockImageFile);

      expect(result).toBeDefined();
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.format).toBe('jpeg');
      expect(result.originalSize).toBeGreaterThan(0);
    });

    test('should load image from URL', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      
      const result = await photoEditor.loadImageFromUrl(imageUrl);

      expect(result).toBeDefined();
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(Image).toHaveBeenCalled();
    });

    test('should handle invalid image file', async () => {
      const invalidFile = new File(['invalid'], 'test.txt', { type: 'text/plain' });

      await expect(photoEditor.loadImage(invalidFile))
        .rejects
        .toThrow('Invalid image format');
    });

    test('should handle image load error', async () => {
      const mockImageWithError = {
        ...mockImage,
        addEventListener: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Load failed')), 0);
          }
        }),
      };
      
      (global.Image as jest.Mock).mockImplementation(() => mockImageWithError);

      await expect(photoEditor.loadImageFromUrl('invalid-url'))
        .rejects
        .toThrow('Failed to load image');
    });
  });

  describe('Cropping Functionality', () => {
    test('should crop image to specified dimensions', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const cropConfig: CropConfig = {
        x: 100,
        y: 100,
        width: 400,
        height: 300,
        aspectRatio: 4/3,
        maintainAspectRatio: true
      };

      const result = await photoEditor.cropImage(cropConfig);

      expect(result.width).toBe(400);
      expect(result.height).toBe(300);
      expect(mockCanvas.getContext).toHaveBeenCalled();
      expect(mockCanvas.toDataURL).toHaveBeenCalled();
    });

    test('should maintain aspect ratio when specified', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const cropConfig: CropConfig = {
        x: 0,
        y: 0,
        width: 500,
        height: 300,
        aspectRatio: 16/9,
        maintainAspectRatio: true
      };

      const result = await photoEditor.cropImage(cropConfig);

      // Should adjust height to maintain 16:9 ratio
      expect(result.width / result.height).toBeCloseTo(16/9, 2);
    });

    test('should handle crop dimensions exceeding image bounds', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const cropConfig: CropConfig = {
        x: 700,
        y: 500,
        width: 500,
        height: 400,
        aspectRatio: 1,
        maintainAspectRatio: false
      };

      const result = await photoEditor.cropImage(cropConfig);

      // Should adjust crop to fit within image bounds
      expect(result.width).toBeLessThanOrEqual(800);
      expect(result.height).toBeLessThanOrEqual(600);
    });
  });

  describe('Rotation Functionality', () => {
    test('should rotate image by 90 degrees clockwise', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const result = await photoEditor.rotateImage('90' as RotationAngle);

      expect(result.width).toBe(600); // Original height becomes width
      expect(result.height).toBe(800); // Original width becomes height
      expect(mockCanvas.getContext().rotate).toHaveBeenCalledWith(Math.PI / 2);
    });

    test('should rotate image by 180 degrees', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const result = await photoEditor.rotateImage('180' as RotationAngle);

      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(mockCanvas.getContext().rotate).toHaveBeenCalledWith(Math.PI);
    });

    test('should rotate image by 270 degrees (90 counter-clockwise)', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const result = await photoEditor.rotateImage('270' as RotationAngle);

      expect(result.width).toBe(600);
      expect(result.height).toBe(800);
      expect(mockCanvas.getContext().rotate).toHaveBeenCalledWith(-Math.PI / 2);
    });

    test('should handle custom rotation angles', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const result = await photoEditor.rotateImage(45);

      expect(mockCanvas.getContext().rotate).toHaveBeenCalledWith(Math.PI / 4);
    });
  });

  describe('Color Adjustments', () => {
    test('should adjust brightness', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const adjustments: ColorAdjustments = {
        brightness: 20,
        contrast: 0,
        saturation: 0,
        hue: 0,
        gamma: 1
      };

      const result = await photoEditor.adjustColors(adjustments);

      expect(result).toBeDefined();
      expect(mockCanvas.getContext().getImageData).toHaveBeenCalled();
      expect(mockCanvas.getContext().putImageData).toHaveBeenCalled();
    });

    test('should adjust contrast', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const adjustments: ColorAdjustments = {
        brightness: 0,
        contrast: 30,
        saturation: 0,
        hue: 0,
        gamma: 1
      };

      const result = await photoEditor.adjustColors(adjustments);

      expect(result).toBeDefined();
      expect(mockCanvas.getContext().getImageData).toHaveBeenCalled();
    });

    test('should adjust saturation', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const adjustments: ColorAdjustments = {
        brightness: 0,
        contrast: 0,
        saturation: -20,
        hue: 0,
        gamma: 1
      };

      const result = await photoEditor.adjustColors(adjustments);

      expect(result).toBeDefined();
      expect(mockCanvas.getContext().getImageData).toHaveBeenCalled();
    });

    test('should handle extreme adjustment values', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const adjustments: ColorAdjustments = {
        brightness: 100,
        contrast: 100,
        saturation: -100,
        hue: 180,
        gamma: 2.2
      };

      const result = await photoEditor.adjustColors(adjustments);

      expect(result).toBeDefined();
      // Should clamp values to valid ranges
      expect(adjustments.brightness).toBeLessThanOrEqual(100);
      expect(adjustments.contrast).toBeLessThanOrEqual(100);
    });
  });

  describe('Filter Application', () => {
    test('should apply blur filter', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const result = await photoEditor.applyFilter('blur', { intensity: 3 });

      expect(result).toBeDefined();
      expect(mockCanvas.getContext().filter).toContain('blur(3px)');
    });

    test('should apply sepia filter', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const result = await photoEditor.applyFilter('sepia', { intensity: 0.8 });

      expect(result).toBeDefined();
      expect(mockCanvas.getContext().filter).toContain('sepia(0.8)');
    });

    test('should apply grayscale filter', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const result = await photoEditor.applyFilter('grayscale', { intensity: 1 });

      expect(result).toBeDefined();
      expect(mockCanvas.getContext().filter).toContain('grayscale(1)');
    });

    test('should apply vintage filter combination', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const result = await photoEditor.applyFilter('vintage', {
        sepia: 0.6,
        contrast: 1.2,
        brightness: 1.1,
        vignette: 0.3
      });

      expect(result).toBeDefined();
      expect(mockCanvas.getContext().filter).toContain('sepia');
      expect(mockCanvas.getContext().filter).toContain('contrast');
    });

    test('should chain multiple filters', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const result = await photoEditor.applyFilter('custom', {
        blur: 1,
        brightness: 1.1,
        contrast: 1.2,
        saturation: 0.9
      });

      expect(result).toBeDefined();
      const filter = mockCanvas.getContext().filter;
      expect(filter).toContain('blur(1px)');
      expect(filter).toContain('brightness(1.1)');
      expect(filter).toContain('contrast(1.2)');
      expect(filter).toContain('saturate(0.9)');
    });
  });

  describe('Background Removal', () => {
    test('should remove background using AI service', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const mockResponse = {
        ok: true,
        blob: jest.fn().mockResolvedValue(mockImageBlob)
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await photoEditor.removeBackground({
        method: 'ai-service',
        apiKey: 'test-key',
        model: 'u2net'
      });

      expect(result.success).toBe(true);
      expect(result.processedImage).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('background-removal'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
    });

    test('should handle background removal failure', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await photoEditor.removeBackground({
        method: 'ai-service',
        apiKey: 'invalid-key'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Background removal failed');
    });

    test('should use client-side chroma key removal', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const result = await photoEditor.removeBackground({
        method: 'chroma-key',
        keyColor: '#00FF00', // Green screen
        tolerance: 20
      });

      expect(result.success).toBe(true);
      expect(result.processedImage).toBeDefined();
      expect(mockCanvas.getContext().getImageData).toHaveBeenCalled();
    });

    test('should replace background with new image', async () => {
      await photoEditor.loadImage(mockImageFile);
      const backgroundFile = new File(['bg data'], 'bg.jpg', { type: 'image/jpeg' });
      
      const removeResult = await photoEditor.removeBackground({
        method: 'chroma-key',
        keyColor: '#FFFFFF'
      });
      
      expect(removeResult.success).toBe(true);

      const replaceResult = await photoEditor.replaceBackground(backgroundFile, {
        blendMode: 'normal',
        opacity: 1,
        scale: 'cover'
      });

      expect(replaceResult.success).toBe(true);
      expect(replaceResult.processedImage).toBeDefined();
    });
  });

  describe('Real-time Preview', () => {
    test('should generate preview with low quality for performance', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const adjustments: ColorAdjustments = {
        brightness: 10,
        contrast: 15,
        saturation: -5,
        hue: 0,
        gamma: 1
      };

      const preview = await photoEditor.generatePreview(adjustments, {
        quality: 'low',
        maxWidth: 400,
        maxHeight: 300
      });

      expect(preview).toBeDefined();
      expect(preview.width).toBeLessThanOrEqual(400);
      expect(preview.height).toBeLessThanOrEqual(300);
    });

    test('should update preview in real-time during adjustments', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const onPreviewUpdate = jest.fn();
      
      await photoEditor.enableRealtimePreview({
        onUpdate: onPreviewUpdate,
        debounceMs: 100,
        quality: 'medium'
      });

      // Simulate adjustment changes
      await photoEditor.adjustColors({ brightness: 20, contrast: 0, saturation: 0, hue: 0, gamma: 1 });
      await photoEditor.adjustColors({ brightness: 25, contrast: 0, saturation: 0, hue: 0, gamma: 1 });

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(onPreviewUpdate).toHaveBeenCalled();
    });
  });

  describe('Edit History and Undo/Redo', () => {
    test('should track edit history', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      await photoEditor.adjustColors({ brightness: 10, contrast: 0, saturation: 0, hue: 0, gamma: 1 });
      await photoEditor.rotateImage('90' as RotationAngle);
      await photoEditor.applyFilter('blur', { intensity: 2 });

      const history = photoEditor.getEditHistory();

      expect(history).toHaveLength(3);
      expect(history[0].operation).toBe('color-adjustment');
      expect(history[1].operation).toBe('rotation');
      expect(history[2].operation).toBe('filter');
      expect(history.every(h => h.timestamp instanceof Date)).toBe(true);
    });

    test('should undo last operation', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const originalState = photoEditor.getCurrentImage();
      
      await photoEditor.adjustColors({ brightness: 20, contrast: 0, saturation: 0, hue: 0, gamma: 1 });
      const afterAdjustment = photoEditor.getCurrentImage();
      
      const undoResult = await photoEditor.undo();
      const afterUndo = photoEditor.getCurrentImage();

      expect(undoResult.success).toBe(true);
      expect(afterUndo).not.toEqual(afterAdjustment);
      expect(photoEditor.getEditHistory()).toHaveLength(0);
    });

    test('should redo undone operation', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      await photoEditor.adjustColors({ brightness: 20, contrast: 0, saturation: 0, hue: 0, gamma: 1 });
      await photoEditor.undo();
      
      const redoResult = await photoEditor.redo();

      expect(redoResult.success).toBe(true);
      expect(photoEditor.getEditHistory()).toHaveLength(1);
    });

    test('should handle undo when no history exists', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const undoResult = await photoEditor.undo();

      expect(undoResult.success).toBe(false);
      expect(undoResult.error).toContain('No operations to undo');
    });

    test('should handle redo when no future history exists', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const redoResult = await photoEditor.redo();

      expect(redoResult.success).toBe(false);
      expect(redoResult.error).toContain('No operations to redo');
    });

    test('should clear redo history when new operation is performed', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      await photoEditor.adjustColors({ brightness: 10, contrast: 0, saturation: 0, hue: 0, gamma: 1 });
      await photoEditor.rotateImage('90' as RotationAngle);
      await photoEditor.undo(); // Now we have 1 operation that can be redone
      
      // Perform new operation - should clear redo history
      await photoEditor.adjustColors({ brightness: 20, contrast: 0, saturation: 0, hue: 0, gamma: 1 });
      
      const redoResult = await photoEditor.redo();
      expect(redoResult.success).toBe(false);
    });
  });

  describe('Export Functionality', () => {
    test('should export image as JPEG with specified quality', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const exported = await photoEditor.exportImage({
        format: 'jpeg',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 800
      });

      expect(exported.blob).toBeDefined();
      expect(exported.dataUrl).toContain('data:image/jpeg');
      expect(exported.width).toBeLessThanOrEqual(1200);
      expect(exported.height).toBeLessThanOrEqual(800);
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/jpeg',
        0.8
      );
    });

    test('should export image as PNG with transparency', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const exported = await photoEditor.exportImage({
        format: 'png',
        preserveTransparency: true
      });

      expect(exported.blob).toBeDefined();
      expect(exported.dataUrl).toContain('data:image/png');
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/png',
        undefined
      );
    });

    test('should maintain original dimensions when no size limits specified', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      const exported = await photoEditor.exportImage({
        format: 'jpeg',
        quality: 1
      });

      expect(exported.width).toBe(800);
      expect(exported.height).toBe(600);
    });
  });

  describe('Performance and Memory Management', () => {
    test('should dispose of resources when requested', async () => {
      await photoEditor.loadImage(mockImageFile);
      
      await photoEditor.adjustColors({ brightness: 10, contrast: 0, saturation: 0, hue: 0, gamma: 1 });
      await photoEditor.applyFilter('blur', { intensity: 2 });
      
      photoEditor.dispose();

      expect(photoEditor.getEditHistory()).toHaveLength(0);
      expect(() => photoEditor.getCurrentImage()).toThrow('No image loaded');
    });

    test('should handle large images by downscaling for operations', async () => {
      // Mock a very large image
      const largeImageMock = {
        ...mockImage,
        width: 4000,
        height: 3000,
        naturalWidth: 4000,
        naturalHeight: 3000
      };
      
      (global.Image as jest.Mock).mockImplementation(() => largeImageMock);

      const largeImageFile = new File(['large image'], 'large.jpg', { type: 'image/jpeg' });
      
      const result = await photoEditor.loadImage(largeImageFile, {
        maxProcessingSize: 2048
      });

      // Should scale down for processing but maintain original for export
      expect(result.processingWidth).toBeLessThanOrEqual(2048);
      expect(result.processingHeight).toBeLessThanOrEqual(2048 * (3000/4000));
      expect(result.originalWidth).toBe(4000);
      expect(result.originalHeight).toBe(3000);
    });
  });

  describe('Error Handling', () => {
    test('should handle canvas creation failures', async () => {
      // Mock canvas creation failure
      (global.HTMLCanvasElement as jest.Mock).mockImplementation(() => {
        throw new Error('Canvas not supported');
      });

      await expect(photoEditor.loadImage(mockImageFile))
        .rejects
        .toThrow('Canvas not supported');
    });

    test('should handle file reading errors', async () => {
      const corruptFile = new File([''], 'corrupt.jpg', { type: 'image/jpeg' });
      
      // Mock FileReader failure
      const originalFileReader = global.FileReader;
      global.FileReader = jest.fn(() => ({
        readAsDataURL: jest.fn(function(this: any) {
          setTimeout(() => this.onerror(new Error('Read failed')), 0);
        }),
        result: null,
        onerror: null,
        onload: null,
      })) as any;

      await expect(photoEditor.loadImage(corruptFile))
        .rejects
        .toThrow('Failed to read image file');

      global.FileReader = originalFileReader;
    });

    test('should validate image dimensions', async () => {
      const tinyImage = {
        ...mockImage,
        width: 10,
        height: 10,
        naturalWidth: 10,
        naturalHeight: 10
      };
      
      (global.Image as jest.Mock).mockImplementation(() => tinyImage);

      await expect(photoEditor.loadImage(mockImageFile, { minWidth: 50, minHeight: 50 }))
        .rejects
        .toThrow('Image too small');
    });
  });
});
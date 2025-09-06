export type FilterType = 
  | 'blur' 
  | 'sepia' 
  | 'grayscale' 
  | 'vintage' 
  | 'custom';

export type RotationAngle = '90' | '180' | '270' | number;

export interface ImageTransform {
  width: number;
  height: number;
  format: string;
  originalSize: number;
  processingWidth?: number;
  processingHeight?: number;
  originalWidth?: number;
  originalHeight?: number;
}

export interface CropConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio?: number;
  maintainAspectRatio?: boolean;
}

export interface ColorAdjustments {
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  saturation: number; // -100 to 100
  hue: number;        // -180 to 180
  gamma: number;      // 0.1 to 3.0
}

export interface EditHistory {
  id: string;
  operation: string;
  parameters: any;
  timestamp: Date;
  imageState: string; // Base64 data URL
}

export interface BackgroundRemovalResult {
  success: boolean;
  processedImage?: string;
  confidence?: number;
  error?: string;
}

export interface ExportOptions {
  format: 'jpeg' | 'png' | 'webp';
  quality?: number; // 0-1 for JPEG/WebP
  maxWidth?: number;
  maxHeight?: number;
  preserveTransparency?: boolean;
}

export interface LoadOptions {
  maxProcessingSize?: number;
  minWidth?: number;
  minHeight?: number;
}

export interface PreviewOptions {
  quality: 'low' | 'medium' | 'high';
  maxWidth?: number;
  maxHeight?: number;
}

export interface RealtimePreviewOptions {
  onUpdate: (previewUrl: string) => void;
  debounceMs?: number;
  quality?: 'low' | 'medium' | 'high';
}

export class PhotoEditor {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private currentImage: HTMLImageElement | null = null;
  private originalImageData: string | null = null;
  private editHistory: EditHistory[] = [];
  private redoHistory: EditHistory[] = [];
  private isDisposed = false;
  private realtimePreview: RealtimePreviewOptions | null = null;
  private previewTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeCanvas();
    }
  }

  private initializeCanvas(): void {
    try {
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
      
      if (!this.context) {
        throw new Error('Canvas 2D context not supported');
      }
    } catch (error) {
      throw new Error(`Canvas initialization failed: ${error}`);
    }
  }

  private throwIfDisposed(): void {
    if (this.isDisposed) {
      throw new Error('PhotoEditor has been disposed');
    }
  }

  private clampValue(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private calculateDimensions(
    originalWidth: number, 
    originalHeight: number, 
    maxWidth?: number, 
    maxHeight?: number
  ): { width: number; height: number } {
    if (!maxWidth && !maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const aspectRatio = originalWidth / originalHeight;
    let width = originalWidth;
    let height = originalHeight;

    if (maxWidth && width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (maxHeight && height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  private addToHistory(operation: string, parameters: any): void {
    if (!this.canvas) return;

    const historyItem: EditHistory = {
      id: crypto.randomUUID(),
      operation,
      parameters: { ...parameters },
      timestamp: new Date(),
      imageState: this.canvas.toDataURL()
    };

    this.editHistory.push(historyItem);
    this.redoHistory = []; // Clear redo history when new operation is performed

    // Limit history size to prevent memory issues
    if (this.editHistory.length > 20) {
      this.editHistory.shift();
    }
  }

  async loadImage(file: File, options: LoadOptions = {}): Promise<ImageTransform> {
    this.throwIfDisposed();

    if (!file.type.startsWith('image/')) {
      throw new Error('Invalid image format');
    }

    const { maxProcessingSize = 2048, minWidth = 1, minHeight = 1 } = options;

    try {
      const dataUrl = await this.fileToDataUrl(file);
      const image = await this.createImageFromUrl(dataUrl);

      if (image.width < minWidth || image.height < minHeight) {
        throw new Error('Image too small');
      }

      this.currentImage = image;
      this.originalImageData = dataUrl;

      // Calculate processing dimensions
      const processingDimensions = this.calculateDimensions(
        image.width,
        image.height,
        maxProcessingSize,
        maxProcessingSize
      );

      // Set up canvas
      if (this.canvas) {
        this.canvas.width = processingDimensions.width;
        this.canvas.height = processingDimensions.height;
        
        if (this.context) {
          this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
          this.context.drawImage(
            image,
            0, 0,
            image.width, image.height,
            0, 0,
            processingDimensions.width, processingDimensions.height
          );
        }
      }

      return {
        width: processingDimensions.width,
        height: processingDimensions.height,
        format: this.getImageFormat(file.type),
        originalSize: file.size,
        processingWidth: processingDimensions.width,
        processingHeight: processingDimensions.height,
        originalWidth: image.width,
        originalHeight: image.height
      };
    } catch (error) {
      throw new Error(`Failed to load image: ${error}`);
    }
  }

  async loadImageFromUrl(url: string, options: LoadOptions = {}): Promise<ImageTransform> {
    this.throwIfDisposed();

    try {
      const image = await this.createImageFromUrl(url);
      
      // Create a mock file for consistency with loadImage
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(image, 0, 0);
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!));
      });
      
      const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
      
      return this.loadImage(file, options);
    } catch (error) {
      throw new Error('Failed to load image');
    }
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as data URL'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }

  private createImageFromUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      
      image.src = url;
    });
  }

  private getImageFormat(mimeType: string): string {
    const formatMap: Record<string, string> = {
      'image/jpeg': 'jpeg',
      'image/jpg': 'jpeg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif'
    };
    
    return formatMap[mimeType] || 'jpeg';
  }

  async cropImage(config: CropConfig): Promise<ImageTransform> {
    this.throwIfDisposed();

    if (!this.canvas || !this.context || !this.currentImage) {
      throw new Error('No image loaded');
    }

    let { x, y, width, height, aspectRatio, maintainAspectRatio } = config;

    // Ensure crop area is within image bounds
    x = this.clampValue(x, 0, this.canvas.width - 1);
    y = this.clampValue(y, 0, this.canvas.height - 1);
    width = this.clampValue(width, 1, this.canvas.width - x);
    height = this.clampValue(height, 1, this.canvas.height - y);

    // Maintain aspect ratio if specified
    if (maintainAspectRatio && aspectRatio) {
      const currentRatio = width / height;
      
      if (currentRatio > aspectRatio) {
        width = height * aspectRatio;
      } else {
        height = width / aspectRatio;
      }
      
      // Ensure adjusted dimensions still fit
      width = Math.min(width, this.canvas.width - x);
      height = Math.min(height, this.canvas.height - y);
    }

    // Get image data from crop area
    const imageData = this.context.getImageData(x, y, width, height);

    // Create new canvas for cropped image
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = width;
    croppedCanvas.height = height;
    const croppedContext = croppedCanvas.getContext('2d');
    
    if (croppedContext) {
      croppedContext.putImageData(imageData, 0, 0);
    }

    // Update main canvas
    this.canvas.width = width;
    this.canvas.height = height;
    this.context.clearRect(0, 0, width, height);
    this.context.drawImage(croppedCanvas, 0, 0);

    this.addToHistory('crop', config);
    this.triggerPreviewUpdate();

    return {
      width,
      height,
      format: 'jpeg',
      originalSize: 0
    };
  }

  async rotateImage(angle: RotationAngle): Promise<ImageTransform> {
    this.throwIfDisposed();

    if (!this.canvas || !this.context) {
      throw new Error('No image loaded');
    }

    const numericAngle = typeof angle === 'string' ? parseInt(angle) : angle;
    const radians = (numericAngle * Math.PI) / 180;

    const originalWidth = this.canvas.width;
    const originalHeight = this.canvas.height;

    // Calculate new dimensions after rotation
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));
    const newWidth = Math.round(originalWidth * cos + originalHeight * sin);
    const newHeight = Math.round(originalWidth * sin + originalHeight * cos);

    // Get current image data
    const imageData = this.context.getImageData(0, 0, originalWidth, originalHeight);

    // Create temporary canvas for rotation
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalWidth;
    tempCanvas.height = originalHeight;
    const tempContext = tempCanvas.getContext('2d');
    
    if (tempContext) {
      tempContext.putImageData(imageData, 0, 0);
    }

    // Resize main canvas
    this.canvas.width = newWidth;
    this.canvas.height = newHeight;

    // Apply rotation
    this.context.clearRect(0, 0, newWidth, newHeight);
    this.context.save();
    this.context.translate(newWidth / 2, newHeight / 2);
    this.context.rotate(radians);
    this.context.drawImage(tempCanvas, -originalWidth / 2, -originalHeight / 2);
    this.context.restore();

    this.addToHistory('rotation', { angle });
    this.triggerPreviewUpdate();

    return {
      width: newWidth,
      height: newHeight,
      format: 'jpeg',
      originalSize: 0
    };
  }

  async adjustColors(adjustments: ColorAdjustments): Promise<ImageTransform> {
    this.throwIfDisposed();

    if (!this.canvas || !this.context) {
      throw new Error('No image loaded');
    }

    const { brightness, contrast, saturation, hue, gamma } = adjustments;

    // Get image data
    const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    // Apply adjustments pixel by pixel
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Apply brightness
      if (brightness !== 0) {
        const brightnessFactor = brightness / 100 * 255;
        r = this.clampValue(r + brightnessFactor, 0, 255);
        g = this.clampValue(g + brightnessFactor, 0, 255);
        b = this.clampValue(b + brightnessFactor, 0, 255);
      }

      // Apply contrast
      if (contrast !== 0) {
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        r = this.clampValue(factor * (r - 128) + 128, 0, 255);
        g = this.clampValue(factor * (g - 128) + 128, 0, 255);
        b = this.clampValue(factor * (b - 128) + 128, 0, 255);
      }

      // Apply saturation
      if (saturation !== 0) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const satFactor = 1 + saturation / 100;
        r = this.clampValue(gray + satFactor * (r - gray), 0, 255);
        g = this.clampValue(gray + satFactor * (g - gray), 0, 255);
        b = this.clampValue(gray + satFactor * (b - gray), 0, 255);
      }

      // Apply gamma correction
      if (gamma !== 1) {
        r = Math.pow(r / 255, 1 / gamma) * 255;
        g = Math.pow(g / 255, 1 / gamma) * 255;
        b = Math.pow(b / 255, 1 / gamma) * 255;
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    // Apply hue adjustment using canvas filter (more complex)
    if (hue !== 0) {
      this.context.filter = `hue-rotate(${hue}deg)`;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.canvas.width;
      tempCanvas.height = this.canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.putImageData(imageData, 0, 0);
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.drawImage(tempCanvas, 0, 0);
        this.context.filter = 'none';
      }
    } else {
      this.context.putImageData(imageData, 0, 0);
    }

    this.addToHistory('color-adjustment', adjustments);
    this.triggerPreviewUpdate();

    return {
      width: this.canvas.width,
      height: this.canvas.height,
      format: 'jpeg',
      originalSize: 0
    };
  }

  async applyFilter(filterType: FilterType, options: any = {}): Promise<ImageTransform> {
    this.throwIfDisposed();

    if (!this.canvas || !this.context) {
      throw new Error('No image loaded');
    }

    let filter = '';

    switch (filterType) {
      case 'blur':
        filter = `blur(${options.intensity || 1}px)`;
        break;
      
      case 'sepia':
        filter = `sepia(${options.intensity || 1})`;
        break;
      
      case 'grayscale':
        filter = `grayscale(${options.intensity || 1})`;
        break;
      
      case 'vintage':
        filter = [
          `sepia(${options.sepia || 0.6})`,
          `contrast(${options.contrast || 1.2})`,
          `brightness(${options.brightness || 1.1})`,
          `saturate(0.8)`
        ].join(' ');
        break;
      
      case 'custom':
        const filters = [];
        if (options.blur) filters.push(`blur(${options.blur}px)`);
        if (options.brightness) filters.push(`brightness(${options.brightness})`);
        if (options.contrast) filters.push(`contrast(${options.contrast})`);
        if (options.saturation) filters.push(`saturate(${options.saturation})`);
        if (options.hue) filters.push(`hue-rotate(${options.hue}deg)`);
        filter = filters.join(' ');
        break;
    }

    // Create temporary canvas to apply filter
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempContext = tempCanvas.getContext('2d');
    
    if (tempContext) {
      // Copy current image to temp canvas
      tempContext.drawImage(this.canvas, 0, 0);
      
      // Apply filter to main context
      this.context.filter = filter;
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.context.drawImage(tempCanvas, 0, 0);
      this.context.filter = 'none';
    }

    this.addToHistory('filter', { filterType, options });
    this.triggerPreviewUpdate();

    return {
      width: this.canvas.width,
      height: this.canvas.height,
      format: 'jpeg',
      originalSize: 0
    };
  }

  async removeBackground(options: {
    method: 'ai-service' | 'chroma-key';
    apiKey?: string;
    model?: string;
    keyColor?: string;
    tolerance?: number;
  }): Promise<BackgroundRemovalResult> {
    this.throwIfDisposed();

    if (!this.canvas) {
      return { success: false, error: 'No image loaded' };
    }

    try {
      if (options.method === 'ai-service') {
        return await this.removeBackgroundWithAI(options);
      } else if (options.method === 'chroma-key') {
        return await this.removeBackgroundWithChromaKey(options);
      }
      
      return { success: false, error: 'Invalid background removal method' };
    } catch (error) {
      return { success: false, error: `Background removal failed: ${error}` };
    }
  }

  private async removeBackgroundWithAI(options: {
    apiKey?: string;
    model?: string;
  }): Promise<BackgroundRemovalResult> {
    if (!options.apiKey) {
      return { success: false, error: 'API key required for AI background removal' };
    }

    try {
      const imageBlob = await new Promise<Blob>((resolve) => {
        this.canvas!.toBlob((blob) => resolve(blob!));
      });

      const formData = new FormData();
      formData.append('image', imageBlob);
      if (options.model) {
        formData.append('model', options.model);
      }

      const response = await fetch('https://api.backgroundremoval.service/remove', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${options.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const resultBlob = await response.blob();
      const resultUrl = URL.createObjectURL(resultBlob);

      // Load the result back into canvas
      const resultImage = await this.createImageFromUrl(resultUrl);
      
      if (this.context) {
        this.context.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
        this.context.drawImage(resultImage, 0, 0);
      }

      URL.revokeObjectURL(resultUrl);

      this.addToHistory('background-removal', { method: 'ai-service', ...options });
      
      return {
        success: true,
        processedImage: this.canvas!.toDataURL(),
        confidence: 0.9 // Mock confidence score
      };
    } catch (error) {
      return { success: false, error: `AI background removal failed: ${error}` };
    }
  }

  private async removeBackgroundWithChromaKey(options: {
    keyColor?: string;
    tolerance?: number;
  }): Promise<BackgroundRemovalResult> {
    if (!this.context) {
      return { success: false, error: 'Canvas context not available' };
    }

    const keyColor = options.keyColor || '#00FF00'; // Default to green
    const tolerance = options.tolerance || 20;

    // Convert hex color to RGB
    const r = parseInt(keyColor.slice(1, 3), 16);
    const g = parseInt(keyColor.slice(3, 5), 16);
    const b = parseInt(keyColor.slice(5, 7), 16);

    const imageData = this.context.getImageData(0, 0, this.canvas!.width, this.canvas!.height);
    const data = imageData.data;

    // Remove pixels similar to key color
    for (let i = 0; i < data.length; i += 4) {
      const pixelR = data[i];
      const pixelG = data[i + 1];
      const pixelB = data[i + 2];

      // Calculate color difference
      const diff = Math.sqrt(
        Math.pow(pixelR - r, 2) +
        Math.pow(pixelG - g, 2) +
        Math.pow(pixelB - b, 2)
      );

      // Make pixel transparent if within tolerance
      if (diff <= tolerance) {
        data[i + 3] = 0; // Set alpha to 0
      }
    }

    this.context.putImageData(imageData, 0, 0);
    this.addToHistory('background-removal', { method: 'chroma-key', ...options });

    return {
      success: true,
      processedImage: this.canvas!.toDataURL(),
      confidence: 0.8
    };
  }

  async replaceBackground(
    backgroundFile: File,
    options: {
      blendMode?: string;
      opacity?: number;
      scale?: 'cover' | 'contain' | 'stretch';
    } = {}
  ): Promise<BackgroundRemovalResult> {
    this.throwIfDisposed();

    if (!this.canvas || !this.context) {
      return { success: false, error: 'No image loaded' };
    }

    try {
      const backgroundUrl = await this.fileToDataUrl(backgroundFile);
      const backgroundImage = await this.createImageFromUrl(backgroundUrl);

      // Create a temporary canvas for the background
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = this.canvas.width;
      bgCanvas.height = this.canvas.height;
      const bgContext = bgCanvas.getContext('2d');

      if (bgContext) {
        // Draw background based on scale option
        const { scale = 'cover' } = options;
        
        if (scale === 'cover') {
          // Scale background to cover entire canvas
          const scaleX = this.canvas.width / backgroundImage.width;
          const scaleY = this.canvas.height / backgroundImage.height;
          const scale = Math.max(scaleX, scaleY);
          
          const scaledWidth = backgroundImage.width * scale;
          const scaledHeight = backgroundImage.height * scale;
          const x = (this.canvas.width - scaledWidth) / 2;
          const y = (this.canvas.height - scaledHeight) / 2;
          
          bgContext.drawImage(backgroundImage, x, y, scaledWidth, scaledHeight);
        } else if (scale === 'contain') {
          // Scale background to fit within canvas
          const scaleX = this.canvas.width / backgroundImage.width;
          const scaleY = this.canvas.height / backgroundImage.height;
          const scale = Math.min(scaleX, scaleY);
          
          const scaledWidth = backgroundImage.width * scale;
          const scaledHeight = backgroundImage.height * scale;
          const x = (this.canvas.width - scaledWidth) / 2;
          const y = (this.canvas.height - scaledHeight) / 2;
          
          bgContext.drawImage(backgroundImage, x, y, scaledWidth, scaledHeight);
        } else {
          // Stretch to fill entire canvas
          bgContext.drawImage(backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
        }

        // Create composite image
        const currentImageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background first
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.drawImage(bgCanvas, 0, 0);
        
        // Set blend mode and opacity
        if (options.blendMode) {
          this.context.globalCompositeOperation = options.blendMode as GlobalCompositeOperation;
        } else {
          this.context.globalCompositeOperation = 'source-over';
        }
        
        if (options.opacity !== undefined) {
          this.context.globalAlpha = options.opacity;
        }

        // Draw the foreground image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempContext = tempCanvas.getContext('2d');
        if (tempContext) {
          tempContext.putImageData(currentImageData, 0, 0);
          this.context.drawImage(tempCanvas, 0, 0);
        }

        // Reset composite operation
        this.context.globalCompositeOperation = 'source-over';
        this.context.globalAlpha = 1;
      }

      this.addToHistory('background-replacement', { options });

      return {
        success: true,
        processedImage: this.canvas.toDataURL()
      };
    } catch (error) {
      return { success: false, error: `Background replacement failed: ${error}` };
    }
  }

  async generatePreview(
    adjustments: ColorAdjustments,
    previewOptions: PreviewOptions
  ): Promise<ImageTransform> {
    this.throwIfDisposed();

    if (!this.canvas) {
      throw new Error('No image loaded');
    }

    // Create a smaller canvas for preview
    const maxDimension = previewOptions.quality === 'low' ? 200 : 
                       previewOptions.quality === 'medium' ? 400 : 800;

    const dimensions = this.calculateDimensions(
      this.canvas.width,
      this.canvas.height,
      previewOptions.maxWidth || maxDimension,
      previewOptions.maxHeight || maxDimension
    );

    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = dimensions.width;
    previewCanvas.height = dimensions.height;
    const previewContext = previewCanvas.getContext('2d');

    if (previewContext) {
      // Apply adjustments to preview canvas
      previewContext.drawImage(this.canvas, 0, 0, dimensions.width, dimensions.height);
      
      // Apply color adjustments with CSS filters for better performance
      const filters = [];
      if (adjustments.brightness !== 0) {
        filters.push(`brightness(${(100 + adjustments.brightness) / 100})`);
      }
      if (adjustments.contrast !== 0) {
        filters.push(`contrast(${(100 + adjustments.contrast) / 100})`);
      }
      if (adjustments.saturation !== 0) {
        filters.push(`saturate(${(100 + adjustments.saturation) / 100})`);
      }
      if (adjustments.hue !== 0) {
        filters.push(`hue-rotate(${adjustments.hue}deg)`);
      }

      if (filters.length > 0) {
        previewContext.filter = filters.join(' ');
        previewContext.drawImage(previewCanvas, 0, 0);
        previewContext.filter = 'none';
      }
    }

    return {
      width: dimensions.width,
      height: dimensions.height,
      format: 'jpeg',
      originalSize: 0
    };
  }

  async enableRealtimePreview(options: RealtimePreviewOptions): Promise<void> {
    this.realtimePreview = options;
  }

  private triggerPreviewUpdate(): void {
    if (!this.realtimePreview) return;

    // Clear existing timeout
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
    }

    // Set new timeout for debounced update
    this.previewTimeout = setTimeout(() => {
      if (this.canvas && this.realtimePreview) {
        const previewUrl = this.canvas.toDataURL();
        this.realtimePreview.onUpdate(previewUrl);
      }
    }, this.realtimePreview.debounceMs || 300);
  }

  getEditHistory(): EditHistory[] {
    return [...this.editHistory];
  }

  async undo(): Promise<{ success: boolean; error?: string }> {
    this.throwIfDisposed();

    if (this.editHistory.length === 0) {
      return { success: false, error: 'No operations to undo' };
    }

    const lastOperation = this.editHistory.pop()!;
    this.redoHistory.push(lastOperation);

    // Restore to previous state
    if (this.editHistory.length > 0) {
      const previousState = this.editHistory[this.editHistory.length - 1].imageState;
      await this.restoreFromDataUrl(previousState);
    } else if (this.originalImageData) {
      await this.restoreFromDataUrl(this.originalImageData);
    }

    return { success: true };
  }

  async redo(): Promise<{ success: boolean; error?: string }> {
    this.throwIfDisposed();

    if (this.redoHistory.length === 0) {
      return { success: false, error: 'No operations to redo' };
    }

    const operationToRedo = this.redoHistory.pop()!;
    this.editHistory.push(operationToRedo);

    await this.restoreFromDataUrl(operationToRedo.imageState);

    return { success: true };
  }

  private async restoreFromDataUrl(dataUrl: string): Promise<void> {
    if (!this.canvas || !this.context) return;

    const image = await this.createImageFromUrl(dataUrl);
    
    this.canvas.width = image.width;
    this.canvas.height = image.height;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.drawImage(image, 0, 0);
  }

  getCurrentImage(): string {
    this.throwIfDisposed();

    if (!this.canvas) {
      throw new Error('No image loaded');
    }

    return this.canvas.toDataURL();
  }

  async exportImage(options: ExportOptions): Promise<{
    blob: Blob;
    dataUrl: string;
    width: number;
    height: number;
  }> {
    this.throwIfDisposed();

    if (!this.canvas) {
      throw new Error('No image loaded');
    }

    // Calculate export dimensions
    const dimensions = this.calculateDimensions(
      this.canvas.width,
      this.canvas.height,
      options.maxWidth,
      options.maxHeight
    );

    // Create export canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = dimensions.width;
    exportCanvas.height = dimensions.height;
    const exportContext = exportCanvas.getContext('2d');

    if (exportContext) {
      exportContext.drawImage(this.canvas, 0, 0, dimensions.width, dimensions.height);
    }

    // Convert to blob and data URL
    const mimeType = `image/${options.format}`;
    const quality = options.format === 'png' ? undefined : (options.quality || 0.9);

    const blob = await new Promise<Blob>((resolve) => {
      exportCanvas.toBlob((blob) => resolve(blob!), mimeType, quality);
    });

    const dataUrl = exportCanvas.toDataURL(mimeType, quality);

    return {
      blob,
      dataUrl,
      width: dimensions.width,
      height: dimensions.height
    };
  }

  dispose(): void {
    // Clear timeouts
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = null;
    }

    // Clear references
    this.canvas = null;
    this.context = null;
    this.currentImage = null;
    this.originalImageData = null;
    this.editHistory = [];
    this.redoHistory = [];
    this.realtimePreview = null;
    this.isDisposed = true;
  }
}

// Export singleton instance (only create in browser environment)
export const photoEditor = typeof window !== 'undefined' ? new PhotoEditor() : null;
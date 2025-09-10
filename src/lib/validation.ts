import { z } from 'zod';

// Session validation schemas
export const createSessionSchema = z.object({
  // Optional initial data
  metadata: z.record(z.any()).optional()
});

export const sessionIdSchema = z.string().min(1).regex(/^session_/);

// Upload validation schemas
export const uploadSchema = z.object({
  sessionId: z.string().min(1),
  category: z.enum(['user', 'garment']),
  type: z.enum(['front', 'side', 'back']),
  file: z.any() // File validation happens separately
});

// Try-on validation schemas
export const tryOnRequestSchema = z.object({
  sessionId: z.string().min(1),
  userPhotos: z.object({
    front: z.string().url(),
    side: z.string().url(),
    back: z.string().url().optional()
  }),
  garmentPhotos: z.object({
    front: z.string().url(),
    side: z.string().url(),
    back: z.string().url().optional()
  }),
  options: z.object({
    generateMultiplePoses: z.boolean().optional(),
    enhanceBackground: z.boolean().optional()
  }).optional()
});

// File validation
export const validateFile = (file: File) => {
  const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
  
  const errors: string[] = [];
  
  if (!file) {
    errors.push('No file provided');
  }
  
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Image dimension validation
export const validateImageDimensions = async (file: File): Promise<{
  valid: boolean;
  width?: number;
  height?: number;
  errors: string[];
}> => {
  const MIN_WIDTH = 512;
  const MIN_HEIGHT = 512;
  
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const errors: string[] = [];
      
      if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
        errors.push(`Image dimensions must be at least ${MIN_WIDTH}x${MIN_HEIGHT}px`);
      }
      
      resolve({
        valid: errors.length === 0,
        width: img.width,
        height: img.height,
        errors
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        errors: ['Failed to load image']
      });
    };
    
    img.src = url;
  });
};

// Request validation helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
} {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}
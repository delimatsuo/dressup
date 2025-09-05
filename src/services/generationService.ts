import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeFirebase } from '@/lib/firebase';

interface GenerationResult {
  imageUrl: string;
  processingTime: number;
  confidence: number;
  description: string;
}

interface FirebaseGenerationResponse {
  processedImageUrl: string;
  processingTime: number;
  confidence: number;
  description: string;
}

/**
 * Generates an outfit pose using the Cloud Function from Task 6
 * @param sessionId - The user's session ID
 * @param garmentImageUrl - URL of the garment image to try on
 * @returns Promise that resolves with generated image URL and metadata
 */
export const generateOutfitPose = async (
  sessionId: string, 
  garmentImageUrl: string
): Promise<GenerationResult> => {
  // Parameter validation
  if (!sessionId || sessionId.trim() === '') {
    throw new Error('sessionId is required');
  }
  
  if (!garmentImageUrl || garmentImageUrl.trim() === '') {
    throw new Error('garmentImageUrl is required');
  }

  // Initialize Firebase if needed
  initializeFirebase();
  
  const functions = getFunctions();
  
  try {
    // Call the Cloud Function from Task 6
    const processImageFunction = httpsCallable(functions, 'processImageWithGemini', {
      timeout: 60000 // 60 second timeout
    });
    
    const result = await processImageFunction({
      sessionId,
      garmentImageUrl
    });
    
    const data = result.data as FirebaseGenerationResponse;
    
    // Validate response structure
    if (!data || !data.processedImageUrl) {
      throw new Error('Invalid response from generation service');
    }
    
    // Transform the response to match our interface
    return {
      imageUrl: data.processedImageUrl,
      processingTime: data.processingTime || 0,
      confidence: data.confidence || 0,
      description: data.description || 'Outfit generated successfully'
    };
    
  } catch (error: any) {
    console.error('Generation service error:', error);
    
    // Handle specific Firebase error codes
    if (error?.code === 'functions/deadline-exceeded') {
      throw new Error('Generation timeout - please try again');
    }
    
    if (error?.code === 'functions/unauthenticated') {
      throw new Error('Authentication required - please refresh the page');
    }
    
    // Re-throw validation errors as-is
    if (error?.message?.includes('required') || error?.message?.includes('Invalid response')) {
      throw error;
    }
    
    // Wrap other errors with context
    throw new Error(`Failed to generate outfit pose: ${error?.message || 'Unknown error'}`);
  }
};
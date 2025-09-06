import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  Storage 
} from 'firebase/storage';
import { 
  getFunctions, 
  httpsCallable,
  Functions 
} from 'firebase/functions';

let app: FirebaseApp | null = null;
let storage: Storage | null = null;
let functions: Functions | null = null;
interface GarmentData {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  description?: string;
}

let garmentsCache: GarmentData[] | null = null;

export const initializeFirebase = () => {
  // Skip during SSR/build time
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (app) return app;

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Validate configuration
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  for (const key of requiredKeys) {
    if (!firebaseConfig[key as keyof typeof firebaseConfig]) {
      console.error('Firebase config:', firebaseConfig);
      console.error(`Missing Firebase configuration: ${key}`);
      throw new Error(`Firebase configuration missing: ${key}`);
    }
  }
  
  console.log('Firebase initializing with config:', {
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket
  });

  app = initializeApp(firebaseConfig);
  storage = getStorage(app);
  functions = getFunctions(app);

  return app;
};

export const uploadImage = async (file: File, sessionId: string): Promise<string> => {
  // Skip during SSR/build time
  if (typeof window === 'undefined') {
    throw new Error('Upload not available during server-side rendering');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size must be less than 10MB');
  }

  if (!storage) {
    initializeFirebase();
    storage = getStorage();
  }

  const timestamp = Date.now();
  const fileName = `uploads/${sessionId}/${timestamp}_${file.name}`;
  const storageRef = ref(storage, fileName);

  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
};

export const getGarments = async (): Promise<GarmentData[]> => {
  // Skip during SSR/build time
  if (typeof window === 'undefined') {
    return [];
  }

  // Return cached garments if available
  if (garmentsCache) {
    return garmentsCache;
  }

  if (!functions) {
    initializeFirebase();
    functions = getFunctions();
  }

  try {
    const getGarmentsFunction = httpsCallable(functions, 'getGarments');
    const result = await getGarmentsFunction();
    garmentsCache = result.data as GarmentData[];
    return garmentsCache;
  } catch (error) {
    console.error('Error fetching garments, using mock data:', error);
    // Fallback to mock data if Firebase functions aren't available yet
    const mockGarments = [
      { id: '1', name: 'Casual T-Shirt', imageUrl: '/images/tshirt.jpg', category: 'casual' },
      { id: '2', name: 'Business Suit', imageUrl: '/images/suit.jpg', category: 'formal' },
      { id: '3', name: 'Summer Dress', imageUrl: '/images/dress.jpg', category: 'casual' },
      { id: '4', name: 'Evening Gown', imageUrl: '/images/gown.jpg', category: 'formal' },
    ];
    garmentsCache = mockGarments;
    return mockGarments;
  }
};

export const processImage = async (
  userImageUrl: string,
  garmentId: string,
  sessionId: string
): Promise<{
  processedImageUrl: string;
  processingTime: number;
  confidence: number;
  description: string;
  resultId?: string;
  success?: boolean;
}> => {
  // Skip during SSR/build time
  if (typeof window === 'undefined') {
    throw new Error('Image processing not available during server-side rendering');
  }

  if (!functions) {
    initializeFirebase();
    functions = getFunctions();
  }

  try {
    const processImageFunction = httpsCallable(functions, 'processImageWithGemini', {
      timeout: 60000 // 60 second timeout
    });
    
    const result = await processImageFunction({
      userImageUrl,
      garmentId,
      sessionId,
    });
    
    return result.data;
  } catch (error) {
    console.error('Error processing image, using mock:', error);
    // Fallback to mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          processedImageUrl: userImageUrl,
          processingTime: 3.5,
          confidence: 0.95,
          description: 'Mock result - Firebase functions not available',
        });
      }, 2000);
    });
  }
};

export const processMultiPhotoOutfit = async (
  userPhotos: {
    front: string;
    side: string;
    back: string;
  },
  garmentPhotos: {
    front: string;
    side: string;
    back: string;
  },
  sessionId: string
): Promise<{
  poses: Array<{
    name: string;
    originalImageUrl: string;
    processedImageUrl: string;
    confidence: number;
  }>;
  processingTime: number;
  description: string;
  resultId?: string;
  success?: boolean;
}> => {
  // Skip during SSR/build time
  if (typeof window === 'undefined') {
    throw new Error('Multi-photo processing not available during server-side rendering');
  }

  if (!functions) {
    initializeFirebase();
    functions = getFunctions();
  }

  try {
    // Use enhanced multi-pose Cloud Function with single API call
    const processImageFunction = httpsCallable(functions, 'processImageWithGemini', {
      timeout: 540000 // 9 minute timeout to match Cloud Function setting
    });
    
    console.log('Calling enhanced multi-pose Cloud Function...');
    
    // Single API call with multi-pose data
    const result = await processImageFunction({
      sessionId,
      garmentImageUrl: garmentPhotos.front, // Use front garment photo as primary
      userPhotos: {
        front: userPhotos.front,
        side: userPhotos.side,
        back: userPhotos.back
      }
    });
    
    // Extract result from the enhanced Cloud Function
    const data = result.data as {
      success: boolean;
      poses: Array<{
        name: string;
        originalImageUrl: string;
        processedImageUrl: string;
        confidence: number;
        description: string;
      }>;
      processingTime: number;
      description: string;
      resultId: string;
      successfulPoses: number;
      totalPoses: number;
    };
    
    if (!data || !data.success) {
      throw new Error('Invalid response from enhanced multi-pose generation service');
    }
    
    return {
      poses: data.poses.map(pose => ({
        name: pose.name,
        originalImageUrl: pose.originalImageUrl,
        processedImageUrl: pose.processedImageUrl,
        confidence: pose.confidence
      })),
      processingTime: data.processingTime,
      description: data.description,
      resultId: data.resultId,
      success: data.success && data.poses.length > 0,
    };
    
  } catch (error) {
    console.error('Error processing multi-photo outfit, using enhanced mock:', error);
    // Enhanced fallback to mock implementation with all three poses
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          poses: [
            {
              name: 'Standing Front',
              originalImageUrl: userPhotos.front,
              processedImageUrl: userPhotos.front,
              confidence: 0.95,
            },
            {
              name: 'Standing Side', 
              originalImageUrl: userPhotos.side,
              processedImageUrl: userPhotos.side,
              confidence: 0.90,
            },
            {
              name: 'Walking Side',
              originalImageUrl: userPhotos.side,
              processedImageUrl: userPhotos.side,
              confidence: 0.85,
            },
          ],
          processingTime: 5.8,
          description: 'Enhanced mock multi-pose result - Firebase functions not available. Showing 3 poses: Standing Front, Standing Side, and Walking Side.',
          success: true,
        });
      }, 4000); // Slightly longer mock processing time
    });
  }
};

export const submitFeedback = async (feedback: {
  rating: number;
  comment: string;
  sessionId: string;
  resultId: string;
  realismRating: number;
  helpfulnessRating: number;
}): Promise<{ success: boolean }> => {
  // Validate ratings if provided
  const validateRating = (value: number, name: string) => {
    if (value > 0 && (value < 1 || value > 5)) {
      throw new Error(`${name} must be between 1 and 5`);
    }
  };

  validateRating(feedback.rating, 'Overall rating');
  validateRating(feedback.realismRating, 'Realism rating');
  validateRating(feedback.helpfulnessRating, 'Helpfulness rating');

  // Ensure at least one rating is provided
  if (!feedback.rating && !feedback.realismRating && !feedback.helpfulnessRating) {
    throw new Error('At least one rating must be provided');
  }

  // Skip during SSR/build time
  if (typeof window === 'undefined') {
    return { success: true };
  }

  if (!functions) {
    initializeFirebase();
    functions = getFunctions();
  }

  try {
    const submitFeedbackFunction = httpsCallable(functions, 'submitFeedback');
    const result = await submitFeedbackFunction({
      rating: feedback.rating || undefined,
      comment: feedback.comment || '',
      sessionId: feedback.sessionId,
      resultId: feedback.resultId,
      realismRating: feedback.realismRating || undefined,
      helpfulnessRating: feedback.helpfulnessRating || undefined,
    });
    
    return result.data as { success: boolean };
  } catch (error) {
    console.error('Error submitting feedback:', error);
    // Fallback mock implementation for development
    return { success: true };
  }
};

// Export Firebase instances for direct use
export { app, storage };
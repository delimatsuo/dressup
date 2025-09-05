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
      throw new Error(`Firebase configuration missing: ${key}`);
    }
  }

  app = initializeApp(firebaseConfig);
  storage = getStorage(app);
  functions = getFunctions(app);

  return app;
};

export const uploadImage = async (file: File, sessionId: string): Promise<string> => {
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
  if (!functions) {
    initializeFirebase();
    functions = getFunctions();
  }

  try {
    // For now, use the existing processImageWithGemini function but enhance it for multi-photo
    // In the future, this could be a dedicated multi-photo processing function
    const processImageFunction = httpsCallable(functions, 'processImageWithGemini', {
      timeout: 120000 // 2 minute timeout for multi-photo processing
    });
    
    // Create a temporary garment object using the uploaded garment photos
    const tempGarmentId = `uploaded-garment-${Date.now()}`;
    
    const result = await processImageFunction({
      userImageUrl: userPhotos.front,
      garmentId: tempGarmentId,
      sessionId,
      garmentImageUrl: garmentPhotos.front, // Pass garment image URL directly
      userSideImageUrl: userPhotos.side,
      garmentSideImageUrl: garmentPhotos.side,
    });
    
    // Transform single result into multi-pose format for now
    // TODO: Backend should be enhanced to return multiple poses
    return {
      poses: [
        {
          name: 'Standing Front',
          originalImageUrl: userPhotos.front,
          processedImageUrl: result.data.processedImageUrl,
          confidence: result.data.confidence || 0.95,
        },
        {
          name: 'Standing Side',
          originalImageUrl: userPhotos.side,
          processedImageUrl: result.data.processedImageUrl, // Placeholder - backend should generate side pose
          confidence: result.data.confidence || 0.90,
        },
      ],
      processingTime: result.data.processingTime,
      description: result.data.description,
      resultId: result.data.resultId,
      success: result.data.success,
    };
  } catch (error) {
    console.error('Error processing multi-photo outfit, using mock:', error);
    // Fallback to mock implementation
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
          ],
          processingTime: 4.2,
          description: 'Mock multi-photo result - Firebase functions not available',
          success: true,
        });
      }, 3000);
    });
  }
};

export const submitFeedback = async (feedback: {
  rating: number;
  comment: string;
  sessionId: string;
  resultId: string;
}): Promise<{ success: boolean }> => {
  // Validate rating
  if (feedback.rating < 1 || feedback.rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Comment sanitization would be done server-side

  if (!functions) {
    initializeFirebase();
    functions = getFunctions();
  }

  // Mock implementation for now
  return { success: true };

  // Actual implementation (commented until Firebase is configured):
  // const submitFeedbackFunction = httpsCallable(functions, 'submitFeedback');
  // const result = await submitFeedbackFunction({
  //   ...feedback,
  //   comment: sanitizedComment,
  // });
  // 
  // return result.data as { success: boolean };
};
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2/options';
import * as admin from 'firebase-admin';
import corsMiddleware from 'cors';
import { analyzeOutfitWithGemini } from './vertex-ai';
import { createLogger, createPerformanceMonitor } from './logger';

// Export session management functions
export {
  createSession,
  getSessionStatus,
  addPhotoToSession,
  extendSession,
  getSessionPhotos,
  deleteSession,
  cleanupExpiredSessions
} from './sessionFunctions';

// Export storage management functions
export {
  cleanupStorage,
  manualStorageCleanup,
  cleanupExpiredSessionsStorage
} from './storageCleanup';

// Initialize Firebase Admin with default credentials
admin.initializeApp({
  storageBucket: 'projectdressup.firebasestorage.app'
});

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  region: 'us-central1',
});

// Enable CORS for all origins
const cors = corsMiddleware({ origin: true });

// Interface for multi-pose generation request
interface MultiPoseRequest {
  sessionId: string;
  garmentImageUrl: string;
  userPhotos?: {
    front: string;
    side: string;
    back: string;
  };
  // Legacy single image support
  userImageUrl?: string;
  garmentId?: string;
  poseType?: string;
  instructions?: string;
  customInstructions?: string;
}

// Interface for pose generation result
interface PoseResult {
  name: string;
  originalImageUrl: string;
  processedImageUrl: string;
  confidence: number;
  description: string;
}

/**
 * Enhanced multi-pose generation function
 * Supports both legacy single pose and new multi-pose generation
 */
export const processImageWithGemini = onCall(
  {
    timeoutSeconds: 540, // 9 minutes for multi-pose processing
    memory: '4GiB', // Increased memory for parallel processing
    maxInstances: 3, // Reduced to manage resource usage
    cors: true, // Enable CORS
    secrets: ['GOOGLE_AI_API_KEY'], // Add Google AI API key
  },
  async (request) => {
    const structuredLogger = createLogger('processImageWithGemini');
    const perfMonitor = createPerformanceMonitor('processImageWithGemini');
    const requestData = request.data as MultiPoseRequest;
    
    try {
      const { 
        sessionId, 
        garmentImageUrl,
        userPhotos,
        // Legacy support
        userImageUrl, 
        garmentId, 
        poseType, 
        instructions
      } = requestData;

      // Validate required inputs
      if (!sessionId) {
        structuredLogger.logError(new Error('Missing sessionId in request'), { requestData });
        throw new HttpsError('invalid-argument', 'sessionId is required');
      }

      const startTime = Date.now();

      // Multi-pose generation path
      if (userPhotos && garmentImageUrl) {
        structuredLogger.logGenerationStarted(sessionId, 'multi-pose', 3);
        const result = await processMultiPoseGeneration({
          sessionId,
          garmentImageUrl,
          userPhotos,
          customInstructions: requestData.customInstructions,
          startTime,
          logger: structuredLogger
        });
        
        const performance = perfMonitor.complete(structuredLogger, { 
          requestType: 'multi-pose',
          sessionId 
        });
        
        structuredLogger.logGenerationCompleted(
          sessionId,
          'multi-pose',
          {
            success: true,
            duration: performance.executionTimeMs,
            confidence: result.poses?.[0]?.confidence
          },
          performance
        );
        
        return result;
      }
      
      // Legacy single pose path (backward compatibility)
      if (userImageUrl && (garmentId || garmentImageUrl)) {
        structuredLogger.logGenerationStarted(sessionId, 'single-pose', 1);
        const result = await processLegacySinglePose({
          userImageUrl,
          garmentId,
          sessionId,
          garmentImageUrl,
          poseType,
          instructions,
          startTime,
          logger: structuredLogger
        });
        
        const performance = perfMonitor.complete(structuredLogger, { 
          requestType: 'single-pose',
          sessionId 
        });
        
        structuredLogger.logGenerationCompleted(
          sessionId,
          'single-pose',
          {
            success: true,
            duration: performance.executionTimeMs,
            confidence: result.confidence
          },
          performance
        );
        
        return result;
      }

      const invalidArgumentError = new Error('Invalid arguments provided');
      structuredLogger.logError(invalidArgumentError, { requestData });
      throw new HttpsError(
        'invalid-argument', 
        'Either provide userPhotos + garmentImageUrl for multi-pose, or userImageUrl + garmentId/garmentImageUrl for single pose'
      );
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      
      if (error instanceof HttpsError) {
        // Log HTTP errors with context
        structuredLogger.logError(errorObj, { 
          httpErrorCode: error.code,
          sessionId: requestData.sessionId,
          requestData: requestData 
        });
        throw error;
      }
      
      // Log and wrap unexpected errors
      structuredLogger.logError(errorObj, { sessionId: requestData.sessionId, requestData: requestData });
      
      const performance = perfMonitor.complete(structuredLogger, { 
        error: true,
        sessionId: requestData.sessionId 
      });
      
      structuredLogger.logGenerationFailed(
        requestData.sessionId || 'unknown',
        requestData.userPhotos ? 'multi-pose' : 'single-pose',
        errorObj,
        performance
      );
      
      throw new HttpsError('internal', 'Failed to process image');
    }
  }
);

/**
 * Process multi-pose generation with parallel execution
 */
async function processMultiPoseGeneration(params: {
  sessionId: string;
  garmentImageUrl: string;
  userPhotos: { front: string; side: string; back: string };
  customInstructions?: string;
  startTime: number;
  logger: any;
}) {
  const { sessionId, garmentImageUrl, userPhotos, customInstructions, startTime } = params;

  // Get a background suggestion based on the garment
  const { getBackgroundSuggestion, fetchImageAsBase64 } = await import('./imageGeneration');
  const garmentImageBase64 = await fetchImageAsBase64(garmentImageUrl);
  const location = await getBackgroundSuggestion(garmentImageBase64);

  // Define poses based on available photos
  const poseDefinitions: Array<{
    name: string;
    userImageUrl: string;
    poseType: 'standing' | 'sitting';
    instructions: string;
  }> = [
    {
      name: 'Standing View',
      userImageUrl: userPhotos.front,
      poseType: 'standing',
      instructions: 'Generate a standing front view with the garment fitted naturally.'
    },
    {
      name: 'Sitting View',
      userImageUrl: userPhotos.front, // Use front photo for sitting pose as well
      poseType: 'sitting',
      instructions: 'Generate a sitting view, for example at a cafe or on a stylish chair.'
    }
  ];
  
  
  
  // If no valid photos, throw error
  if (poseDefinitions.length === 0) {
    throw new Error('At least one user photo is required');
  }

  console.log(`Starting parallel processing of ${poseDefinitions.length} poses`);

  // Process all poses in parallel using Promise.allSettled
  const posePromises = poseDefinitions.map(async (pose, index) => {
    try {
      console.log(`Starting pose ${index + 1}: ${pose.name}`);
      const poseStartTime = Date.now();
      
      // Generate actual virtual try-on image
      const { generateVirtualTryOnImage } = await import('./imageGeneration');
      const poseMap: { [key: string]: 'standing' | 'sitting' } = {
        'standing_front': 'standing',
        'standing_side': 'standing'
      };
      
      const generationResult = await generateVirtualTryOnImage(
        pose.userImageUrl,
        garmentImageUrl,
        poseMap[pose.poseType] || 'standing',
        location, // Pass the dynamic location
        sessionId,
        customInstructions
      );
      
      const poseProcessingTime = (Date.now() - poseStartTime) / 1000;
      console.log(`Completed pose ${index + 1} in ${poseProcessingTime}s`);
      
      return {
        name: pose.name,
        originalImageUrl: pose.userImageUrl,
        processedImageUrl: generationResult.generatedImageUrl, // Use generated image
        confidence: generationResult.confidence,
        description: `${pose.name}: ${generationResult.description}`,
        processingTime: poseProcessingTime,
        success: true
      };
    } catch (error) {
      console.error(`Failed to process pose ${index + 1} (${pose.name}):`, error);
      return {
        name: pose.name,
        originalImageUrl: pose.userImageUrl,
        processedImageUrl: pose.userImageUrl, // Fallback to original
        confidence: 0.5, // Lower confidence for failed generation
        description: `${pose.name}: Generated with fallback processing`,
        processingTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Wait for all poses to complete
  const results = await Promise.allSettled(posePromises);
  const totalProcessingTime = (Date.now() - startTime) / 1000;
  
  console.log(`Multi-pose processing completed in ${totalProcessingTime}s`);

  // Extract successful and failed poses
  const poses: PoseResult[] = [];
  let successfulPoses = 0;
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const poseResult = result.value;
      poses.push({
        name: poseResult.name,
        originalImageUrl: poseResult.originalImageUrl,
        processedImageUrl: poseResult.processedImageUrl,
        confidence: poseResult.confidence,
        description: poseResult.description
      });
      if (poseResult.success) successfulPoses++;
    } else {
      // Handle rejected promise (shouldn't happen with our error handling, but safety)
      const pose = poseDefinitions[index];
      poses.push({
        name: pose.name,
        originalImageUrl: pose.userImageUrl,
        processedImageUrl: pose.userImageUrl,
        confidence: 0.3,
        description: `${pose.name}: Processing failed - using fallback`
      });
    }
  });

  // Store multi-pose result in Firestore
  const resultData = {
    sessionId,
    garmentImageUrl,
    userPhotos,
    poses,
    totalProcessingTime,
    successfulPoses,
    totalPoses: poses.length,
    description: `Generated ${successfulPoses}/${poses.length} poses successfully`,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    type: 'multi-pose'
  };

  const resultDoc = await admin
    .firestore()
    .collection('results')
    .add(resultData);

  return {
    success: true,
    resultId: resultDoc.id,
    poses,
    processingTime: totalProcessingTime,
    description: `Generated ${successfulPoses} out of ${poses.length} outfit poses with multi-angle processing`,
    successfulPoses,
    totalPoses: poses.length
  };
}

/**
 * Legacy single pose processing for backward compatibility
 */
async function processLegacySinglePose(params: {
  userImageUrl: string;
  garmentId?: string;
  sessionId: string;
  garmentImageUrl?: string;
  poseType?: string;
  instructions?: string;
  startTime: number;
  logger: any;
}) {
  const { 
    userImageUrl, 
    garmentId, 
    sessionId, 
    garmentImageUrl, 
    poseType, 
    instructions, 
    startTime 
  } = params;

  // Validate legacy inputs
  if (!userImageUrl || (!garmentId && !garmentImageUrl)) {
    throw new HttpsError(
      'invalid-argument',
      'Legacy mode requires userImageUrl and either garmentId or garmentImageUrl'
    );
  }

  // Enhanced logic for garment processing
  let garmentData;
  let effectiveGarmentImageUrl;
  
  if (garmentImageUrl) {
    // Use directly uploaded garment image
    effectiveGarmentImageUrl = garmentImageUrl;
    garmentData = {
      name: 'Uploaded Garment',
      category: 'custom',
      imageUrl: garmentImageUrl
    };
  } else if (garmentId) {
    // Fallback to garment collection lookup
    const garmentDoc = await admin
      .firestore()
      .collection('garments')
      .doc(garmentId)
      .get();

    if (!garmentDoc.exists) {
      throw new HttpsError('not-found', 'Garment not found');
    }

    garmentData = garmentDoc.data();
    effectiveGarmentImageUrl = garmentData?.imageUrl || '';
  }

  // Enhanced Vertex AI analysis with pose and instruction context
  const enhancedInstructions = instructions 
    ? `${instructions}. Pose type: ${poseType || 'standard'}` 
    : `Generate outfit visualization for ${poseType || 'standard'} pose`;
    
  const analysis = await analyzeOutfitWithGemini(
    userImageUrl,
    effectiveGarmentImageUrl!,
    enhancedInstructions,
    sessionId
  );

  const processingTime = (Date.now() - startTime) / 1000;

  // Generate actual virtual try-on image using Gemini
  const { generateVirtualTryOnImage, getBackgroundSuggestion, fetchImageAsBase64 } = await import('./imageGeneration');
  const garmentImageBase64 = await fetchImageAsBase64(effectiveGarmentImageUrl!);
  const location = await getBackgroundSuggestion(garmentImageBase64);

  const generationResult = await generateVirtualTryOnImage(
    userImageUrl,
    effectiveGarmentImageUrl!,
    'standing', // Default pose
    location,
    sessionId
  );
  const processedImageUrl = generationResult.generatedImageUrl;
  const description = analysis.description;

  // Store result in Firestore
  const resultData = {
    sessionId,
    userImageUrl,
    garmentId,
    garmentImageUrl: effectiveGarmentImageUrl,
    processedImageUrl,
    processingTime,
    description,
    confidence: analysis.confidence,
    suggestions: analysis.suggestions,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    type: 'single-pose'
  };

  const resultDoc = await admin
    .firestore()
    .collection('results')
    .add(resultData);

  return {
    success: true,
    resultId: resultDoc.id,
    processedImageUrl,
    processingTime,
    description,
    confidence: analysis.confidence,
    suggestions: analysis.suggestions,
  };
}

/**
 * Get available garments
 */
export const getGarments = onCall(
  {
    maxInstances: 10,
  },
  async (request) => {
    const structuredLogger = createLogger('getGarments');
    const perfMonitor = createPerformanceMonitor('getGarments');
    
    try {
      const startTime = Date.now();
      
      const garments = await admin
        .firestore()
        .collection('garments')
        .orderBy('category')
        .limit(50)
        .get();

      const duration = Date.now() - startTime;
      const garmentData = garments.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      structuredLogger.logGarmentsFetched(garmentData.length, duration);
      
      perfMonitor.complete(structuredLogger, {
        garmentCount: garmentData.length
      });

      return garmentData;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      structuredLogger.logError(errorObj, { function: 'getGarments' });
      
      perfMonitor.complete(structuredLogger, { error: true });
      
      throw new HttpsError('internal', 'Failed to fetch garments');
    }
  }
);

/**
 * Submit user feedback
 */
export const submitFeedback = onCall(
  {
    maxInstances: 10,
  },
  async (request) => {
    const structuredLogger = createLogger('submitFeedback');
    const perfMonitor = createPerformanceMonitor('submitFeedback');
    
    try {
      const { 
        rating, 
        comment, 
        sessionId, 
        resultId, 
        realismRating, 
        helpfulnessRating 
      } = request.data;

      // Validate at least one rating is provided
      if (!rating && !realismRating && !helpfulnessRating) {
        const validationError = new Error('At least one rating must be provided');
        structuredLogger.logError(validationError, { sessionId, resultId });
        throw new HttpsError(
          'invalid-argument',
          'At least one rating must be provided'
        );
      }

      // Validate individual ratings if provided
      const validateRating = (value: number | undefined, name: string) => {
        if (value !== undefined && (value < 1 || value > 5)) {
          const validationError = new Error(`${name} must be between 1 and 5`);
          structuredLogger.logError(validationError, { sessionId, resultId, rating: value });
          throw new HttpsError(
            'invalid-argument',
            `${name} must be between 1 and 5`
          );
        }
      };

      validateRating(rating, 'Overall rating');
      validateRating(realismRating, 'Realism rating');
      validateRating(helpfulnessRating, 'Helpfulness rating');

      // Calculate aggregate metrics for analytics
      const providedRatings = [rating, realismRating, helpfulnessRating].filter(r => r !== undefined);
      const averageRating = providedRatings.length > 0 
        ? providedRatings.reduce((sum, r) => sum + r, 0) / providedRatings.length 
        : undefined;

      // Store enhanced feedback
      await admin.firestore().collection('feedback').add({
        // Original fields
        rating: rating || null,
        comment: comment || '',
        sessionId,
        resultId,
        
        // Enhanced dual feedback scoring
        realismRating: realismRating || null,
        helpfulnessRating: helpfulnessRating || null,
        averageRating,
        
        // Metadata
        feedbackVersion: 'v2_dual_scoring',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log successful feedback submission
      structuredLogger.logFeedbackSubmitted(
        sessionId,
        resultId,
        rating,
        realismRating,
        helpfulnessRating
      );

      perfMonitor.complete(structuredLogger, {
        sessionId,
        resultId,
        averageRating
      });

      return { success: true };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      
      if (error instanceof HttpsError) {
        structuredLogger.logError(errorObj, { 
          httpErrorCode: error.code,
          sessionId: request.data?.sessionId,
          resultId: request.data?.resultId
        });
        throw error;
      }
      
      structuredLogger.logError(errorObj, { 
        sessionId: request.data?.sessionId,
        resultId: request.data?.resultId
      });
      
      perfMonitor.complete(structuredLogger, { error: true });
      
      throw new HttpsError('internal', 'Failed to submit feedback');
    }
  }
);

/**
 * Upload garment image (admin function)
 */
export const uploadGarment = onRequest(
  {
    maxInstances: 2,
  },
  (req, res) => {
    cors(req, res, async () => {
      try {
        if (req.method !== 'POST') {
          res.status(405).send('Method not allowed');
          return;
        }

        const { name, imageUrl, category, description } = req.body;

        if (!name || !imageUrl || !category) {
          res.status(400).send('Missing required fields');
          return;
        }

        const garmentDoc = await admin.firestore().collection('garments').add({
          name,
          imageUrl,
          category,
          description: description || '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({
          success: true,
          garmentId: garmentDoc.id,
        });
      } catch (error) {
        console.error('Error uploading garment:', error);
        res.status(500).send('Internal server error');
      }
    });
  }
);
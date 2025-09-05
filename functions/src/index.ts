import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2/options';
import * as admin from 'firebase-admin';
import corsMiddleware from 'cors';
import { analyzeOutfitWithGemini } from './vertex-ai';

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

// Initialize Firebase Admin with service account
const serviceAccount = require('../serviceAccount.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'project-friday-471118.appspot.com'
});

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  region: 'us-central1',
});

// Enable CORS for all origins
const cors = corsMiddleware({ origin: true });

/**
 * Process an image with Gemini to apply virtual outfit
 */
export const processImageWithGemini = onCall(
  {
    timeoutSeconds: 300,
    memory: '2GiB',
    maxInstances: 5,
  },
  async (request) => {
    try {
      const { 
        userImageUrl, 
        garmentId, 
        sessionId, 
        garmentImageUrl, 
        poseType, 
        instructions
      } = request.data;

      // Validate inputs
      if (!userImageUrl || !garmentId || !sessionId) {
        throw new HttpsError(
          'invalid-argument',
          'Missing required parameters'
        );
      }

      const startTime = Date.now();

      // Enhanced logic for multi-pose processing
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
      } else {
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
        effectiveGarmentImageUrl,
        enhancedInstructions
      );

      const processingTime = (Date.now() - startTime) / 1000;

      // For now, we'll use the original image URL as processed
      // In production, you'd use an image generation service
      const processedImageUrl = userImageUrl;
      const description = analysis.description;

      // Store result in Firestore
      const resultData = {
        sessionId,
        userImageUrl,
        garmentId,
        processedImageUrl,
        processingTime,
        description,
        confidence: analysis.confidence,
        suggestions: analysis.suggestions,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
    } catch (error) {
      console.error('Error processing image:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        'internal',
        'Failed to process image'
      );
    }
  }
);

/**
 * Get available garments
 */
export const getGarments = onCall(
  {
    maxInstances: 10,
  },
  async (request) => {
    try {
      const garments = await admin
        .firestore()
        .collection('garments')
        .orderBy('category')
        .limit(50)
        .get();

      return garments.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error fetching garments:', error);
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
    try {
      const { rating, comment, sessionId, resultId } = request.data;

      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        throw new HttpsError(
          'invalid-argument',
          'Rating must be between 1 and 5'
        );
      }

      // Store feedback
      await admin.firestore().collection('feedback').add({
        rating,
        comment: comment || '',
        sessionId,
        resultId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error submitting feedback:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
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
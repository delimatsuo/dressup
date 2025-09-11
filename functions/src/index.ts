import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { createSession, validateSession, extendSession, cleanupExpiredSessions, deleteUserSession } from './sessionFunctions';
import { generateVirtualTryOnImage, generateMultiplePoses } from './imageGeneration';
import { checkRateLimit } from './rateLimiter';
import { cleanupOldFiles } from './storageCleanup';
// Vertex AI dependency removed - using Gemini API directly
// import { analyzeOutfitWithGemini, testGeminiIntegration } from './vertex-ai';
import cors from 'cors';

// Initialize Firebase Admin
admin.initializeApp();

// Enable CORS for all origins
const corsHandler = cors({ 
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
});

// Session management functions
export const createUserSession = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      
      const result = await createSession();
      res.status(200).json(result);
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });
});

export const validateUserSession = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      
      const { sessionId } = req.body;
      if (!sessionId) {
        res.status(400).json({ error: 'Session ID required' });
        return;
      }
      
      const result = await validateSession(sessionId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error validating session:', error);
      res.status(500).json({ error: 'Failed to validate session' });
    }
  });
});

export const extendUserSession = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      
      const { sessionId } = req.body;
      if (!sessionId) {
        res.status(400).json({ error: 'Session ID required' });
        return;
      }
      
      const result = await extendSession(sessionId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error extending session:', error);
      res.status(500).json({ error: 'Failed to extend session' });
    }
  });
});

export const deleteSession = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      
      const { sessionId } = req.body;
      if (!sessionId) {
        res.status(400).json({ error: 'Session ID required' });
        return;
      }
      
      const result = await deleteUserSession(sessionId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({ error: 'Failed to delete session' });
    }
  });
});

// Image generation functions
export const generateTryOn = onRequest({
  timeoutSeconds: 540,
  memory: '2GiB',
  secrets: ['GOOGLE_AI_API_KEY_SERVER', 'GOOGLE_AI_API_KEY'] // Use server key first, fallback to original
}, (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method !== 'POST') {
          res.status(405).json({ error: 'Method not allowed' });
          return;
        }
        
        const { userImageUrl, garmentImageUrl, poseType, location, sessionId, customInstructions } = req.body;
        
        // Rate limiting check
        const identifier = sessionId || req.ip || 'anonymous';
        const { allowed, remaining } = await checkRateLimit(identifier, false);
        
        if (!allowed) {
          res.status(429).json({
            error: 'Too many requests. Please try again in a minute.',
            retryAfter: 60
          });
          return;
        }
        
        // Add rate limit headers
        res.set('X-RateLimit-Remaining', remaining.toString());
        res.set('X-RateLimit-Limit', '10');
        
        if (!userImageUrl || !garmentImageUrl) {
          res.status(400).json({ error: 'User image and garment image URLs are required' });
          return;
        }
        
        const result = await generateVirtualTryOnImage(
          userImageUrl,
          garmentImageUrl,
          poseType || 'standing',
          location || '',
          sessionId || `temp-${Date.now()}`,
          customInstructions
        );
        
        res.status(200).json(result);
      } catch (error) {
        console.error('Error generating try-on:', error);
        res.status(500).json({ 
          error: 'Failed to generate try-on', 
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  });

export const generateMultipleTryOnPoses = onRequest({
  timeoutSeconds: 540,
  memory: '2GiB',
  secrets: ['GOOGLE_AI_API_KEY']
}, (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method !== 'POST') {
          res.status(405).json({ error: 'Method not allowed' });
          return;
        }
        
        const { userPhotos, garmentPhotos, sessionId } = req.body;
        
        if (!userPhotos?.front || !garmentPhotos?.front) {
          res.status(400).json({ error: 'User and garment front photos are required' });
          return;
        }
        
        const result = await generateMultiplePoses(
          userPhotos,
          garmentPhotos,
          sessionId || `temp-${Date.now()}`
        );
        
        res.status(200).json({ results: result });
      } catch (error) {
        console.error('Error generating multiple poses:', error);
        res.status(500).json({ 
          error: 'Failed to generate multiple poses', 
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  });

// Outfit analysis function (using Vertex AI) - DISABLED
// export const analyzeOutfit = onRequest({
//   timeoutSeconds: 540,
//   memory: '2GiB'
// }, (req, res) => {
//     corsHandler(req, res, async () => {
//       try {
//         if (req.method !== 'POST') {
//           res.status(405).json({ error: 'Method not allowed' });
//           return;
//         }
//         
//         const { userImageUrl, garmentImageUrl, additionalInstructions, sessionId } = req.body;
//         
//         if (!userImageUrl || !garmentImageUrl) {
//           res.status(400).json({ error: 'User image and garment image URLs are required' });
//           return;
//         }
//         
//         const result = await analyzeOutfitWithGemini(
//           userImageUrl,
//           garmentImageUrl,
//           additionalInstructions,
//           sessionId
//         );
//         
//         res.status(200).json(result);
//       } catch (error) {
//         console.error('Error analyzing outfit:', error);
//         res.status(500).json({ 
//           error: 'Failed to analyze outfit', 
//           details: error instanceof Error ? error.message : 'Unknown error'
//         });
//       }
//     });
//   });

// Test Gemini integration - DISABLED
// export const testGemini = onRequest((req, res) => {
//   corsHandler(req, res, async () => {
//     try {
//       const result = await testGeminiIntegration();
//       res.status(200).json(result);
//     } catch (error) {
//       console.error('Error testing Gemini:', error);
//       res.status(500).json({ 
//         error: 'Failed to test Gemini integration', 
//         details: error instanceof Error ? error.message : 'Unknown error'
//       });
//     }
//   });
// });

// Scheduled cleanup functions
export const scheduledCleanup = onSchedule('every 6 hours', async () => {
    console.log('Running scheduled cleanup...');
    
    try {
      const sessionsResult = await cleanupExpiredSessions();
      console.log(`Cleaned up ${sessionsResult.deletedCount} expired sessions`);
      
      const storageResult = await cleanupOldFiles();
      console.log(`Cleaned up storage: ${JSON.stringify(storageResult)}`);
      
    } catch (error) {
      console.error('Error during scheduled cleanup:', error);
      throw error;
    }
  });

// Manual cleanup trigger
export const manualCleanup = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const sessionsResult = await cleanupExpiredSessions();
      const storageResult = await cleanupOldFiles();
      
      res.status(200).json({
        message: 'Cleanup completed',
        sessions: sessionsResult,
        storage: storageResult
      });
    } catch (error) {
      console.error('Error during manual cleanup:', error);
      res.status(500).json({ 
        error: 'Cleanup failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
});
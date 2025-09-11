import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';

/**
 * Scheduled function to clean up generated images after their retention period
 * Runs every hour to check for images scheduled for deletion
 */
export const processScheduledCleanups = onSchedule(
  {
    schedule: '0 * * * *', // Run every hour
    timeZone: 'America/Los_Angeles',
    maxInstances: 1,
    retryCount: 3
  },
  async (event) => {
    console.log('Starting scheduled cleanup process');
    
    try {
      const now = new Date();
      const bucket = getStorage().bucket();
      
      // Find all cleanups scheduled for now or earlier
      const cleanupQuery = await admin.firestore()
        .collection('scheduledCleanups')
        .where('status', '==', 'pending')
        .where('scheduledFor', '<=', now)
        .limit(50) // Process in batches
        .get();
      
      if (cleanupQuery.empty) {
        console.log('No scheduled cleanups to process');
        return;
      }
      
      console.log(`Processing ${cleanupQuery.size} scheduled cleanups`);
      
      const cleanupPromises = cleanupQuery.docs.map(async (doc) => {
        const cleanupData = doc.data();
        
        try {
          // Delete generated images
          const deletePromises = (cleanupData.generatedImageUrls || []).map(async (url: string) => {
            try {
              // Extract file path from URL
              if (url.includes('generated/')) {
                const matches = url.match(/generated%2F([^?]+)/);
                if (matches && matches[1]) {
                  const filePath = `generated/${decodeURIComponent(matches[1])}`;
                  const file = bucket.file(filePath);
                  const [exists] = await file.exists();
                  
                  if (exists) {
                    await file.delete();
                    console.log(`Deleted generated image: ${filePath}`);
                  }
                }
              }
            } catch (error) {
              console.error(`Failed to delete generated image ${url}:`, error);
            }
          });
          
          await Promise.all(deletePromises);
          
          // Mark cleanup as completed
          await doc.ref.update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`Completed cleanup for session ${cleanupData.sessionId}`);
        } catch (error) {
          console.error(`Failed to process cleanup ${doc.id}:`, error);
          
          // Mark as failed after too many attempts
          const attempts = cleanupData.attempts || 0;
          if (attempts >= 3) {
            await doc.ref.update({
              status: 'failed',
              failedAt: admin.firestore.FieldValue.serverTimestamp(),
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          } else {
            await doc.ref.update({
              attempts: attempts + 1,
              lastAttempt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      });
      
      await Promise.all(cleanupPromises);
      
      console.log('Scheduled cleanup process completed');
    } catch (error) {
      console.error('Error in scheduled cleanup process:', error);
      throw error;
    }
  }
);
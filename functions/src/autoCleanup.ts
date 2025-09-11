import { getStorage } from 'firebase-admin/storage';
import * as admin from 'firebase-admin';

/**
 * Automatically delete user-uploaded images after processing
 * This ensures privacy by removing personal photos immediately after use
 */
export async function cleanupUserImages(
  sessionId: string,
  userImageUrls: string | { front?: string; side?: string; back?: string },
  keepGeneratedImages: boolean = true
): Promise<void> {
  try {
    console.log(`Starting automatic cleanup for session ${sessionId}`);
    const bucket = getStorage().bucket();
    
    // Convert single URL to array for uniform processing
    const urlsToDelete: string[] = [];
    
    if (typeof userImageUrls === 'string') {
      urlsToDelete.push(userImageUrls);
    } else {
      if (userImageUrls.front) urlsToDelete.push(userImageUrls.front);
      if (userImageUrls.side) urlsToDelete.push(userImageUrls.side);
      if (userImageUrls.back) urlsToDelete.push(userImageUrls.back);
    }
    
    // Delete each user photo from storage
    const deletePromises = urlsToDelete.map(async (url) => {
      try {
        // Extract file path from Firebase Storage URL
        if (url.includes('firebasestorage')) {
          const matches = url.match(/uploads%2F([^?]+)/);
          if (matches && matches[1]) {
            const filePath = `uploads/${decodeURIComponent(matches[1])}`;
            console.log(`Deleting user photo: ${filePath}`);
            
            const file = bucket.file(filePath);
            const [exists] = await file.exists();
            
            if (exists) {
              await file.delete();
              console.log(`Successfully deleted: ${filePath}`);
            }
          }
        }
      } catch (error) {
        console.error(`Failed to delete image ${url}:`, error);
        // Continue with other deletions even if one fails
      }
    });
    
    await Promise.all(deletePromises);
    
    // Mark session as cleaned up in Firestore
    await admin.firestore()
      .collection('sessions')
      .doc(sessionId)
      .set({
        cleanedUp: true,
        cleanupTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        generatedImagesKept: keepGeneratedImages
      }, { merge: true });
    
    console.log(`Cleanup completed for session ${sessionId}`);
  } catch (error) {
    console.error('Error during automatic cleanup:', error);
    // Don't throw - cleanup failures shouldn't break the main flow
  }
}

/**
 * Schedule delayed cleanup for generated images (after user downloads)
 * This gives users time to save their results
 */
export async function scheduleGeneratedImageCleanup(
  sessionId: string,
  generatedImageUrls: string[],
  delayMinutes: number = 60
): Promise<void> {
  try {
    const cleanupTime = new Date(Date.now() + delayMinutes * 60 * 1000);
    
    await admin.firestore()
      .collection('scheduledCleanups')
      .add({
        sessionId,
        generatedImageUrls,
        scheduledFor: cleanupTime,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    console.log(`Scheduled cleanup for ${generatedImageUrls.length} generated images in ${delayMinutes} minutes`);
  } catch (error) {
    console.error('Error scheduling cleanup:', error);
  }
}
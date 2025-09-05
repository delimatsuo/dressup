import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

/**
 * Scheduled function to clean up old files from Firebase Storage
 * Runs daily at 2 AM UTC
 */
export const cleanupStorage = onSchedule(
  {
    schedule: '0 2 * * *', // Daily at 2 AM UTC
    timeZone: 'UTC',
  },
  async (event) => {
    const bucket = admin.storage().bucket();
    const now = Date.now();
    
    let totalDeleted = 0;
    let totalErrors = 0;

    logger.info('Starting storage cleanup process...');

    try {
      // Cleanup rules configuration
      const cleanupRules = [
        {
          prefix: 'uploads/',
          maxAgeMs: 30 * 24 * 60 * 60 * 1000, // 30 days
          description: 'User uploaded images'
        },
        {
          prefix: 'temp/',
          maxAgeMs: 1 * 24 * 60 * 60 * 1000, // 1 day
          description: 'Temporary processing files'
        },
        {
          prefix: 'cache/',
          maxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days  
          description: 'Cached processed images'
        },
        {
          prefix: 'results/',
          maxAgeMs: 365 * 24 * 60 * 60 * 1000, // 1 year
          description: 'Processing results'
        }
      ];

      for (const rule of cleanupRules) {
        logger.info(`Processing cleanup rule for: ${rule.description}`);
        
        const [files] = await bucket.getFiles({
          prefix: rule.prefix,
        });

        let ruleDeleted = 0;
        let ruleErrors = 0;

        for (const file of files) {
          try {
            const [metadata] = await file.getMetadata();
            const creationTime = new Date(metadata.timeCreated || Date.now()).getTime();
            const age = now - creationTime;

            if (age > rule.maxAgeMs) {
              await file.delete();
              ruleDeleted++;
              logger.info(`Deleted expired file: ${file.name}`);
            }
          } catch (error) {
            ruleErrors++;
            logger.error(`Error processing file ${file.name}:`, error);
          }
        }

        totalDeleted += ruleDeleted;
        totalErrors += ruleErrors;
        
        logger.info(`${rule.description}: Deleted ${ruleDeleted} files, ${ruleErrors} errors`);
      }

      logger.info(`Storage cleanup completed. Total deleted: ${totalDeleted}, Total errors: ${totalErrors}`);

    } catch (error) {
      logger.error('Storage cleanup failed:', error);
      throw error;
    }
  }
);

/**
 * Manual cleanup function placeholder
 * For testing and emergency cleanup
 */
export const manualStorageCleanup = onSchedule(
  {
    schedule: 'every 24 hours',
    timeZone: 'UTC',
  },
  async (event) => {
    logger.info('Manual storage cleanup triggered');
    // Manual cleanup logic would go here
    // For now, this is just a placeholder
  }
);

/**
 * Clean up expired sessions and associated files
 * Runs every 6 hours
 */
export const cleanupExpiredSessionsStorage = onSchedule(
  {
    schedule: '0 */6 * * *', // Every 6 hours
    timeZone: 'UTC',
  },
  async (event) => {
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    const now = Date.now();
    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours

    logger.info('Starting expired session cleanup...');

    try {
      // Query old sessions
      const sessionsSnapshot = await db.collection('sessions')
        .where('createdAt', '<', new Date(now - maxSessionAge))
        .limit(100) // Process in batches
        .get();

      let deletedSessions = 0;
      let deletedFiles = 0;

      for (const sessionDoc of sessionsSnapshot.docs) {
        const sessionId = sessionDoc.id;
        
        try {
          // Delete associated storage files
          const [files] = await bucket.getFiles({
            prefix: `uploads/${sessionId}/`,
          });

          for (const file of files) {
            await file.delete();
            deletedFiles++;
          }

          // Delete session document
          await sessionDoc.ref.delete();
          deletedSessions++;

          logger.info(`Cleaned up expired session: ${sessionId}`);
        } catch (error) {
          logger.error(`Error cleaning up session ${sessionId}:`, error);
        }
      }

      logger.info(`Session cleanup completed. Deleted ${deletedSessions} sessions and ${deletedFiles} files`);

    } catch (error) {
      logger.error('Session cleanup failed:', error);
      throw error;
    }
  }
);
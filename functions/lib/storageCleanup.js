"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredSessionsStorage = exports.manualStorageCleanup = exports.cleanupStorage = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
/**
 * Scheduled function to clean up old files from Firebase Storage
 * Runs daily at 2 AM UTC
 */
exports.cleanupStorage = (0, scheduler_1.onSchedule)({
    schedule: '0 2 * * *', // Daily at 2 AM UTC
    timeZone: 'UTC',
}, async (event) => {
    const bucket = admin.storage().bucket();
    const now = Date.now();
    let totalDeleted = 0;
    let totalErrors = 0;
    firebase_functions_1.logger.info('Starting storage cleanup process...');
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
            firebase_functions_1.logger.info(`Processing cleanup rule for: ${rule.description}`);
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
                        firebase_functions_1.logger.info(`Deleted expired file: ${file.name}`);
                    }
                }
                catch (error) {
                    ruleErrors++;
                    firebase_functions_1.logger.error(`Error processing file ${file.name}:`, error);
                }
            }
            totalDeleted += ruleDeleted;
            totalErrors += ruleErrors;
            firebase_functions_1.logger.info(`${rule.description}: Deleted ${ruleDeleted} files, ${ruleErrors} errors`);
        }
        firebase_functions_1.logger.info(`Storage cleanup completed. Total deleted: ${totalDeleted}, Total errors: ${totalErrors}`);
    }
    catch (error) {
        firebase_functions_1.logger.error('Storage cleanup failed:', error);
        throw error;
    }
});
/**
 * Manual cleanup function placeholder
 * For testing and emergency cleanup
 */
exports.manualStorageCleanup = (0, scheduler_1.onSchedule)({
    schedule: 'every 24 hours',
    timeZone: 'UTC',
}, async (event) => {
    firebase_functions_1.logger.info('Manual storage cleanup triggered');
    // Manual cleanup logic would go here
    // For now, this is just a placeholder
});
/**
 * Clean up expired sessions and associated files
 * Runs every 6 hours
 */
exports.cleanupExpiredSessionsStorage = (0, scheduler_1.onSchedule)({
    schedule: '0 */6 * * *', // Every 6 hours
    timeZone: 'UTC',
}, async (event) => {
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    const now = Date.now();
    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
    firebase_functions_1.logger.info('Starting expired session cleanup...');
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
                firebase_functions_1.logger.info(`Cleaned up expired session: ${sessionId}`);
            }
            catch (error) {
                firebase_functions_1.logger.error(`Error cleaning up session ${sessionId}:`, error);
            }
        }
        firebase_functions_1.logger.info(`Session cleanup completed. Deleted ${deletedSessions} sessions and ${deletedFiles} files`);
    }
    catch (error) {
        firebase_functions_1.logger.error('Session cleanup failed:', error);
        throw error;
    }
});
//# sourceMappingURL=storageCleanup.js.map
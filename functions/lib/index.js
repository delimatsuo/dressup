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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadGarment = exports.submitFeedback = exports.getGarments = exports.processImageWithGemini = exports.cleanupExpiredSessions = exports.deleteSession = exports.getSessionPhotos = exports.extendSession = exports.addPhotoToSession = exports.getSessionStatus = exports.createSession = void 0;
const https_1 = require("firebase-functions/v2/https");
const options_1 = require("firebase-functions/v2/options");
const admin = __importStar(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
const vertex_ai_1 = require("./vertex-ai");
// Export session management functions
var sessionFunctions_1 = require("./sessionFunctions");
Object.defineProperty(exports, "createSession", { enumerable: true, get: function () { return sessionFunctions_1.createSession; } });
Object.defineProperty(exports, "getSessionStatus", { enumerable: true, get: function () { return sessionFunctions_1.getSessionStatus; } });
Object.defineProperty(exports, "addPhotoToSession", { enumerable: true, get: function () { return sessionFunctions_1.addPhotoToSession; } });
Object.defineProperty(exports, "extendSession", { enumerable: true, get: function () { return sessionFunctions_1.extendSession; } });
Object.defineProperty(exports, "getSessionPhotos", { enumerable: true, get: function () { return sessionFunctions_1.getSessionPhotos; } });
Object.defineProperty(exports, "deleteSession", { enumerable: true, get: function () { return sessionFunctions_1.deleteSession; } });
Object.defineProperty(exports, "cleanupExpiredSessions", { enumerable: true, get: function () { return sessionFunctions_1.cleanupExpiredSessions; } });
// Initialize Firebase Admin with service account
const serviceAccount = require('../serviceAccount.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'project-friday-471118.appspot.com'
});
// Set global options for all functions
(0, options_1.setGlobalOptions)({
    maxInstances: 10,
    region: 'us-central1',
});
// Enable CORS for all origins
const cors = (0, cors_1.default)({ origin: true });
/**
 * Process an image with Gemini to apply virtual outfit
 */
exports.processImageWithGemini = (0, https_1.onCall)({
    timeoutSeconds: 300,
    memory: '2GiB',
    maxInstances: 5,
}, async (request) => {
    try {
        const { userImageUrl, garmentId, sessionId } = request.data;
        // Validate inputs
        if (!userImageUrl || !garmentId || !sessionId) {
            throw new https_1.HttpsError('invalid-argument', 'Missing required parameters');
        }
        const startTime = Date.now();
        // Get garment details from Firestore
        const garmentDoc = await admin
            .firestore()
            .collection('garments')
            .doc(garmentId)
            .get();
        if (!garmentDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Garment not found');
        }
        const garmentData = garmentDoc.data();
        // Use Vertex AI to analyze the outfit
        const analysis = await (0, vertex_ai_1.analyzeOutfitWithGemini)(userImageUrl, garmentData?.imageUrl || '');
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
    }
    catch (error) {
        console.error('Error processing image:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to process image');
    }
});
/**
 * Get available garments
 */
exports.getGarments = (0, https_1.onCall)({
    maxInstances: 10,
}, async (request) => {
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
    }
    catch (error) {
        console.error('Error fetching garments:', error);
        throw new https_1.HttpsError('internal', 'Failed to fetch garments');
    }
});
/**
 * Submit user feedback
 */
exports.submitFeedback = (0, https_1.onCall)({
    maxInstances: 10,
}, async (request) => {
    try {
        const { rating, comment, sessionId, resultId } = request.data;
        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            throw new https_1.HttpsError('invalid-argument', 'Rating must be between 1 and 5');
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
    }
    catch (error) {
        console.error('Error submitting feedback:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to submit feedback');
    }
});
/**
 * Upload garment image (admin function)
 */
exports.uploadGarment = (0, https_1.onRequest)({
    maxInstances: 2,
}, (req, res) => {
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
        }
        catch (error) {
            console.error('Error uploading garment:', error);
            res.status(500).send('Internal server error');
        }
    });
});
//# sourceMappingURL=index.js.map
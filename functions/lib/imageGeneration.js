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
exports.getBackgroundSuggestion = getBackgroundSuggestion;
exports.generateVirtualTryOnImage = generateVirtualTryOnImage;
exports.fetchImageAsBase64 = fetchImageAsBase64;
exports.generateMultiplePoses = generateMultiplePoses;
const storage_1 = require("firebase-admin/storage");
const logger_1 = require("./logger");
const generative_ai_1 = require("@google/generative-ai");
// Initialize Google AI SDK with API key
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
// Use Gemini 2.5 Flash Image Preview for image generation
const imageGenerationModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-image-preview',
    generationConfig: {
        temperature: 1.0,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
    }
});
/**
 * Analyzes a garment image and suggests a background setting.
 */
async function getBackgroundSuggestion(garmentImageBase64) {
    const logger = (0, logger_1.createLogger)('getBackgroundSuggestion');
    try {
        const prompt = `Look at this garment and suggest an appropriate background location where someone would naturally wear it. Consider the garment's style and formality. Examples: evening gown = "elegant ballroom", casual dress = "outdoor garden party", business suit = "modern office lobby". Respond with ONLY a brief location description in 10 words or less.`;
        const result = await imageGenerationModel.generateContent([
            prompt,
            { inlineData: { mimeType: 'image/jpeg', data: garmentImageBase64 } },
        ]);
        const response = result.response;
        if (response && response.candidates && response.candidates[0].content.parts[0].text) {
            const suggestion = response.candidates[0].content.parts[0].text.trim();
            console.log(`Background suggestion received: ${suggestion}`);
            return suggestion;
        }
        throw new Error('Could not get background suggestion from Gemini.');
    }
    catch (error) {
        logger.logError(error, { function: 'getBackgroundSuggestion' });
        // Fallback to a generic but nice background
        return 'a modern, minimalist studio with soft lighting';
    }
}
/**
 * Generate virtual try-on image with person wearing garment
 */
async function generateVirtualTryOnImage(userImageUrl, garmentImageUrl, poseType, location, // New parameter for dynamic background
sessionId, customInstructions) {
    const structuredLogger = (0, logger_1.createLogger)('generateVirtualTryOnImage');
    try {
        structuredLogger.logVertexAIRequest(sessionId, 2);
        // Fetch images as base64
        const userImageBase64 = await fetchImageAsBase64(userImageUrl);
        const garmentImageBase64 = await fetchImageAsBase64(garmentImageUrl);
        // Generate image using Gemini 2.5 Flash
        const startTime = Date.now();
        // Create a clear, goal-oriented prompt that communicates the virtual try-on objective
        const basePrompt = `**VIRTUAL TRY-ON TASK:**
Your goal is to help someone see what they would look like wearing a specific garment. This is a virtual fitting room experience.

**INPUTS PROVIDED:**
- Image 1: A real person (the customer) wearing their current clothes
- Image 2: A garment/outfit from an online store that they want to try on virtually

**YOUR OBJECTIVE:**
Generate 2 realistic photos showing THE EXACT SAME PERSON from Image 1 now wearing THE EXACT GARMENT from Image 2.

**CRITICAL REQUIREMENTS:**

1. **THE PERSON MUST BE THE SAME** 
   - This is the most important requirement!
   - Use the exact person from Image 1 - their face, hair, body type, skin tone, and all unique features
   - The customer needs to recognize themselves in the result
   - If the person doesn't look like themselves, the virtual try-on has failed

2. **THE GARMENT MUST BE ACCURATE**
   - The clothing from Image 2 should appear exactly as shown (same color, style, design)
   - It should fit naturally on the specific person's body from Image 1
   - Preserve all details: patterns, textures, buttons, logos, etc.

3. **CREATE TWO DIFFERENT POSES:**
   - Photo 1: The person standing naturally in ${location}
   - Photo 2: The same person sitting or in a different pose in the same location
   - Both must clearly show the person wearing the garment

**THINK OF IT THIS WAY:**
You're creating a magical mirror where the customer (Image 1) can instantly see themselves wearing any outfit (Image 2) they find online. They should think "That's ME in that dress/outfit!" not "That's someone else" or "That's just the original product photo."

**QUALITY EXPECTATIONS:**
- Photorealistic results that look like actual photos
- Natural lighting that flatters both person and garment
- The person should look comfortable and natural
- The garment should fit realistically on their body type

**SUCCESS CRITERIA:**
✓ The person can immediately recognize themselves
✓ The garment looks exactly like what they want to buy
✓ The images look like real photos, not artificial
✓ Two different poses showing how the outfit looks

Remember: This is about showing a real person (Image 1) what they personally would look like in the clothes (Image 2). Keep the person's identity intact!`;
        // Add custom instructions if provided
        const prompt = customInstructions
            ? `${basePrompt}\n\n**ADDITIONAL CUSTOMER REQUEST:**\n${customInstructions}\n\nApply this request while keeping the person recognizable as themselves and the garment accurate to what they want to buy.`
            : basePrompt;
        // Generate content with images
        const result = await imageGenerationModel.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: userImageBase64,
                }
            },
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: garmentImageBase64,
                }
            }
        ]);
        const processingTime = (Date.now() - startTime) / 1000;
        const response = result.response;
        // Check if response is valid
        if (!response || !response.candidates || response.candidates.length === 0) {
            throw new Error('Gemini returned no candidates in response');
        }
        const candidate = response.candidates[0];
        let generatedImageData = null;
        let description = '';
        if (candidate && candidate.content && candidate.content.parts) {
            // Look for generated image in response parts
            for (const part of candidate.content.parts) {
                if (part.inlineData?.data) {
                    generatedImageData = part.inlineData.data;
                    console.log('Generated image received from Gemini');
                }
                else if (part.inline_data?.data) {
                    generatedImageData = part.inline_data.data;
                    console.log('Generated image received from Gemini');
                }
                else if (part.text) {
                    description = part.text;
                    console.log('Text response from Gemini:', part.text);
                }
            }
        }
        // If no image generated, throw error as requested - NO FALLBACKS
        if (!generatedImageData) {
            console.error('Gemini did not generate an image. Response:', JSON.stringify(response));
            throw new Error(`Failed to generate image with Gemini. Model returned text only: ${description || 'No content'}`);
        }
        // Upload generated image to Firebase Storage
        const generatedImageUrl = await uploadGeneratedImage(generatedImageData, sessionId, poseType);
        structuredLogger.logVertexAIResponse(sessionId, true, processingTime * 1000, 0.95, 0);
        return {
            generatedImageUrl,
            description: description || `Virtual try-on: ${poseType} pose in restaurant setting`,
            confidence: 0.95,
        };
    }
    catch (error) {
        console.error('Error generating virtual try-on image:', error);
        structuredLogger.logError(error, {
            function: 'generateVirtualTryOnImage',
            sessionId,
            poseType
        });
        throw error;
    }
}
/**
 * Upload generated image to Firebase Storage
 */
async function uploadGeneratedImage(base64Data, sessionId, poseType) {
    const admin = await Promise.resolve().then(() => __importStar(require('firebase-admin')));
    const bucket = admin.storage().bucket();
    const fileName = `generated/${sessionId}/${poseType}-${Date.now()}.jpg`;
    const file = bucket.file(fileName);
    const buffer = Buffer.from(base64Data, 'base64');
    await file.save(buffer, {
        metadata: {
            contentType: 'image/jpeg',
            metadata: {
                sessionId,
                poseType,
                generated: 'true',
            },
        },
    });
    // Make the file publicly accessible
    await file.makePublic();
    // Return the public URL
    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
}
/**
 * Helper function to fetch image as base64
 */
async function fetchImageAsBase64(imageUrl) {
    try {
        // Check if URL is empty or invalid
        if (!imageUrl || imageUrl.trim() === '') {
            console.log('Empty image URL provided, returning placeholder');
            // Return a small placeholder image as base64
            return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        }
        console.log(`Fetching image from URL: ${imageUrl}`);
        // If it's a Firebase Storage URL, use Admin SDK
        if (imageUrl.includes('firebasestorage.googleapis.com') || imageUrl.includes('firebasestorage.app')) {
            // Extract the file path from the URL
            const urlParts = imageUrl.split('/');
            // Remove unused variable
            // Find the path by looking for 'uploads' in the URL
            const uploadsIndex = urlParts.findIndex(part => part === 'uploads');
            if (uploadsIndex !== -1) {
                const filePath = urlParts.slice(uploadsIndex).join('/').split('?')[0];
                console.log(`Extracted file path: ${filePath}`);
                // Use Firebase Admin SDK to download the file
                const bucket = (0, storage_1.getStorage)().bucket();
                const file = bucket.file(filePath);
                const [buffer] = await file.download();
                return buffer.toString('base64');
            }
        }
        // Fallback to HTTP fetch for non-Firebase URLs
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'DressUp-CloudFunction/1.0'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return buffer.toString('base64');
    }
    catch (error) {
        console.error('Error fetching image:', error);
        throw new Error(`Failed to fetch image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Generate multiple poses for virtual try-on
 */
async function generateMultiplePoses(userPhotos, garmentPhotos, sessionId) {
    const structuredLogger = (0, logger_1.createLogger)('generateMultiplePoses');
    try {
        // Get background suggestion once
        const garmentImageBase64 = await fetchImageAsBase64(garmentPhotos.front);
        const location = await getBackgroundSuggestion(garmentImageBase64);
        // Generate three different poses in restaurant setting
        const poses = [
            { type: 'standing', name: 'Standing View' },
            { type: 'sitting', name: 'Sitting View' },
        ];
        const results = await Promise.all(poses.map(async (pose) => {
            try {
                const result = await generateVirtualTryOnImage(userPhotos.front, garmentPhotos.front, pose.type, location, // Pass dynamic location
                sessionId);
                return {
                    name: pose.name,
                    originalImageUrl: userPhotos.front,
                    processedImageUrl: result.generatedImageUrl,
                    confidence: result.confidence,
                };
            }
            catch (error) {
                console.error(`Failed to generate ${pose.type} pose:`, error);
                // NO FALLBACK - throw the error
                throw error;
            }
        }));
        return results;
    }
    catch (error) {
        structuredLogger.logError(error, {
            function: 'generateMultiplePoses',
            sessionId
        });
        throw error;
    }
}
//# sourceMappingURL=imageGeneration.js.map
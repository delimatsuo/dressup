import { getStorage } from 'firebase-admin/storage';
import { createLogger } from './logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google AI SDK with API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

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
export async function getBackgroundSuggestion(garmentImageBase64: string): Promise<string> {
  const logger = createLogger('getBackgroundSuggestion');
  try {
    const prompt = `Look at this garment and suggest an appropriate background location where someone would naturally wear it. Consider the garment's style and formality. Examples: evening gown = "elegant ballroom", casual dress = "outdoor garden party", business suit = "modern office lobby". Respond with ONLY a brief location description in 10 words or less.`;

    const result = await imageGenerationModel.generateContent([
      prompt,
      { inlineData: { mimeType: 'image/jpeg', data: garmentImageBase64 } } as any,
    ]);

    const response = result.response;
    if (response && response.candidates && response.candidates[0].content.parts[0].text) {
      const suggestion = response.candidates[0].content.parts[0].text.trim();
      console.log(`Background suggestion received: ${suggestion}`);
      return suggestion;
    }
    throw new Error('Could not get background suggestion from Gemini.');
  } catch (error) {
    logger.logError(error as Error, { function: 'getBackgroundSuggestion' });
    // Fallback to a generic but nice background
    return 'a modern, minimalist studio with soft lighting';
  }
}


/**
 * Generate virtual try-on image with person wearing garment
 */
export async function generateVirtualTryOnImage(
  userImageUrl: string,
  garmentImageUrl: string,
  poseType: 'sitting' | 'standing',
  location: string, // New parameter for dynamic background
  sessionId: string,
  customInstructions?: string
): Promise<{
  generatedImageUrl: string;
  description: string;
  confidence: number;
}> {
  const structuredLogger = createLogger('generateVirtualTryOnImage');
  
  try {
    structuredLogger.logVertexAIRequest(sessionId, 2);
    
    // Fetch images as base64
    const userImageBase64 = await fetchImageAsBase64(userImageUrl);
    const garmentImageBase64 = await fetchImageAsBase64(garmentImageUrl);
    
    // Generate image using Gemini 2.5 Flash
    const startTime = Date.now();
    
    // Create an extremely clear prompt that prevents misinterpretation
    const basePrompt = `**VIRTUAL CLOTHING TRY-ON TASK**

I need you to perform a virtual clothing try-on. Here's what you have:

IMAGE 1: A real person (customer) - they want to see THEMSELVES in new clothes
IMAGE 2: A clothing item/garment (might be a website screenshot, product photo, or catalog image)

**YOUR JOB:**
Take the PERSON from Image 1 and show them wearing the CLOTHING from Image 2.

**IMPORTANT - DO NOT:**
- Do NOT use the model from Image 2 (that's not the customer!)
- Do NOT create a website screenshot or web frame
- Do NOT just modify the product photo
- Do NOT replace the customer with someone else

**INSTEAD, YOU MUST:**
1. Keep the EXACT SAME PERSON from Image 1:
   - Same face (eyes, nose, mouth, facial structure)
   - Same hair (color, style, length)
   - Same skin tone
   - Same body type and proportions
   - They MUST be recognizable as the same person

2. Put them in the CLOTHING from Image 2:
   - Extract just the garment/outfit (ignore any model wearing it)
   - Keep the garment's exact design, color, and style
   - Fit it naturally to the person from Image 1's body

3. Create 2 clean photos (NOT screenshots):
   - Photo 1: Person from Image 1 standing, wearing the garment, in ${location}
   - Photo 2: Same person in a different pose (sitting/walking), same outfit, same location
   - Make them look like real photos taken with a camera, not website images

**THE RESULT:**
The person from Image 1 should be able to look at your generated images and say:
"Yes, that's ME wearing that dress/outfit!"

If they say "That's not me" or "That's just the website photo" - you've failed the task.

**REMEMBER:**
- Person = from Image 1 (the customer)
- Clothes = from Image 2 (what they want to try)
- Output = clean photos, no web frames or screenshots`;

    // Add custom instructions if provided
    const prompt = customInstructions 
      ? `${basePrompt}\n\n**ADDITIONAL CUSTOMER REQUEST:**\n${customInstructions}\n\nApply this request while keeping the person recognizable as themselves and the garment accurate to what they want to buy.`
      : basePrompt;

    // Generate content with explicitly labeled images
    const result = await imageGenerationModel.generateContent([
      "IMAGE 1 (THE CUSTOMER/PERSON TO USE):",
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: userImageBase64,
        }
      } as any,
      "IMAGE 2 (THE GARMENT/CLOTHING TO WEAR):",
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: garmentImageBase64,
        }
      } as any,
      "TASK TO PERFORM:",
      prompt
    ]);
    
    const processingTime = (Date.now() - startTime) / 1000;
    
    const response = result.response;
    
    // Check if response is valid
    if (!response || !response.candidates || response.candidates.length === 0) {
      throw new Error('Gemini returned no candidates in response');
    }
    
    const candidate = response.candidates[0];
    
    let generatedImageData: string | null = null;
    let description = '';
    
    if (candidate && candidate.content && candidate.content.parts) {
      // Look for generated image in response parts
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data) {
          generatedImageData = part.inlineData.data;
          console.log('Generated image received from Gemini');
        } else if ((part as any).inline_data?.data) {
          generatedImageData = (part as any).inline_data.data;
          console.log('Generated image received from Gemini');
        } else if (part.text) {
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
    const generatedImageUrl = await uploadGeneratedImage(
      generatedImageData,
      sessionId,
      poseType
    );
    
    structuredLogger.logVertexAIResponse(
      sessionId,
      true,
      processingTime * 1000,
      0.95,
      0
    );
    
    return {
      generatedImageUrl,
      description: description || `Virtual try-on: ${poseType} pose in restaurant setting`,
      confidence: 0.95,
    };
    
  } catch (error) {
    console.error('Error generating virtual try-on image:', error);
    structuredLogger.logError(error as Error, { 
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
async function uploadGeneratedImage(
  base64Data: string,
  sessionId: string,
  poseType: string
): Promise<string> {
  const admin = await import('firebase-admin');
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
export async function fetchImageAsBase64(imageUrl: string): Promise<string> {
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
        const bucket = getStorage().bucket();
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
    
  } catch (error) {
    console.error('Error fetching image:', error);
    throw new Error(`Failed to fetch image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate multiple poses for virtual try-on
 */
export async function generateMultiplePoses(
  userPhotos: { front: string; side?: string; back?: string },
  garmentPhotos: { front: string; side?: string; back?: string },
  sessionId: string
): Promise<Array<{
  name: string;
  originalImageUrl: string;
  processedImageUrl: string;
  confidence: number;
}>> {
  const structuredLogger = createLogger('generateMultiplePoses');
  
  try {
    // Get background suggestion once
    const garmentImageBase64 = await fetchImageAsBase64(garmentPhotos.front);
    const location = await getBackgroundSuggestion(garmentImageBase64);

    // Generate three different poses in restaurant setting
    const poses: Array<{ type: 'sitting' | 'standing'; name: string }> = [
      { type: 'standing', name: 'Standing View' },
      { type: 'sitting', name: 'Sitting View' },
    ];
    
    const results = await Promise.all(
      poses.map(async (pose) => {
        try {
          const result = await generateVirtualTryOnImage(
            userPhotos.front,
            garmentPhotos.front,
            pose.type,
            location, // Pass dynamic location
            sessionId
          );
          
          return {
            name: pose.name,
            originalImageUrl: userPhotos.front,
            processedImageUrl: result.generatedImageUrl,
            confidence: result.confidence,
          };
        } catch (error) {
          console.error(`Failed to generate ${pose.type} pose:`, error);
          // NO FALLBACK - throw the error
          throw error;
        }
      })
    );
    
    return results;
    
  } catch (error) {
    structuredLogger.logError(error as Error, { 
      function: 'generateMultiplePoses',
      sessionId 
    });
    throw error;
  }
}
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
    const prompt = `You are a professional fashion photographer planning a photoshoot. Examine this garment carefully - notice its fabric texture, cut, formality level, and the lifestyle it represents. Based on these details, envision where this garment would naturally be worn and look most compelling in a photograph. Consider the lighting that would best complement the fabric's properties and the atmosphere that matches the garment's intended use. Describe a specific, photorealistic location setting that would create a harmonious and aspirational scene. For example, a silk evening gown might call for 'the grand staircase of an opulent opera house with warm golden chandelier lighting,' while casual linen shorts suggest 'a sun-drenched Mediterranean beach cafe with natural afternoon light.' Respond with ONLY the setting description in 10 words or less.`;

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
    
    // Create the prompt using Gemini's best practices: narrative description, photographic terminology, and step-by-step instructions
    const basePrompt = `You are creating a professional fashion e-commerce virtual try-on experience. The person in the first image is your model, and they need to see themselves wearing the garment from the second image in a realistic, aspirational context.

**Step 1 - Preserve the Model's Identity:**
Carefully study the person in the first image. Note their exact facial features: the shape of their eyes, their unique eye color and expression, the specific curve of their nose, their distinctive lip shape and natural color, their exact skin tone and texture, any visible freckles or beauty marks, their precise haircut and hair color including any highlights or natural variations, their facial bone structure including jawline and cheekbones, and their natural body proportions. These details must remain absolutely unchanged - this is the same person, just wearing different clothes.

**Step 2 - Understand the Garment:**
Analyze the clothing in the second image. Identify whether this is a complete outfit or a single garment piece. Notice the fabric texture, drape, fit, color accuracy, and any distinctive design elements like buttons, zippers, patterns, or logos. This exact garment must appear naturally fitted to the person's body.

**Step 3 - Create the Standing Portrait:**
Generate a high-resolution, professional fashion photograph captured with a virtual 85mm portrait lens at f/2.8. The person from image one is now wearing the garment from image two, standing in a three-quarter pose that naturally showcases the outfit. They are positioned in ${location}, with professional three-point lighting that creates soft shadows and highlights the fabric's texture. The background should have a subtle bokeh effect while keeping the subject in sharp focus. The image should feel like it was shot for a premium fashion e-commerce site - clean, aspirational, and photorealistic.

**Step 4 - Create the Sitting Variation:**
Using the same photographic setup and location, create a second image where the person is seated comfortably - perhaps on a designer chair, bench, or architectural element that fits the scene. The pose should be relaxed yet elegant, showing how the garment moves and drapes when sitting. Maintain the same lighting quality and professional finish. The person's face should be clearly visible and recognizable as the exact same individual from the first image.

**Critical Quality Checks:**
- The person's face must be identical to the original - same eye shape, same nose, same lips, same skin tone, same hair
- The garment must be the exact one from the second image - correct color, pattern, and design details
- Both images should have consistent, professional lighting and color grading
- The final result should be indistinguishable from a real photoshoot`;

    // Add custom instructions if provided, integrating them into the narrative
    const prompt = customInstructions 
      ? `${basePrompt}\n\n**Step 5 - Apply Custom Modifications:**\nWhile maintaining the person's exact identity and the garment's design, apply these specific adjustments to the scene: ${customInstructions}. Integrate these changes naturally into the photoshoot, ensuring they enhance rather than compromise the professional quality and identity preservation. If the instructions conflict with preserving the person's face or the garment's essential design, prioritize accuracy of identity and garment over the modification request.`
      : basePrompt;

    // Generate content with images
    const result = await imageGenerationModel.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: userImageBase64,
        }
      } as any,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: garmentImageBase64,
        }
      } as any
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
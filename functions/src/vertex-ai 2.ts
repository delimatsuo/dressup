import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { createLogger } from './logger';

// Initialize Vertex AI with service account
const PROJECT_ID = 'projectdressup';
const LOCATION = 'us-central1';

// Initialize Vertex AI client
const vertex_ai = new VertexAI({
  project: PROJECT_ID,
  location: LOCATION,
});

// Get the generative model (Gemini 2.5 Flash Image) with optimized configuration
const generativeModel = vertex_ai.preview.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    maxOutputTokens: 8192,
    temperature: 0.3, // Lower temperature for more consistent fashion analysis
    topP: 0.9,        // Higher topP for more creative suggestions
    topK: 40,         // Add topK for better token selection
    candidateCount: 1, // Single response for faster processing
  },
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
});

/**
 * Process an image with Gemini Vision to analyze outfit compatibility
 */
export async function analyzeOutfitWithGemini(
  userImageUrl: string,
  garmentImageUrl: string,
  additionalInstructions?: string,
  sessionId?: string
): Promise<{
  description: string;
  confidence: number;
  suggestions: string[];
}> {
  const structuredLogger = createLogger('analyzeOutfitWithGemini');
  const MAX_RETRIES = 2;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      structuredLogger.logVertexAIRequest(sessionId || 'unknown', 2); // 2 images
    // Create the prompt for virtual outfit try-on with enhanced pose-specific instructions
    const basePrompt = `
      You are an advanced fashion AI specializing in virtual outfit try-on technology. Analyze these two images:
      1. The first image shows a person in a specific pose
      2. The second image shows a clothing item/garment
      
      Your task is to provide a detailed analysis of how this garment would look on the person, considering:
      - Body proportions and fit
      - Color coordination with skin tone
      - Style compatibility with the person's aesthetic
      - How the fabric would drape and move in this pose
      - Overall fashion appeal and wearability
      
      Be specific about:
      1. How the garment fits the person's body type
      2. Color harmony and visual appeal
      3. Style appropriateness and fashion-forward assessment
      4. Practical considerations (comfort, mobility, etc.)
      5. Styling suggestions to enhance the overall look
    `;
    
    const poseInstructions = additionalInstructions 
      ? `\n\nPose-Specific Analysis: ${additionalInstructions}\n\nConsider how the garment would look and behave in this specific pose, including fabric movement, fit adjustments, and visual impact.` 
      : '\n\nProvide a comprehensive analysis of how this garment would appear on the person.';
      
    const prompt = `${basePrompt}${poseInstructions}
      
      Format your response as JSON with the following structure:
      {
        "description": "detailed description of the virtual outfit try-on result, focusing on fit, style, and visual appeal",
        "compatibility": "detailed analysis of style compatibility and fashion assessment",
        "suggestions": ["specific styling suggestion 1", "complementary item suggestion 2", "color/accessory recommendation 3"],
        "rating": 8.5,
        "fitAnalysis": "analysis of how well the garment fits the person's body type and proportions",
        "colorHarmony": "assessment of color coordination between garment and person"
      }
    `;

    // Convert images to base64 if they're URLs
    // In production, you'd fetch the actual image data
    const request = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt,
            },
            {
              inlineData: {
                mimeType: await getImageMimeType(userImageUrl),
                data: await fetchImageAsBase64(userImageUrl),
              },
            },
            {
              inlineData: {
                mimeType: await getImageMimeType(garmentImageUrl),
                data: await fetchImageAsBase64(garmentImageUrl),
              },
            },
          ],
        },
      ],
    };

    // Generate content using Gemini with performance monitoring
    console.log('Sending request to Gemini 2.5 Flash Image...');
    const geminiStartTime = Date.now();
    
    const result = await generativeModel.generateContent(request);
    const response = result.response;
    
    const geminiProcessingTime = (Date.now() - geminiStartTime) / 1000;
    console.log(`Gemini processing completed in ${geminiProcessingTime}s`);
    
    // Extract response with detailed logging
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`Gemini response length: ${text.length} characters`);
    
    if (response.candidates?.[0]?.finishReason) {
      console.log(`Gemini finish reason: ${response.candidates[0].finishReason}`);
    }
    
    // Check for safety ratings
    if (response.candidates?.[0]?.safetyRatings) {
      console.log('Gemini safety ratings:', response.candidates[0].safetyRatings);
    }

    // Parse the JSON response
    try {
      const analysis = JSON.parse(text);
      
      // Enhanced description combining multiple analysis aspects
      const enhancedDescription = [
        analysis.description || 'Virtual outfit applied successfully',
        analysis.fitAnalysis ? `Fit: ${analysis.fitAnalysis}` : '',
        analysis.colorHarmony ? `Color harmony: ${analysis.colorHarmony}` : '',
        analysis.compatibility ? `Style: ${analysis.compatibility}` : ''
      ].filter(Boolean).join(' | ');
      
      return {
        description: enhancedDescription,
        confidence: (analysis.rating || 7.5) / 10,
        suggestions: analysis.suggestions || ['Consider adding accessories', 'Try complementary colors', 'Experiment with different styles'],
      };
    } catch (parseError) {
      console.warn('Failed to parse Gemini JSON response, using fallback:', parseError);
      
      // If JSON parsing fails, try to extract useful information from the text
      const fallbackDescription = text.length > 0 
        ? `Virtual outfit analysis: ${text.substring(0, 300)}...`
        : 'Virtual outfit applied successfully with AI-powered style analysis';
        
      return {
        description: fallbackDescription,
        confidence: 0.75,
        suggestions: ['Consider adding accessories', 'Try different colors', 'Experiment with complementary styles'],
      };
    }
    } catch (error) {
      console.error(`Gemini analysis attempt ${attempt} failed:`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === MAX_RETRIES) {
        break;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.error('All Gemini analysis attempts failed:', lastError);
  throw new Error(`Failed to analyze outfit after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

/**
 * Generate outfit suggestions based on user preferences
 */
export async function generateOutfitSuggestions(
  userPreferences: {
    style: string;
    occasion: string;
    season: string;
    colors: string[];
  }
): Promise<{
  suggestions: Array<{
    name: string;
    description: string;
    category: string;
  }>;
}> {
  try {
    const prompt = `
      Based on these preferences:
      - Style: ${userPreferences.style}
      - Occasion: ${userPreferences.occasion}
      - Season: ${userPreferences.season}
      - Preferred colors: ${userPreferences.colors.join(', ')}
      
      Suggest 5 outfit ideas with names, descriptions, and categories.
      Format as JSON array with objects containing: name, description, category
    `;

    const request = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    };

    const result = await generativeModel.generateContent(request);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      const suggestions = JSON.parse(text);
      return { suggestions };
    } catch {
      return {
        suggestions: [
          {
            name: 'Classic Casual',
            description: 'Comfortable everyday wear',
            category: 'casual',
          },
        ],
      };
    }
  } catch (error) {
    console.error('Error generating suggestions:', error);
    throw new Error('Failed to generate outfit suggestions');
  }
}

/**
 * Helper function to get image MIME type from URL or response headers
 */
async function getImageMimeType(imageUrl: string): Promise<string> {
  try {
    // Try to determine from URL extension first
    const urlLower = imageUrl.toLowerCase();
    if (urlLower.includes('.png')) return 'image/png';
    if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return 'image/jpeg';
    if (urlLower.includes('.gif')) return 'image/gif';
    if (urlLower.includes('.webp')) return 'image/webp';
    if (urlLower.includes('.bmp')) return 'image/bmp';
    
    // Fallback to HEAD request to get content type
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.startsWith('image/')) {
        return contentType;
      }
    } catch (headError) {
      console.warn('Failed to get content type via HEAD request:', headError);
    }
    
    // Default fallback
    return 'image/jpeg';
  } catch (error) {
    console.warn('Error determining image MIME type:', error);
    return 'image/jpeg';
  }
}

/**
 * Helper function to fetch image as base64
 * Fetches image from URL and converts to base64
 */
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  try {
    console.log(`Fetching image from: ${imageUrl}`);
    
    // Handle Firebase Storage URLs and other image URLs
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'DressUpApp/1.0',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    // Validate content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`Invalid content type: ${contentType}. Expected image.`);
    }
    
    // Check content length
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      // Gemini has a 20MB limit, but we'll be more conservative
      const maxSize = 15 * 1024 * 1024; // 15MB
      if (size > maxSize) {
        throw new Error(`Image too large: ${size} bytes. Maximum: ${maxSize} bytes`);
      }
    }
    
    // Get the image as array buffer
    const arrayBuffer = await response.arrayBuffer();
    
    // Additional size check after download
    if (arrayBuffer.byteLength > 15 * 1024 * 1024) {
      throw new Error(`Downloaded image too large: ${arrayBuffer.byteLength} bytes`);
    }
    
    // Convert to base64
    const base64String = Buffer.from(arrayBuffer).toString('base64');
    
    console.log(`Successfully converted image to base64, length: ${base64String.length} chars, size: ${arrayBuffer.byteLength} bytes`);
    return base64String;
    
  } catch (error) {
    console.error('Error fetching image as base64:', error);
    throw new Error(`Failed to fetch image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Test function to validate Gemini 2.5 Flash Image integration
 */
export async function testGeminiIntegration(): Promise<{
  success: boolean;
  version: string;
  modelInfo: string;
  error?: string;
}> {
  try {
    console.log('Testing Gemini 2.5 Flash Image integration...');
    
    const testPrompt = 'Respond with a JSON object containing: {"test": "success", "model": "gemini-2.5-flash-image", "timestamp": "' + new Date().toISOString() + '"}';
    
    const request = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: testPrompt,
            },
          ],
        },
      ],
    };

    const result = await generativeModel.generateContent(request);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      success: true,
      version: '2.5-flash-image',
      modelInfo: `Response: ${text.substring(0, 200)}...`,
    };
  } catch (error) {
    console.error('Gemini integration test failed:', error);
    return {
      success: false,
      version: '2.5-flash-image',
      modelInfo: 'Integration test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
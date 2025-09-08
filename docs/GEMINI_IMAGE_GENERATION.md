# Gemini Image Generation Guide (Nano Banana)

## Overview
Gemini can generate and process images conversationally. You can prompt Gemini with text, images, or a combination of both allowing you to create, edit, and iterate on visuals with unprecedented control:

- **Text-to-Image**: Generate high-quality images from simple or complex text descriptions.
- **Image + Text-to-Image (Editing)**: Provide an image and use text prompts to add, remove, or modify elements, change the style, or adjust the color grading.
- **Multi-Image to Image (Composition & Style Transfer)**: Use multiple input images to compose a new scene or transfer the style from one image to another.
- **Iterative Refinement**: Engage in a conversation to progressively refine your image over multiple turns, making small adjustments until it's perfect.
- **High-Fidelity Text Rendering**: Accurately generate images that contain legible and well-placed text, ideal for logos, diagrams, and posters.

All generated images include a SynthID watermark.

## Image Generation Implementation (JavaScript)

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// Get the model
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash-image-preview',
  generationConfig: {
    temperature: 1.0,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  }
});

// Generate image
const prompt = "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme";

const result = await model.generateContent(prompt);
const response = result.response;

// Process the response
for (const part of response.candidates[0].content.parts) {
  if (part.text) {
    console.log(part.text);
  } else if (part.inlineData) {
    // This contains the generated image as base64
    const imageData = part.inlineData.data;
    // Save or process the image
  }
}
```

## Image Editing (Text and Image to Image)

```javascript
const prompt = "Create a picture of my cat eating a nano-banana in a fancy restaurant under the Gemini constellation";

// Provide both prompt and image
const result = await model.generateContent([
  prompt,
  {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64ImageData, // Your input image as base64
    }
  }
]);
```

## Multiple Images Composition

```javascript
const prompt = "Create a new image by combining the elements from the provided images...";

const result = await model.generateContent([
  prompt,
  {
    inlineData: {
      mimeType: 'image/jpeg',
      data: image1Base64,
    }
  },
  {
    inlineData: {
      mimeType: 'image/jpeg',
      data: image2Base64,
    }
  }
]);
```

## Key Model Information

- **Model Name**: `gemini-2.5-flash-image-preview`
- **API**: Google AI SDK (NOT Vertex AI)
- **Package**: `@google/generative-ai`
- **Authentication**: Uses `GOOGLE_AI_API_KEY` environment variable

## Important Notes

1. This model is accessed through the Google AI SDK, NOT through Vertex AI
2. The model name is specifically `gemini-2.5-flash-image-preview`
3. Images are returned as base64 data in the `inlineData` field
4. All generated images include a SynthID watermark
5. For best performance, use supported languages: EN, es-MX, ja-JP, zh-CN, hi-IN

## Response Structure

The response contains candidates with content parts:
- `part.text` - Text description or response
- `part.inlineData.data` - Base64 encoded generated image
- `part.inlineData.mimeType` - Image mime type (usually 'image/jpeg')
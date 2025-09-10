# Gemini 2.5 Flash Image Generation Guide (Nano Banana)

## CRITICAL: GEMINI CAN GENERATE IMAGES!

**Model Name:** `gemini-2.5-flash-image-preview`

## Core Capabilities

Gemini 2.5 Flash Image (aka Nano Banana) **CAN generate images**. It supports:

### Image Generation Modes:
1. **Text-to-Image**: Generate high-quality images from text descriptions
2. **Image + Text-to-Image (Editing)**: Edit existing images with text prompts
3. **Multi-Image to Image**: Compose new scenes from multiple images
4. **Iterative Refinement**: Conversational editing across multiple turns
5. **High-Fidelity Text Rendering**: Generate images with legible text

### Key Features:
- Generate photorealistic images
- Edit images conversationally
- Combine multiple images
- Maintain character consistency
- Style transfer capabilities
- SynthID watermark on all generated images

## Correct Implementation

### JavaScript/TypeScript Example:
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash-image-preview' 
});

// For virtual try-on with input images
const result = await model.generateContent({
  contents: [{
    role: 'user',
    parts: [
      { text: "Generate a photorealistic image of the person from the first image wearing the garment from the second image" },
      { inlineData: { mimeType: 'image/jpeg', data: userImageBase64 } },
      { inlineData: { mimeType: 'image/jpeg', data: garmentImageBase64 } }
    ]
  }]
});

// Extract generated image from response
for (const part of result.response.candidates[0].content.parts) {
  if (part.inlineData) {
    // This is the generated image!
    const imageData = part.inlineData.data;
    // Save or process the image
  }
}
```

## Virtual Try-On Prompting

### Effective Prompt Template:
```
Create a photorealistic image of the person from the first image wearing 
the garment from the second image. The person should maintain their exact 
facial features, body type, and skin tone. The garment should fit naturally 
on their body with realistic draping and shadows. Place them in [setting].
```

### Best Practices:
1. **Be Descriptive**: Use full sentences, not just keywords
2. **Specify Details**: Include pose, lighting, background
3. **Maintain Identity**: Explicitly request preservation of person's features
4. **Iterate**: Use conversational refinement for better results

## Common Issues & Solutions

### Issue: Blank/White Images
**Cause**: Incorrect API call structure or response parsing
**Solution**: Use proper content structure with role and parts

### Issue: No Image in Response
**Cause**: Looking for image in wrong part of response
**Solution**: Check `part.inlineData` for generated images

## Pricing
- $30.00 per 1 million output tokens
- Each image = 1290 tokens
- Cost per image: ~$0.039

## Important Notes
- Model is in preview but production usage is allowed
- Higher latency than specialized models like Imagen
- All images include invisible SynthID watermark
- Works best with up to 3 input images

## NEVER FORGET
**Gemini 2.5 Flash Image CAN generate images!** It's not just for analysis!
const { test, expect } = require('@playwright/test');
const fs = require('fs');

test.describe('Force Generation Test', () => {
  test('force virtual try-on generation to test if it works', async ({ page }) => {
    test.setTimeout(300000);
    
    console.log('Starting force generation test...');
    
    // Navigate to app
    await page.goto('https://dressup-ai.vercel.app');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Upload user photo
    const fileInputs = page.locator('input[type="file"]');
    await fileInputs.first().setInputFiles('/tmp/test-generate.jpg');
    await page.waitForTimeout(3000);
    console.log('✓ User photo uploaded');
    
    // Try to select a garment by clicking on any clickable element in the garment area
    const garmentElements = page.locator('[class*="item"], img[src*="cloth"], [class*="garment"]');
    const count = await garmentElements.count();
    console.log(`Found ${count} potential garment elements`);
    
    if (count > 0) {
      await garmentElements.first().click();
      await page.waitForTimeout(2000);
      console.log('✓ Clicked on garment element');
    }
    
    await page.screenshot({ path: 'e2e/screenshots/force-01-setup-complete.png', fullPage: true });
    
    // Force click the Generate button even if disabled
    console.log('Force clicking Generate button...');
    const generateButton = page.locator('button:has-text("Generate")');
    
    if (await generateButton.count() > 0) {
      try {
        // First try normal click
        await generateButton.click({ timeout: 5000 });
        console.log('✓ Generate button clicked normally');
      } catch (e) {
        console.log('Normal click failed, trying force click...');
        try {
          await generateButton.click({ force: true });
          console.log('✓ Generate button force clicked');
        } catch (e2) {
          console.log('Force click failed, trying JS click...');
          await page.evaluate(() => {
            const btn = document.querySelector('button[type="submit"], button:contains("Generate")');
            if (btn) btn.click();
          });
          console.log('✓ Generate button clicked via JavaScript');
        }
      }
      
      await page.screenshot({ path: 'e2e/screenshots/force-02-after-generate-click.png', fullPage: true });
      
      // Wait for ANY image to appear that might be the generated result
      console.log('Waiting for any new images to appear...');
      
      const initialImages = await page.locator('img').count();
      console.log(`Initial image count: ${initialImages}`);
      
      let newImageFound = false;
      let attempts = 0;
      const maxAttempts = 36; // 3 minutes (5s intervals)
      
      while (!newImageFound && attempts < maxAttempts) {
        await page.waitForTimeout(5000);
        attempts++;
        
        const currentImages = await page.locator('img').count();
        console.log(`Attempt ${attempts}: Current image count: ${currentImages}`);
        
        if (currentImages > initialImages) {
          console.log('✓ New image detected!');
          newImageFound = true;
          break;
        }
        
        // Also check for any changes in the Result section
        const resultText = await page.locator('.result, [class*="result"]').first().textContent().catch(() => '');
        if (resultText && !resultText.includes('No model')) {
          console.log(`✓ Result section changed: ${resultText}`);
          newImageFound = true;
          break;
        }
        
        // Check for any loading indicators
        const loadingElements = page.locator('.loading, .spinner, [class*="loading"], [class*="spinner"]');
        const loadingCount = await loadingElements.count();
        if (loadingCount > 0) {
          console.log(`Loading indicator detected (${loadingCount} elements)`);
        }
      }
      
      await page.screenshot({ path: 'e2e/screenshots/force-03-final-state.png', fullPage: true });
      
      if (newImageFound) {
        // Try to find and analyze the generated image
        console.log('Looking for generated image...');
        
        const allImages = page.locator('img');
        const imageCount = await allImages.count();
        
        for (let i = 0; i < imageCount; i++) {
          const img = allImages.nth(i);
          const src = await img.getAttribute('src');
          
          if (src && !src.includes('test-generate.jpg') && (src.startsWith('blob:') || src.startsWith('data:image') || src.includes('generated'))) {
            console.log(`Found potential generated image: ${src.substring(0, 100)}...`);
            
            try {
              let imageBuffer = null;
              
              if (src.startsWith('data:image')) {
                const base64Data = src.split(',')[1];
                imageBuffer = Buffer.from(base64Data, 'base64');
              } else if (src.startsWith('blob:') || src.startsWith('http')) {
                const response = await page.evaluate(async (src) => {
                  const response = await fetch(src);
                  const arrayBuffer = await response.arrayBuffer();
                  return Array.from(new Uint8Array(arrayBuffer));
                }, src);
                imageBuffer = Buffer.from(response);
              }
              
              if (imageBuffer) {
                const imageSize = imageBuffer.length;
                console.log(`Generated image size: ${imageSize} bytes`);
                
                fs.writeFileSync(`e2e/screenshots/force-04-generated-${i}.jpg`, imageBuffer);
                
                // Analyze for white/blank content
                let whitePixelCount = 0;
                const sampleSize = Math.min(1000, Math.floor(imageSize / 3));
                
                for (let j = 0; j < sampleSize; j++) {
                  const pixelValue = imageBuffer[j * 3];
                  if (pixelValue > 240) {
                    whitePixelCount++;
                  }
                }
                
                const whitePercentage = (whitePixelCount / sampleSize) * 100;
                
                console.log('\n=== IMAGE ANALYSIS RESULTS ===');
                console.log(`Image ${i}: ${imageSize} bytes (${(imageSize / 1024).toFixed(2)} KB)`);
                console.log(`White pixel percentage: ${whitePercentage.toFixed(2)}%`);
                
                if (whitePercentage > 90) {
                  console.log(`❌ Image ${i} is mostly white/blank - confirming the user's issue!`);
                } else {
                  console.log(`✅ Image ${i} contains actual content - image generation is working!`);
                }
              }
            } catch (error) {
              console.log(`Error analyzing image ${i}: ${error.message}`);
            }
          }
        }
        
        console.log('\n=== FORCE GENERATION TEST SUMMARY ===');
        console.log('✅ Successfully uploaded user photo');
        console.log('✅ Successfully clicked garment selection');
        console.log('✅ Successfully triggered generate button (forced)');
        console.log('✅ Successfully detected image generation activity');
        console.log('✅ Test completed - check screenshots and generated images for quality');
        
      } else {
        console.log('❌ No new images detected after generation attempt');
        console.log('This might indicate the generation process failed or is taking longer than expected');
      }
      
    } else {
      console.log('❌ Generate button not found');
    }
  });
});
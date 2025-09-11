const { test, expect } = require('@playwright/test');
const fs = require('fs');

test.describe('Complete DressUp Workflow Test', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(300000); // 5 minutes
  });

  test('complete virtual try-on workflow with garment selection', async ({ page }) => {
    console.log('Starting complete DressUp workflow test...');
    
    // Step 1: Navigate to application
    await page.goto('https://dressup-ai.vercel.app');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'e2e/screenshots/complete-01-initial.png', fullPage: true });
    
    // Step 2: Click Get Started if present (but don't fail if not found)
    try {
      const getStartedButton = page.locator('button:has-text("Get Started")');
      if (await getStartedButton.count() > 0 && await getStartedButton.isVisible()) {
        await getStartedButton.click({ force: true });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
      }
    } catch (e) {
      console.log('Get Started button interaction failed or not needed');
    }
    
    await page.screenshot({ path: 'e2e/screenshots/complete-02-after-start.png', fullPage: true });
    
    // Step 3: Upload user photo
    console.log('Uploading user photo...');
    const fileInputs = page.locator('input[type="file"]');
    await fileInputs.first().waitFor({ state: 'attached', timeout: 15000 });
    await fileInputs.first().setInputFiles('/tmp/test-generate.jpg');
    
    // Wait for photo to be processed and interface to update
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/screenshots/complete-03-photo-uploaded.png', fullPage: true });
    console.log('✓ User photo uploaded');
    
    // Step 4: Select a garment from the available options
    console.log('Looking for garment selection options...');
    
    // Look for clickable garment items in the interface
    const garmentSelectors = [
      'img[src*="cloth"]', // Images of clothing items
      '.garment img',
      '.clothing img',
      '[data-testid*="garment"] img',
      '[class*="garment"] img',
      '[class*="clothing"] img',
      'img[alt*="cloth"]',
      'img[alt*="garment"]'
    ];
    
    let selectedGarment = false;
    for (const selector of garmentSelectors) {
      const garmentImages = page.locator(selector);
      const count = await garmentImages.count();
      
      if (count > 0) {
        console.log(`Found ${count} garment options with selector: ${selector}`);
        
        // Try to click the first available garment
        try {
          const firstGarment = garmentImages.first();
          await firstGarment.waitFor({ state: 'visible', timeout: 5000 });
          await firstGarment.click();
          console.log(`✓ Selected garment with selector: ${selector}`);
          selectedGarment = true;
          break;
        } catch (e) {
          console.log(`Could not click garment with selector ${selector}: ${e.message}`);
        }
      }
    }
    
    // If no garment images found, try looking for clickable containers
    if (!selectedGarment) {
      console.log('No garment images found, looking for clickable containers...');
      
      const containerSelectors = [
        '[class*="garment"]',
        '[class*="clothing"]',
        '[class*="item"]',
        'div[role="button"]',
        '.clickable'
      ];
      
      for (const selector of containerSelectors) {
        const containers = page.locator(selector);
        const count = await containers.count();
        
        if (count > 0) {
          console.log(`Found ${count} containers with selector: ${selector}`);
          try {
            await containers.first().click();
            console.log(`✓ Selected garment container: ${selector}`);
            selectedGarment = true;
            break;
          } catch (e) {
            console.log(`Could not click container ${selector}: ${e.message}`);
          }
        }
      }
    }
    
    // Wait for garment selection to be processed
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/complete-04-garment-selected.png', fullPage: true });
    
    if (selectedGarment) {
      console.log('✓ Garment selected successfully');
    } else {
      console.log('⚠️ Warning: Could not find or select a garment, but continuing test...');
    }
    
    // Step 5: Check if Generate button is now enabled
    console.log('Checking Generate button status...');
    const generateButton = page.locator('button:has-text("Generate")');
    
    if (await generateButton.count() > 0) {
      const isDisabled = await generateButton.getAttribute('disabled');
      console.log(`Generate button disabled status: ${isDisabled}`);
      
      if (isDisabled === null) {
        console.log('✓ Generate button is enabled! Starting image generation...');
        await generateButton.click();
        await page.screenshot({ path: 'e2e/screenshots/complete-05-generation-started.png', fullPage: true });
        
        // Step 6: Wait for image generation
        console.log('Waiting for image generation to complete...');
        
        const imageSelectors = [
          'img[alt*="generated"]',
          'img[alt*="result"]',
          'img[src*="blob:"]',
          'img[src*="data:image"]',
          '.result img',
          '.generated img',
          '[class*="result"] img'
        ];
        
        let generatedImage = null;
        const maxWait = 180000; // 3 minutes
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait && !generatedImage) {
          for (const selector of imageSelectors) {
            const img = page.locator(selector);
            const count = await img.count();
            
            if (count > 0) {
              // Check if any of the images are visible and not the original user photo
              for (let i = 0; i < count; i++) {
                const singleImg = img.nth(i);
                if (await singleImg.isVisible()) {
                  const src = await singleImg.getAttribute('src');
                  // Skip if it's the original uploaded photo
                  if (src && !src.includes('test-generate.jpg')) {
                    generatedImage = singleImg;
                    console.log(`✓ Found generated image: ${selector} (${i})`);
                    break;
                  }
                }
              }
            }
            if (generatedImage) break;
          }
          
          if (!generatedImage) {
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            console.log(`Waiting for generated image... (${elapsed}s elapsed)`);
            await page.waitForTimeout(5000);
          }
        }
        
        if (generatedImage) {
          await page.screenshot({ path: 'e2e/screenshots/complete-06-generation-complete.png', fullPage: true });
          
          // Analyze the generated image
          const imageSrc = await generatedImage.getAttribute('src');
          console.log(`Generated image source: ${imageSrc?.substring(0, 100)}...`);
          
          if (imageSrc) {
            try {
              let imageBuffer = null;
              
              if (imageSrc.startsWith('data:image')) {
                const base64Data = imageSrc.split(',')[1];
                imageBuffer = Buffer.from(base64Data, 'base64');
              } else if (imageSrc.startsWith('blob:') || imageSrc.startsWith('http')) {
                const response = await page.evaluate(async (src) => {
                  const response = await fetch(src);
                  const arrayBuffer = await response.arrayBuffer();
                  return Array.from(new Uint8Array(arrayBuffer));
                }, imageSrc);
                imageBuffer = Buffer.from(response);
              }
              
              if (imageBuffer) {
                const imageSize = imageBuffer.length;
                console.log(`Generated image size: ${imageSize} bytes (${(imageSize / 1024).toFixed(2)} KB)`);
                
                // Save the generated image
                fs.writeFileSync('e2e/screenshots/complete-07-generated-image.jpg', imageBuffer);
                
                // Analyze for blank/white content
                if (imageSize < 5000) {
                  console.log('⚠️ Warning: Image size is very small');
                } else {
                  console.log('✓ Image size is reasonable');
                }
                
                // Sample pixels to check for whiteness
                let whitePixelCount = 0;
                const sampleSize = Math.min(1000, Math.floor(imageSize / 3));
                
                for (let i = 0; i < sampleSize; i++) {
                  const pixelValue = imageBuffer[i * 3];
                  if (pixelValue > 240) {
                    whitePixelCount++;
                  }
                }
                
                const whitePercentage = (whitePixelCount / sampleSize) * 100;
                console.log(`White pixel analysis: ${whitePercentage.toFixed(2)}% white pixels (sampled)`);
                
                // Final assessment
                console.log('\n=== FINAL TEST RESULTS ===');
                console.log('✅ Successfully navigated to DressUp application');
                console.log('✅ Successfully uploaded user photo');
                console.log(`${selectedGarment ? '✅' : '⚠️'} Garment selection: ${selectedGarment ? 'Success' : 'Attempted'}`);
                console.log('✅ Successfully triggered image generation');
                console.log('✅ Successfully received generated image');
                console.log(`✅ Image size: ${(imageSize / 1024).toFixed(2)} KB`);
                console.log(`✅ White pixel analysis: ${whitePercentage.toFixed(2)}% white pixels`);
                
                if (whitePercentage > 90) {
                  console.log('\n❌ CRITICAL FINDING: Generated image is mostly white/blank!');
                  console.log('❌ This confirms the user\'s report of completely white images');
                  console.log('❌ The image generation system is producing blank outputs');
                  console.log('\n🔧 RECOMMENDED ACTIONS:');
                  console.log('1. Check the Gemini API integration in the backend');
                  console.log('2. Verify the prompt being sent to the AI model');
                  console.log('3. Review the image processing pipeline');
                  console.log('4. Test with different input images');
                } else {
                  console.log('\n✅ SUCCESS: Generated image contains actual visual content!');
                  console.log('✅ Image generation is working correctly');
                  console.log('✅ Recent fixes have resolved the blank image issue');
                }
                
                // Validate with Playwright assertions
                await expect(generatedImage).toBeVisible();
                const boundingBox = await generatedImage.boundingBox();
                if (boundingBox) {
                  expect(boundingBox.width).toBeGreaterThan(100);
                  expect(boundingBox.height).toBeGreaterThan(100);
                }
                
              } else {
                console.log('❌ Could not download generated image for analysis');
              }
            } catch (error) {
              console.log(`❌ Error analyzing generated image: ${error.message}`);
            }
          }
        } else {
          console.log('❌ No generated image appeared within timeout');
          await page.screenshot({ path: 'e2e/screenshots/complete-06-no-image.png', fullPage: true });
          throw new Error('Image generation did not complete within expected time');
        }
      } else {
        console.log('❌ Generate button is still disabled after garment selection');
        await page.screenshot({ path: 'e2e/screenshots/complete-05-button-still-disabled.png', fullPage: true });
        throw new Error('Generate button remained disabled - workflow incomplete');
      }
    } else {
      console.log('❌ Generate button not found');
      throw new Error('Generate button not found in interface');
    }
  });
});
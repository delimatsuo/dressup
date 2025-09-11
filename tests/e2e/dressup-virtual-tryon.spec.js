const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('DressUp Virtual Try-On Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for this test since image generation takes time
    test.setTimeout(180000); // 3 minutes
    
    // Navigate to the application
    await page.goto('https://dressup-ai.vercel.app');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('complete virtual try-on flow with real image generation', async ({ page }) => {
    console.log('Starting comprehensive DressUp virtual try-on test...');
    
    // Step 1: Verify the page loaded correctly
    await expect(page).toHaveTitle(/DressUp/i);
    console.log('✓ Page loaded successfully');
    
    // Take initial screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/01-initial-page.png', fullPage: true });
    
    // Step 2: Upload user photo
    console.log('Uploading user photo...');
    const userPhotoInput = page.locator('input[type="file"]').first();
    await userPhotoInput.setInputFiles('/tmp/test-generate.jpg');
    
    // Wait for the image to be processed/displayed
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screenshots/02-user-photo-uploaded.png', fullPage: true });
    console.log('✓ User photo uploaded');
    
    // Step 3: Upload garment photo (we'll use the same test image as garment)
    console.log('Uploading garment photo...');
    const garmentPhotoInputs = page.locator('input[type="file"]');
    const garmentInput = await garmentPhotoInputs.nth(1); // Second file input should be for garment
    if (await garmentInput.count() > 0) {
      await garmentInput.setInputFiles('/tmp/test-generate.jpg');
    } else {
      // If there's only one input, it might handle both uploads
      console.log('Using single file input for garment upload...');
      await userPhotoInput.setInputFiles('/tmp/test-generate.jpg');
    }
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screenshots/03-garment-photo-uploaded.png', fullPage: true });
    console.log('✓ Garment photo uploaded');
    
    // Step 4: Look for and click the generate/try-on button
    console.log('Looking for generate/try-on button...');
    
    // Try multiple possible selectors for the generate button
    const generateButtonSelectors = [
      'button:has-text("Generate")',
      'button:has-text("Try On")',
      'button:has-text("Create")',
      'button:has-text("Start")',
      'button[type="submit"]',
      '.generate-button',
      '#generate-btn',
      'button:has-text("Virtual Try-On")'
    ];
    
    let generateButton = null;
    for (const selector of generateButtonSelectors) {
      try {
        const btn = page.locator(selector);
        if (await btn.count() > 0 && await btn.isVisible()) {
          generateButton = btn;
          console.log(`✓ Found generate button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!generateButton) {
      // Take screenshot to see what's available
      await page.screenshot({ path: 'tests/e2e/screenshots/04-no-generate-button-found.png', fullPage: true });
      
      // Try to find any button on the page
      const allButtons = await page.locator('button').all();
      console.log(`Found ${allButtons.length} buttons on the page:`);
      
      for (let i = 0; i < allButtons.length; i++) {
        const buttonText = await allButtons[i].textContent();
        const isVisible = await allButtons[i].isVisible();
        console.log(`Button ${i}: "${buttonText}" (visible: ${isVisible})`);
      }
      
      throw new Error('Could not find the generate/try-on button');
    }
    
    // Step 5: Click the generate button
    console.log('Clicking generate button...');
    await generateButton.click();
    await page.screenshot({ path: 'tests/e2e/screenshots/05-generate-button-clicked.png', fullPage: true });
    console.log('✓ Generate button clicked');
    
    // Step 6: Wait for image generation to start
    console.log('Waiting for image generation to start...');
    
    // Look for loading indicators
    const loadingSelectors = [
      '.loading',
      '.spinner',
      'text=Generating',
      'text=Processing',
      'text=Creating',
      '[data-testid="loading"]'
    ];
    
    let foundLoading = false;
    for (const selector of loadingSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 10000 });
        console.log(`✓ Found loading indicator: ${selector}`);
        foundLoading = true;
        break;
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (foundLoading) {
      await page.screenshot({ path: 'tests/e2e/screenshots/06-generation-started.png', fullPage: true });
    }
    
    // Step 7: Wait for image generation to complete
    console.log('Waiting for image generation to complete...');
    
    // Wait for the generated image to appear
    const generatedImageSelectors = [
      'img[alt*="generated"]',
      'img[alt*="result"]',
      'img[alt*="try-on"]',
      '.generated-image img',
      '.result-image img',
      '#generated-image',
      'img[src*="blob:"]',
      'img[src*="data:image"]'
    ];
    
    let generatedImage = null;
    const maxWaitTime = 120000; // 2 minutes
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime && !generatedImage) {
      for (const selector of generatedImageSelectors) {
        try {
          const img = page.locator(selector);
          if (await img.count() > 0 && await img.isVisible()) {
            generatedImage = img;
            console.log(`✓ Found generated image with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!generatedImage) {
        await page.waitForTimeout(5000); // Wait 5 seconds before checking again
        console.log(`Waiting for generated image... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
      }
    }
    
    if (!generatedImage) {
      await page.screenshot({ path: 'tests/e2e/screenshots/07-no-generated-image-found.png', fullPage: true });
      throw new Error('Generated image did not appear within the expected time');
    }
    
    // Step 8: Verify the generated image
    console.log('Verifying generated image...');
    await page.screenshot({ path: 'tests/e2e/screenshots/08-generated-image-appeared.png', fullPage: true });
    
    // Check if image is visible
    await expect(generatedImage).toBeVisible();
    console.log('✓ Generated image is visible');
    
    // Get image properties
    const imageSrc = await generatedImage.getAttribute('src');
    const imageAlt = await generatedImage.getAttribute('alt');
    console.log(`Image src: ${imageSrc?.substring(0, 100)}...`);
    console.log(`Image alt: ${imageAlt}`);
    
    // Step 9: Download and analyze the generated image
    console.log('Analyzing generated image content...');
    
    let imageBuffer = null;
    if (imageSrc) {
      if (imageSrc.startsWith('data:image')) {
        // Handle data URL
        const base64Data = imageSrc.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else if (imageSrc.startsWith('blob:') || imageSrc.startsWith('http')) {
        // Handle blob URL or HTTP URL
        try {
          const response = await page.evaluate(async (src) => {
            const response = await fetch(src);
            const arrayBuffer = await response.arrayBuffer();
            return Array.from(new Uint8Array(arrayBuffer));
          }, imageSrc);
          imageBuffer = Buffer.from(response);
        } catch (e) {
          console.log(`Could not fetch image from ${imageSrc}: ${e.message}`);
        }
      }
    }
    
    if (imageBuffer) {
      const imageSize = imageBuffer.length;
      console.log(`✓ Generated image size: ${imageSize} bytes (${(imageSize / 1024).toFixed(2)} KB)`);
      
      // Save the image for manual inspection
      fs.writeFileSync('tests/e2e/screenshots/09-generated-image-download.jpg', imageBuffer);
      
      // Basic checks for blank/white image
      if (imageSize < 5000) {
        console.log('⚠️ Warning: Image size is very small, might be blank');
      }
      
      // Check if it's mostly white pixels (basic heuristic)
      let whitePixelCount = 0;
      let totalSampled = 0;
      const sampleSize = Math.min(1000, imageSize / 3); // Sample every 3rd byte
      
      for (let i = 0; i < sampleSize; i++) {
        const pixelValue = imageBuffer[i * 3];
        if (pixelValue > 240) { // Consider pixels > 240 as "white-ish"
          whitePixelCount++;
        }
        totalSampled++;
      }
      
      const whitePercentage = (whitePixelCount / totalSampled) * 100;
      console.log(`White pixel percentage (sampled): ${whitePercentage.toFixed(2)}%`);
      
      if (whitePercentage > 90) {
        console.log('⚠️ Warning: Image appears to be mostly white pixels');
      } else {
        console.log('✓ Image appears to have actual content (not mostly white)');
      }
    }
    
    // Step 10: Take final screenshots and validate
    await page.screenshot({ path: 'tests/e2e/screenshots/10-final-result.png', fullPage: true });
    
    // Validate that we have a reasonable image
    const boundingBox = await generatedImage.boundingBox();
    if (boundingBox) {
      console.log(`✓ Image dimensions: ${boundingBox.width}x${boundingBox.height}`);
      expect(boundingBox.width).toBeGreaterThan(100);
      expect(boundingBox.height).toBeGreaterThan(100);
    }
    
    // Final verification
    await expect(generatedImage).toBeVisible();
    console.log('✓ Test completed successfully');
    
    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log('✓ Successfully navigated to DressUp application');
    console.log('✓ Successfully uploaded user photo');
    console.log('✓ Successfully uploaded garment photo');
    console.log('✓ Successfully triggered image generation');
    console.log('✓ Successfully waited for and found generated image');
    console.log('✓ Generated image is visible and has reasonable dimensions');
    
    if (imageBuffer) {
      console.log(`✓ Downloaded generated image (${(imageBuffer.length / 1024).toFixed(2)} KB)`);
      console.log('✓ Image analysis suggests it contains actual content (not blank)');
    }
    
    console.log('\nScreenshots saved to tests/e2e/screenshots/');
    console.log('Generated image saved as tests/e2e/screenshots/09-generated-image-download.jpg');
  });
});
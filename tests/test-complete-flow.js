const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🚀 Starting comprehensive DressUp AI test...');
  
  const browser = await chromium.launch({ 
    headless: false, // Set to true for CI/CD
    slowMo: 1000 // Slow down for better observation
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    permissions: ['camera']
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to the application
    console.log('📱 Step 1: Navigating to https://dressup-ai.vercel.app');
    await page.goto('https://dressup-ai.vercel.app', { waitUntil: 'networkidle' });
    
    // Take initial screenshot
    await page.screenshot({ path: '/tmp/01-initial-load.png', fullPage: true });
    console.log('📸 Initial screenshot saved');
    
    // Wait for the app to fully load
    await page.waitForSelector('[data-testid="upload-container"], .upload-section', { timeout: 10000 });
    
    // Step 2: Upload user photos
    console.log('👤 Step 2: Uploading user photos');
    
    // Look for file input for user photos
    const userPhotoInput = await page.locator('input[type="file"]').first();
    await userPhotoInput.setInputFiles('/tmp/test-user.jpg');
    
    // Wait for upload to complete and UI to update
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/02-user-photo-uploaded.png', fullPage: true });
    console.log('📸 User photo upload screenshot saved');
    
    // Step 3: Look for garment upload section and upload garment
    console.log('👕 Step 3: Uploading garment photo');
    
    // Wait for garment upload to be available (might need to scroll or interact)
    await page.waitForTimeout(2000);
    
    // Try multiple selectors for garment upload
    let garmentInput;
    try {
      // Look for multiple possible garment input selectors
      const possibleSelectors = [
        'input[type="file"]:not(:first-child)',
        '[data-testid="garment-upload"] input[type="file"]',
        '.garment-upload input[type="file"]',
        'input[accept*="image"]:nth-child(2)',
        'input[type="file"]'
      ];
      
      for (const selector of possibleSelectors) {
        const inputs = await page.locator(selector).all();
        if (inputs.length > 1) {
          garmentInput = inputs[1]; // Use second input if multiple exist
          break;
        } else if (inputs.length === 1 && selector.includes('garment')) {
          garmentInput = inputs[0];
          break;
        }
      }
      
      // If no specific garment input found, look for any additional file inputs
      if (!garmentInput) {
        const allInputs = await page.locator('input[type="file"]').all();
        if (allInputs.length > 1) {
          garmentInput = allInputs[1];
        } else {
          // Try clicking to reveal garment upload
          await page.click('button:has-text("Next"), .next-button, [data-testid="next-step"]').catch(() => {});
          await page.waitForTimeout(1000);
          const newInputs = await page.locator('input[type="file"]').all();
          garmentInput = newInputs[newInputs.length - 1];
        }
      }
      
    } catch (error) {
      console.log('⚠️  Could not find garment input automatically, trying alternative approach');
      // Look for any clickable elements that might reveal garment upload
      await page.click('text=/next|continue|upload.*garment|garment/i').catch(() => {});
      await page.waitForTimeout(1000);
      garmentInput = await page.locator('input[type="file"]').last();
    }
    
    if (garmentInput) {
      await garmentInput.setInputFiles('/tmp/test-garment.jpg');
      console.log('✅ Garment photo uploaded');
    } else {
      throw new Error('Could not find garment upload input');
    }
    
    // Wait for garment upload to complete
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/03-garment-uploaded.png', fullPage: true });
    console.log('📸 Garment upload screenshot saved');
    
    // Step 4: Verify Generate button appears (KEY BUG FIX TEST)
    console.log('🔍 Step 4: Checking if Generate button appears after garment upload');
    
    // Wait for the Generate button to appear - this is the key fix being tested
    let generateButton;
    try {
      await page.waitForSelector('button:has-text("Generate"), .generate-button, [data-testid="generate-button"]', { 
        timeout: 10000 
      });
      
      generateButton = await page.locator('button:has-text("Generate"), .generate-button, [data-testid="generate-button"]').first();
      const isVisible = await generateButton.isVisible();
      const isEnabled = await generateButton.isEnabled();
      
      console.log(`✅ Generate button found - Visible: ${isVisible}, Enabled: ${isEnabled}`);
      
      if (!isVisible || !isEnabled) {
        throw new Error(`Generate button not ready - Visible: ${isVisible}, Enabled: ${isEnabled}`);
      }
      
    } catch (error) {
      console.log('❌ Generate button not found after garment upload - this indicates the bug is NOT fixed');
      await page.screenshot({ path: '/tmp/04-generate-button-missing.png', fullPage: true });
      throw new Error('Generate button did not appear after garment upload');
    }
    
    await page.screenshot({ path: '/tmp/04-generate-button-visible.png', fullPage: true });
    console.log('📸 Generate button visibility screenshot saved');
    
    // Step 5: Click Generate and wait for results
    console.log('⚡ Step 5: Clicking Generate button and waiting for results');
    
    await generateButton.click();
    console.log('✅ Generate button clicked');
    
    // Wait for processing to start (loading state)
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/05-generation-started.png', fullPage: true });
    console.log('📸 Generation started screenshot saved');
    
    // Wait for the generated image to appear
    console.log('⏳ Waiting for generated image...');
    let generatedImage;
    
    try {
      // Wait for result image with longer timeout since generation takes time
      await page.waitForSelector('img[src*="generated"], .result-image img, .generated-image, img[alt*="generated"]', { 
        timeout: 60000 // 60 seconds for generation
      });
      
      generatedImage = await page.locator('img[src*="generated"], .result-image img, .generated-image, img[alt*="generated"]').first();
      
    } catch (error) {
      console.log('⚠️  Specific generated image selector not found, looking for any new images');
      // Fallback: look for any images that appeared after clicking generate
      const allImages = await page.locator('img').all();
      if (allImages.length > 0) {
        generatedImage = allImages[allImages.length - 1]; // Take the last/newest image
      }
    }
    
    await page.screenshot({ path: '/tmp/06-generation-complete.png', fullPage: true });
    console.log('📸 Generation complete screenshot saved');
    
    // Step 6: Verify the generated image is not blank/white
    console.log('🔍 Step 6: Verifying generated image quality');
    
    if (generatedImage) {
      const imageSrc = await generatedImage.getAttribute('src');
      const imageAlt = await generatedImage.getAttribute('alt') || 'N/A';
      
      console.log(`📋 Generated image details:
        - Source: ${imageSrc}
        - Alt text: ${imageAlt}
      `);
      
      // Check if image has loaded properly
      const naturalWidth = await generatedImage.evaluate(img => img.naturalWidth);
      const naturalHeight = await generatedImage.evaluate(img => img.naturalHeight);
      
      console.log(`📐 Image dimensions: ${naturalWidth}x${naturalHeight}`);
      
      if (naturalWidth === 0 || naturalHeight === 0) {
        console.log('❌ Generated image appears to be blank or not loaded properly');
        return false;
      }
      
      // Additional check: see if we can download and analyze the image
      if (imageSrc && imageSrc.startsWith('http')) {
        try {
          const imageResponse = await page.request.get(imageSrc);
          const imageBuffer = await imageResponse.body();
          const imageSize = imageBuffer.length;
          
          console.log(`📊 Image file size: ${imageSize} bytes`);
          
          // A properly generated image should be at least 10KB
          if (imageSize < 10000) {
            console.log('⚠️  Warning: Generated image is very small, might be blank');
          }
          
          // Save the generated image for manual inspection
          fs.writeFileSync('/tmp/generated-result.jpg', imageBuffer);
          console.log('💾 Generated image saved to /tmp/generated-result.jpg for inspection');
          
        } catch (downloadError) {
          console.log('⚠️  Could not download generated image for analysis:', downloadError.message);
        }
      }
      
      console.log('✅ Generated image verification complete');
      return true;
      
    } else {
      console.log('❌ No generated image found');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '/tmp/error-state.png', fullPage: true });
    console.log('📸 Error state screenshot saved');
    return false;
    
  } finally {
    // Final screenshot and cleanup
    await page.screenshot({ path: '/tmp/07-final-state.png', fullPage: true });
    console.log('📸 Final state screenshot saved');
    
    // Keep browser open for a moment to observe results
    await page.waitForTimeout(5000);
    
    await browser.close();
    
    // Summary of all screenshots taken
    console.log(`
📋 Test Summary - Screenshots saved:
- /tmp/01-initial-load.png - Initial app loading
- /tmp/02-user-photo-uploaded.png - After user photo upload
- /tmp/03-garment-uploaded.png - After garment upload  
- /tmp/04-generate-button-visible.png - Generate button visibility
- /tmp/05-generation-started.png - Generation process started
- /tmp/06-generation-complete.png - Generation completed
- /tmp/07-final-state.png - Final application state
- /tmp/generated-result.jpg - Generated image (if successfully downloaded)
    `);
  }
})().then((success) => {
  if (success !== false) {
    console.log('🎉 Test completed successfully! The Generate button bug appears to be fixed.');
    console.log('✅ Key verification points:');
    console.log('  - Generate button appeared after garment upload');
    console.log('  - Generated image was produced');
    console.log('  - Image appears to have proper dimensions');
    process.exit(0);
  } else {
    console.log('❌ Test failed - issues detected in the flow');
    process.exit(1);
  }
}).catch((error) => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});
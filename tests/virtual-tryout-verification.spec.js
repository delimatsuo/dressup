const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Virtual Try-On Verification Tests', () => {
  test('should test complete virtual try-on flow with proper error handling', async ({ page }) => {
    console.log('🚀 Starting comprehensive virtual try-on verification test...');
    
    let consoleErrors = [];
    let networkErrors = [];
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('❌ Console error:', msg.text());
      }
    });
    
    // Capture network errors
    page.on('requestfailed', request => {
      networkErrors.push(`${request.method()} ${request.url()} - ${request.failure().errorText}`);
      console.log('🌐 Network error:', `${request.method()} ${request.url()} - ${request.failure().errorText}`);
    });

    // Step 1: Navigate to the application
    console.log('📍 Step 1: Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'tests/screenshots/verification-initial-state.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot taken: initial state');

    // Step 2: Verify the page loads correctly
    console.log('✅ Step 2: Verifying page loads correctly');
    await expect(page).toHaveTitle(/DressUp/);
    
    // Look for upload sections - be more specific with selectors
    const uploadSections = page.locator('input[type="file"]');
    const uploadCount = await uploadSections.count();
    console.log(`📁 Found ${uploadCount} file upload inputs`);
    
    // Step 3: Upload test images
    console.log('📸 Step 3: Uploading test images...');
    
    // Create or use existing test images
    const testImagesDir = path.join(__dirname, 'test-images');
    const userImagePath = path.join(testImagesDir, 'user-front.png');
    const garmentImagePath = path.join(testImagesDir, 'garment-front.png');
    
    // Verify test images exist
    if (!fs.existsSync(userImagePath)) {
      throw new Error(`Test image not found: ${userImagePath}`);
    }
    if (!fs.existsSync(garmentImagePath)) {
      throw new Error(`Test image not found: ${garmentImagePath}`);
    }
    
    console.log('📤 Uploading user photo...');
    // Look for specific user photo upload input
    const userPhotoInputs = page.locator('input[type="file"]').filter({
      has: page.locator('xpath=following-sibling::*[contains(text(), "person") or contains(text(), "user") or contains(text(), "User")]')
    });
    
    // If that doesn't work, try finding inputs by their position or data attributes
    let userPhotoInput = userPhotoInputs.first();
    if (await userPhotoInputs.count() === 0) {
      // Fallback to first file input
      userPhotoInput = page.locator('input[type="file"]').first();
    }
    
    await userPhotoInput.setInputFiles(userImagePath);
    console.log('✅ User photo uploaded');
    
    console.log('👔 Uploading garment photo...');
    // Look for garment photo upload input
    const garmentPhotoInputs = page.locator('input[type="file"]').filter({
      has: page.locator('xpath=following-sibling::*[contains(text(), "garment") or contains(text(), "clothing") or contains(text(), "Garment")]')
    });
    
    let garmentPhotoInput = garmentPhotoInputs.first();
    if (await garmentPhotoInputs.count() === 0) {
      // Fallback to second file input or any available
      const allInputs = page.locator('input[type="file"]');
      const inputCount = await allInputs.count();
      if (inputCount > 1) {
        garmentPhotoInput = allInputs.nth(1);
      } else {
        // If only one input, it might handle both uploads
        garmentPhotoInput = allInputs.first();
      }
    }
    
    await garmentPhotoInput.setInputFiles(garmentImagePath);
    console.log('✅ Garment photo uploaded');
    
    // Take screenshot after uploads
    await page.screenshot({ 
      path: 'tests/screenshots/verification-after-uploads.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot taken: after uploads');

    // Step 4: Click "Process Multi-Photo Outfit" button
    console.log('🎯 Step 4: Looking for process button...');
    
    // Try multiple selectors for the process button
    let processButton = page.locator('button:has-text("Process Multi-Photo Outfit")');
    
    if (await processButton.count() === 0) {
      processButton = page.locator('button:has-text("Process")');
    }
    if (await processButton.count() === 0) {
      processButton = page.locator('button:has-text("Generate")');
    }
    if (await processButton.count() === 0) {
      processButton = page.locator('button[type="submit"]');
    }
    if (await processButton.count() === 0) {
      processButton = page.locator('button').filter({ hasText: /process|generate|create|try.on/i });
    }
    
    const buttonCount = await processButton.count();
    console.log(`🔘 Found ${buttonCount} potential process buttons`);
    
    if (buttonCount === 0) {
      throw new Error('No process button found on the page');
    }
    
    // Wait for button to be enabled and click it
    await expect(processButton.first()).toBeEnabled({ timeout: 10000 });
    await processButton.first().click();
    console.log('✅ Process button clicked');
    
    // Take screenshot after clicking process
    await page.screenshot({ 
      path: 'tests/screenshots/verification-processing-started.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot taken: processing started');

    // Step 5: Wait for processing to complete
    console.log('⏳ Step 5: Waiting for processing to complete...');
    
    // Look for various indicators of processing completion
    const processingIndicators = [
      page.locator('text=Processing').first(),
      page.locator('text=Generating').first(),
      page.locator('text=Loading').first(),
      page.locator('.loading').first(),
      page.locator('[role="progressbar"]').first()
    ];
    
    // Wait for any processing indicator to appear
    let processingStarted = false;
    for (const indicator of processingIndicators) {
      try {
        await indicator.waitFor({ timeout: 2000 });
        processingStarted = true;
        console.log('⏳ Processing indicator found');
        break;
      } catch (e) {
        // Continue to next indicator
      }
    }
    
    // Wait for processing to complete (indicators to disappear)
    if (processingStarted) {
      for (const indicator of processingIndicators) {
        try {
          await indicator.waitFor({ state: 'detached', timeout: 30000 });
          console.log('✅ Processing indicator disappeared');
        } catch (e) {
          // Indicator might not have been visible
        }
      }
    } else {
      // If no processing indicator found, wait a bit for processing
      console.log('⏳ No processing indicator found, waiting 10 seconds...');
      await page.waitForTimeout(10000);
    }

    // Step 6: Verify results
    console.log('🔍 Step 6: Verifying results...');
    
    // Take screenshot of final state
    await page.screenshot({ 
      path: 'tests/screenshots/verification-final-results.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot taken: final results');
    
    // Check for generated images or errors
    const generatedImages = page.locator('img').filter({ hasNotText: 'original' });
    const errorMessages = page.locator('text=/error|failed|unable/i');
    const fallbackImages = page.locator('img[src*="data:image"], img[alt*="original"], img[alt*="fallback"]');
    
    const imageCount = await generatedImages.count();
    const errorCount = await errorMessages.count();
    const fallbackCount = await fallbackImages.count();
    
    console.log(`🖼️  Found ${imageCount} potential generated images`);
    console.log(`❌ Found ${errorCount} error messages`);
    console.log(`🔄 Found ${fallbackCount} potential fallback images`);
    
    // The critical test: MUST show either real generated images OR errors, NEVER fallbacks
    let testResult = 'UNKNOWN';
    let resultMessage = '';
    
    if (errorCount > 0) {
      // Errors are acceptable - means the system properly failed
      testResult = 'PASS';
      resultMessage = 'System properly showed error messages instead of fallback images';
      console.log('✅ PASS: Error handling working correctly');
      
      // Log the error messages
      const errorTexts = await errorMessages.allTextContents();
      console.log('Error messages found:', errorTexts);
      
    } else if (imageCount > 0 && fallbackCount === 0) {
      // Generated images without fallbacks - this is ideal
      testResult = 'PASS';
      resultMessage = 'System generated real AI images without showing fallbacks';
      console.log('✅ PASS: Real generated images displayed');
      
    } else if (fallbackCount > 0) {
      // Fallback images detected - this is what we DON'T want
      testResult = 'FAIL';
      resultMessage = 'System incorrectly displayed fallback/original images instead of generated images or errors';
      console.log('❌ FAIL: Fallback images detected');
      
    } else {
      // No clear result found
      testResult = 'UNCLEAR';
      resultMessage = 'Could not determine if generated images or errors were displayed';
      console.log('⚠️  UNCLEAR: No clear success or error indicators found');
    }
    
    // Step 7: Check console errors
    console.log('🔍 Step 7: Checking for console errors...');
    
    if (consoleErrors.length > 0) {
      console.log('❌ Console errors found:');
      consoleErrors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✅ No console errors found');
    }
    
    if (networkErrors.length > 0) {
      console.log('🌐 Network errors found:');
      networkErrors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✅ No network errors found');
    }
    
    // Final test report
    console.log('\n' + '='.repeat(50));
    console.log('📊 VIRTUAL TRY-ON VERIFICATION TEST REPORT');
    console.log('='.repeat(50));
    console.log(`Result: ${testResult}`);
    console.log(`Message: ${resultMessage}`);
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Network Errors: ${networkErrors.length}`);
    console.log(`Generated Images: ${imageCount}`);
    console.log(`Error Messages: ${errorCount}`);
    console.log(`Fallback Images: ${fallbackCount}`);
    console.log('='.repeat(50));
    
    // Write detailed test results to file
    const testResults = {
      timestamp: new Date().toISOString(),
      result: testResult,
      message: resultMessage,
      counts: {
        consoleErrors: consoleErrors.length,
        networkErrors: networkErrors.length,
        generatedImages: imageCount,
        errorMessages: errorCount,
        fallbackImages: fallbackCount
      },
      consoleErrors,
      networkErrors,
      screenshots: [
        'tests/screenshots/verification-initial-state.png',
        'tests/screenshots/verification-after-uploads.png',
        'tests/screenshots/verification-processing-started.png',
        'tests/screenshots/verification-final-results.png'
      ]
    };
    
    fs.writeFileSync(
      'tests/verification-test-results.json', 
      JSON.stringify(testResults, null, 2)
    );
    
    // Assert based on the main requirement: NO fallback images
    if (testResult === 'FAIL') {
      throw new Error(`TEST FAILED: ${resultMessage}`);
    }
    
    // The test passes if we either get real generated images OR proper error handling
    // But it must NOT show fallback images
    expect(fallbackCount).toBe(0);
    
    console.log('🎉 Virtual try-on verification test completed successfully!');
  });
});
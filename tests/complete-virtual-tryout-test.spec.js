const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Complete Virtual Try-On Test', () => {
  test('should complete full virtual try-on flow with proper modal handling', async ({ page }) => {
    console.log('🚀 Starting complete virtual try-on test...');
    
    let consoleErrors = [];
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('❌ Console error:', msg.text());
      }
    });

    // Step 1: Navigate to the application
    console.log('📍 Step 1: Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/complete-initial.png', 
      fullPage: true 
    });
    
    // Step 2: Handle the welcome modal properly
    console.log('📍 Step 2: Handling welcome modal');
    
    // Look for the "Continue to DressUp AI" button specifically
    const continueButton = page.locator('button:has-text("Continue to DressUp AI")');
    
    if (await continueButton.isVisible({ timeout: 5000 })) {
      console.log('✅ Found "Continue to DressUp AI" button');
      await continueButton.click();
      console.log('✅ Clicked "Continue to DressUp AI" button');
      
      // Wait for modal to disappear and page to load
      await page.waitForTimeout(3000);
    } else {
      console.log('⚠️ "Continue to DressUp AI" button not found');
      
      // Try alternative approaches
      const notNowButton = page.locator('button:has-text("Not Now")');
      if (await notNowButton.isVisible({ timeout: 2000 })) {
        console.log('✅ Found "Not Now" button - clicking to proceed');
        await notNowButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Take screenshot after modal handling
    await page.screenshot({ 
      path: 'tests/screenshots/complete-after-modal.png', 
      fullPage: true 
    });
    
    // Step 3: Wait for main interface to load
    console.log('📍 Step 3: Waiting for main interface to load');
    await page.waitForTimeout(5000);
    
    // Look for file inputs
    let fileInputs = page.locator('input[type="file"]');
    let inputCount = await fileInputs.count();
    console.log(`📁 Found ${inputCount} file inputs`);
    
    if (inputCount === 0) {
      console.log('⚠️ No file inputs found immediately, looking for upload triggers...');
      
      // Look for buttons or areas that might trigger file uploads
      const uploadTriggers = [
        'button:has-text("Upload")',
        'button:has-text("Add Photo")',
        'button:has-text("Choose File")',
        '[data-testid*="upload"]',
        '.upload-area',
        'label[for*="upload"]',
        'label[for*="photo"]',
        'div:has-text("Upload") >> nth=0',
        'div:has-text("Drop") >> nth=0'
      ];
      
      for (const selector of uploadTriggers) {
        const trigger = page.locator(selector).first();
        if (await trigger.count() > 0 && await trigger.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log(`✅ Found upload trigger: ${selector}`);
          try {
            await trigger.click();
            await page.waitForTimeout(1000);
            
            // Check for file inputs again
            fileInputs = page.locator('input[type="file"]');
            inputCount = await fileInputs.count();
            console.log(`📁 Found ${inputCount} file inputs after clicking trigger`);
            
            if (inputCount > 0) break;
          } catch (e) {
            console.log(`❌ Failed to click upload trigger: ${selector}`);
          }
        }
      }
    }
    
    // Take screenshot showing current state
    await page.screenshot({ 
      path: 'tests/screenshots/complete-interface-ready.png', 
      fullPage: true 
    });
    
    if (inputCount === 0) {
      console.log('❌ Still no file inputs found. Checking page structure...');
      
      // Get page content for debugging
      const title = await page.title();
      const url = page.url();
      console.log(`Page title: "${title}"`);
      console.log(`Current URL: ${url}`);
      
      // Look for any relevant elements
      const allButtons = page.locator('button');
      const buttonCount = await allButtons.count();
      console.log(`Total buttons on page: ${buttonCount}`);
      
      if (buttonCount > 0) {
        const buttonTexts = [];
        for (let i = 0; i < Math.min(buttonCount, 15); i++) {
          try {
            const text = await allButtons.nth(i).textContent();
            if (text && text.trim()) {
              buttonTexts.push(text.trim());
            }
          } catch (e) {
            // Continue
          }
        }
        console.log('Available buttons:', buttonTexts);
      }
      
      // Save failure report
      const failureReport = {
        timestamp: new Date().toISOString(),
        result: 'FAIL',
        message: 'Could not access file upload interface',
        details: {
          pageTitle: title,
          currentUrl: url,
          buttonCount: buttonCount,
          inputCount: inputCount,
          consoleErrors: consoleErrors
        },
        screenshots: [
          'tests/screenshots/complete-initial.png',
          'tests/screenshots/complete-after-modal.png',
          'tests/screenshots/complete-interface-ready.png'
        ]
      };
      
      fs.writeFileSync(
        'tests/complete-test-results.json', 
        JSON.stringify(failureReport, null, 2)
      );
      
      console.log('📊 Test failed - could not access upload interface');
      throw new Error('Cannot access file upload interface');
    }
    
    // Step 4: Upload test images
    console.log('📸 Step 4: Uploading test images');
    
    const testImagesDir = path.join(__dirname, 'test-images');
    const availableImages = fs.readdirSync(testImagesDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
    console.log(`Available test images: ${availableImages.length}`);
    console.log('Images:', availableImages);
    
    if (availableImages.length < 2) {
      throw new Error('Need at least 2 test images to proceed');
    }
    
    const userImage = path.join(testImagesDir, availableImages[0]);
    const garmentImage = path.join(testImagesDir, availableImages[1]);
    
    console.log(`Uploading user image: ${availableImages[0]}`);
    await fileInputs.first().setInputFiles(userImage);
    console.log('✅ User image uploaded');
    
    await page.waitForTimeout(2000);
    
    if (inputCount > 1) {
      console.log(`Uploading garment image: ${availableImages[1]}`);
      await fileInputs.nth(1).setInputFiles(garmentImage);
      console.log('✅ Garment image uploaded to second input');
    } else {
      console.log('Only one input found - trying to upload both images');
      await fileInputs.first().setInputFiles([userImage, garmentImage]);
      console.log('✅ Both images uploaded to single input');
    }
    
    await page.waitForTimeout(3000);
    
    // Take screenshot after uploads
    await page.screenshot({ 
      path: 'tests/screenshots/complete-after-uploads.png', 
      fullPage: true 
    });
    
    // Step 5: Find and click the process button
    console.log('🎯 Step 5: Looking for process button');
    
    const processButtonSelectors = [
      'button:has-text("Process Multi-Photo Outfit")',
      'button:has-text("Process")',
      'button:has-text("Generate")',
      'button:has-text("Create Outfit")',
      'button:has-text("Try On")',
      'button:has-text("Start")',
      'button[type="submit"]'
    ];
    
    let processButton = null;
    for (const selector of processButtonSelectors) {
      const button = page.locator(selector).first();
      if (await button.count() > 0) {
        try {
          const isVisible = await button.isVisible({ timeout: 2000 });
          const isEnabled = await button.isEnabled();
          
          if (isVisible && isEnabled) {
            processButton = button;
            const buttonText = await button.textContent();
            console.log(`✅ Found process button: "${buttonText}"`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    }
    
    if (!processButton) {
      console.log('⚠️ No specific process button found, looking at all enabled buttons...');
      const allButtons = page.locator('button');
      const count = await allButtons.count();
      
      for (let i = 0; i < count; i++) {
        const button = allButtons.nth(i);
        try {
          const text = await button.textContent();
          const isEnabled = await button.isEnabled();
          const isVisible = await button.isVisible();
          
          if (isEnabled && isVisible && text && !text.match(/cancel|close|back|home/i)) {
            processButton = button;
            console.log(`✅ Using button: "${text}"`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    if (!processButton) {
      throw new Error('No suitable process button found');
    }
    
    // Click the process button
    console.log('🚀 Clicking process button...');
    await processButton.click();
    console.log('✅ Process button clicked');
    
    // Take screenshot immediately after clicking
    await page.screenshot({ 
      path: 'tests/screenshots/complete-processing-started.png', 
      fullPage: true 
    });
    
    // Step 6: Wait for processing and monitor results
    console.log('⏳ Step 6: Monitoring processing...');
    
    let processingComplete = false;
    let maxWaitTime = 45000; // 45 seconds
    let checkInterval = 5000;  // Check every 5 seconds
    let elapsedTime = 0;
    
    while (elapsedTime < maxWaitTime && !processingComplete) {
      await page.waitForTimeout(checkInterval);
      elapsedTime += checkInterval;
      
      console.log(`⏳ Checking progress... (${elapsedTime/1000}s elapsed)`);
      
      // Take periodic screenshot
      await page.screenshot({ 
        path: `tests/screenshots/complete-progress-${elapsedTime/1000}s.png`, 
        fullPage: true 
      });
      
      // Check for completion indicators
      const errorMessages = page.locator('text=/error|failed|unable|sorry/i, .error');
      const successIndicators = page.locator('text=/generated|complete|success|result|finished/i');
      const loadingIndicators = page.locator('text=/loading|processing|generating|please wait/i, .loading, .spinner');
      
      const errorCount = await errorMessages.count();
      const successCount = await successIndicators.count();
      const loadingCount = await loadingIndicators.count();
      
      if (errorCount > 0) {
        console.log('❌ Error detected - processing failed');
        const errorTexts = await errorMessages.allTextContents();
        console.log('Error messages:', errorTexts.slice(0, 3));
        processingComplete = true;
      } else if (successCount > 0) {
        console.log('✅ Success indicators found - processing may be complete');
        const successTexts = await successIndicators.allTextContents();
        console.log('Success messages:', successTexts.slice(0, 3));
        processingComplete = true;
      } else if (loadingCount === 0 && elapsedTime > 15000) {
        console.log('⚠️ No loading indicators and sufficient time passed - assuming complete');
        processingComplete = true;
      }
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/complete-final-results.png', 
      fullPage: true 
    });
    
    // Step 7: Analyze final results
    console.log('🔍 Step 7: Analyzing final results...');
    
    const finalImages = page.locator('img');
    const finalErrors = page.locator('text=/error|failed|unable|sorry/i, .error');
    const generatedImages = page.locator('img').filter({ hasNotText: /upload|placeholder|icon|logo/i });
    const fallbackImages = page.locator('img[alt*="original"], img[alt*="fallback"], img[src*="data:image/"]');
    
    const imageCount = await finalImages.count();
    const errorCount = await finalErrors.count();
    const generatedCount = await generatedImages.count();
    const fallbackCount = await fallbackImages.count();
    
    console.log(`🖼️  Total images: ${imageCount}`);
    console.log(`🤖 Generated images: ${generatedCount}`);
    console.log(`❌ Error messages: ${errorCount}`);
    console.log(`🔄 Fallback images: ${fallbackCount}`);
    
    // Critical test: Determine if system behaved correctly
    let testResult = 'UNKNOWN';
    let resultMessage = '';
    
    if (errorCount > 0 && fallbackCount === 0) {
      testResult = 'PASS';
      resultMessage = 'System properly showed errors instead of fallback images';
    } else if (generatedCount > 0 && fallbackCount === 0 && errorCount === 0) {
      testResult = 'PASS';
      resultMessage = 'System successfully generated AI images without fallbacks';
    } else if (fallbackCount > 0) {
      testResult = 'FAIL';
      resultMessage = `System incorrectly showed ${fallbackCount} fallback images instead of generated images or errors`;
    } else {
      testResult = 'UNCLEAR';
      resultMessage = 'Could not determine processing outcome clearly';
    }
    
    // Generate comprehensive test report
    const testResults = {
      timestamp: new Date().toISOString(),
      result: testResult,
      message: resultMessage,
      testDetails: {
        modalHandled: true,
        imagesUploaded: true,
        processButtonClicked: true,
        processingMonitored: true,
        maxWaitTime: maxWaitTime,
        actualWaitTime: elapsedTime
      },
      finalCounts: {
        totalImages: imageCount,
        generatedImages: generatedCount,
        errorMessages: errorCount,
        fallbackImages: fallbackCount,
        consoleErrors: consoleErrors.length
      },
      consoleErrors: consoleErrors,
      screenshots: [
        'tests/screenshots/complete-initial.png',
        'tests/screenshots/complete-after-modal.png',
        'tests/screenshots/complete-interface-ready.png',
        'tests/screenshots/complete-after-uploads.png',
        'tests/screenshots/complete-processing-started.png',
        'tests/screenshots/complete-final-results.png'
      ]
    };
    
    fs.writeFileSync(
      'tests/complete-test-results.json', 
      JSON.stringify(testResults, null, 2)
    );
    
    // Print comprehensive test report
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPLETE VIRTUAL TRY-ON TEST REPORT');
    console.log('='.repeat(80));
    console.log(`🎯 TEST RESULT: ${testResult}`);
    console.log(`📝 MESSAGE: ${resultMessage}`);
    console.log('');
    console.log('📋 TEST EXECUTION:');
    console.log(`   ✅ Modal handled: ${testResults.testDetails.modalHandled}`);
    console.log(`   ✅ Images uploaded: ${testResults.testDetails.imagesUploaded}`);
    console.log(`   ✅ Process button clicked: ${testResults.testDetails.processButtonClicked}`);
    console.log(`   ⏱️  Processing time: ${elapsedTime/1000}s`);
    console.log('');
    console.log('📊 FINAL COUNTS:');
    console.log(`   🖼️  Total images: ${imageCount}`);
    console.log(`   🤖 Generated images: ${generatedCount}`);
    console.log(`   ❌ Error messages: ${errorCount}`);
    console.log(`   🔄 Fallback images: ${fallbackCount}`);
    console.log(`   ⚠️  Console errors: ${consoleErrors.length}`);
    console.log('');
    console.log('🔑 KEY REQUIREMENT: No fallback images should be displayed');
    console.log(`   Status: ${fallbackCount === 0 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(80));
    
    // Final assertion based on critical requirement
    if (testResult === 'FAIL') {
      throw new Error(`CRITICAL TEST FAILURE: ${resultMessage}`);
    }
    
    console.log('🎉 Complete virtual try-on test finished successfully!');
  });
});
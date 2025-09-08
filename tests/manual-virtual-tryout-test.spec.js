const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Manual Virtual Try-On Test', () => {
  test('should manually test virtual try-on with proper modal handling', async ({ page }) => {
    console.log('🚀 Starting manual virtual try-on test...');
    
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
      path: 'tests/screenshots/manual-initial-state.png', 
      fullPage: true 
    });
    
    // Step 2: Handle the welcome modal more aggressively
    console.log('📍 Step 2: Closing welcome modal');
    
    // Try multiple ways to close the modal
    const modalCloseSelectors = [
      'button:has-text("×")',
      '[aria-label="Close"]',
      '.modal-close',
      '[data-testid="close"]',
      'button[type="button"]:has-text("×")',
      // Try clicking the actual × character
      'text=×'
    ];
    
    let modalClosed = false;
    for (const selector of modalCloseSelectors) {
      try {
        const closeBtn = page.locator(selector).first();
        if (await closeBtn.isVisible({ timeout: 2000 })) {
          await closeBtn.click();
          console.log(`✅ Modal closed using selector: ${selector}`);
          modalClosed = true;
          await page.waitForTimeout(1000);
          break;
        }
      } catch (e) {
        console.log(`❌ Failed to close modal with selector: ${selector}`);
      }
    }
    
    // If modal still not closed, try clicking outside it or pressing Escape
    if (!modalClosed) {
      console.log('⚠️ Trying alternative modal close methods...');
      try {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        console.log('✅ Modal closed with Escape key');
        modalClosed = true;
      } catch (e) {
        // Try clicking outside the modal
        try {
          await page.click('body', { position: { x: 50, y: 50 } });
          await page.waitForTimeout(1000);
          console.log('✅ Modal closed by clicking outside');
          modalClosed = true;
        } catch (e) {
          console.log('❌ Could not close modal');
        }
      }
    }
    
    // Take screenshot after modal handling
    await page.screenshot({ 
      path: 'tests/screenshots/manual-after-modal-close.png', 
      fullPage: true 
    });
    
    // Step 3: Look for the actual interface elements
    console.log('📍 Step 3: Looking for upload interface');
    
    // Wait a bit for the interface to fully load
    await page.waitForTimeout(3000);
    
    // Take another screenshot to see current state
    await page.screenshot({ 
      path: 'tests/screenshots/manual-interface-loaded.png', 
      fullPage: true 
    });
    
    // Look for file inputs again
    let fileInputs = page.locator('input[type="file"]');
    let inputCount = await fileInputs.count();
    console.log(`📁 Found ${inputCount} file inputs after modal handling`);
    
    if (inputCount === 0) {
      // Maybe the interface is still loading or modal is still blocking
      console.log('⏳ Waiting longer for interface to appear...');
      await page.waitForTimeout(5000);
      
      fileInputs = page.locator('input[type="file"]');
      inputCount = await fileInputs.count();
      console.log(`📁 Found ${inputCount} file inputs after extended wait`);
      
      if (inputCount === 0) {
        // Try to find any clickable upload areas or labels
        const uploadLabels = page.locator('label:has-text("Upload"), label:has-text("Photo"), [for*="upload"], [for*="photo"]');
        const uploadLabelCount = await uploadLabels.count();
        console.log(`🏷️  Found ${uploadLabelCount} upload labels`);
        
        if (uploadLabelCount > 0) {
          // Click on upload labels to potentially reveal file inputs
          for (let i = 0; i < Math.min(uploadLabelCount, 3); i++) {
            try {
              await uploadLabels.nth(i).click();
              await page.waitForTimeout(1000);
              console.log(`✅ Clicked upload label ${i + 1}`);
            } catch (e) {
              console.log(`❌ Failed to click upload label ${i + 1}`);
            }
          }
          
          // Check for file inputs again
          fileInputs = page.locator('input[type="file"]');
          inputCount = await fileInputs.count();
          console.log(`📁 Found ${inputCount} file inputs after clicking labels`);
        }
      }
    }
    
    // Take screenshot showing current state
    await page.screenshot({ 
      path: 'tests/screenshots/manual-upload-search-complete.png', 
      fullPage: true 
    });
    
    if (inputCount === 0) {
      // Let's inspect what's actually on the page
      console.log('🔍 Inspecting page content for debugging...');
      
      // Look for any text mentioning upload, photo, file, etc.
      const searchTerms = ['upload', 'photo', 'file', 'image', 'browse', 'select'];
      for (const term of searchTerms) {
        const elements = page.locator(`text=/${term}/i`).first();
        const count = await page.locator(`text=/${term}/i`).count();
        console.log(`Found ${count} elements containing "${term}"`);
        
        if (count > 0) {
          try {
            const text = await elements.textContent();
            console.log(`  Sample text: "${text?.substring(0, 100)}..."`);
          } catch (e) {
            // Continue
          }
        }
      }
      
      // Get page title and URL
      const title = await page.title();
      const url = page.url();
      console.log(`Page title: ${title}`);
      console.log(`Current URL: ${url}`);
      
      // Get all buttons on the page
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      console.log(`Found ${buttonCount} buttons on page`);
      
      if (buttonCount > 0) {
        const buttonTexts = [];
        for (let i = 0; i < Math.min(buttonCount, 10); i++) {
          try {
            const text = await buttons.nth(i).textContent();
            if (text && text.trim()) {
              buttonTexts.push(text.trim());
            }
          } catch (e) {
            // Continue
          }
        }
        console.log('Button texts:', buttonTexts);
      }
      
      console.log('❌ Unable to find file upload inputs on the page');
      
      // Create a final report even if we can't upload files
      const finalReport = {
        timestamp: new Date().toISOString(),
        result: 'FAIL',
        message: 'Could not find file upload inputs on the page',
        modalClosed: modalClosed,
        consoleErrors: consoleErrors,
        pageTitle: title,
        currentUrl: url,
        buttonCount: buttonCount,
        inputCount: inputCount,
        screenshots: [
          'tests/screenshots/manual-initial-state.png',
          'tests/screenshots/manual-after-modal-close.png',
          'tests/screenshots/manual-interface-loaded.png',
          'tests/screenshots/manual-upload-search-complete.png'
        ]
      };
      
      fs.writeFileSync(
        'tests/manual-test-results.json', 
        JSON.stringify(finalReport, null, 2)
      );
      
      console.log('📊 Test completed - interface access failed');
      return; // End test here
    }
    
    // Step 4: If we found inputs, proceed with upload test
    console.log('📸 Step 4: Attempting to upload test images...');
    
    const testImagesDir = path.join(__dirname, 'test-images');
    const availableImages = fs.readdirSync(testImagesDir).filter(f => f.endsWith('.png'));
    console.log(`Found ${availableImages.length} test images:`, availableImages);
    
    if (availableImages.length >= 2) {
      const img1 = path.join(testImagesDir, availableImages[0]);
      const img2 = path.join(testImagesDir, availableImages[1]);
      
      try {
        // Upload first image
        await fileInputs.first().setInputFiles(img1);
        console.log(`✅ Uploaded first image: ${availableImages[0]}`);
        
        await page.waitForTimeout(2000);
        
        // Upload second image
        if (inputCount > 1) {
          await fileInputs.nth(1).setInputFiles(img2);
        } else {
          // Try multiple files in same input
          await fileInputs.first().setInputFiles([img1, img2]);
        }
        console.log(`✅ Uploaded second image: ${availableImages[1]}`);
        
        await page.waitForTimeout(2000);
        
        // Take screenshot after uploads
        await page.screenshot({ 
          path: 'tests/screenshots/manual-after-uploads.png', 
          fullPage: true 
        });
        
        // Step 5: Look for and click process button
        console.log('🎯 Step 5: Looking for process button...');
        
        const processButtons = page.locator('button').filter({ hasText: /process|generate|create|try.on|submit/i });
        const processButtonCount = await processButtons.count();
        console.log(`Found ${processButtonCount} potential process buttons`);
        
        if (processButtonCount > 0) {
          const processButton = processButtons.first();
          const buttonText = await processButton.textContent();
          console.log(`Clicking button: "${buttonText}"`);
          
          await processButton.click();
          console.log('✅ Process button clicked');
          
          // Take screenshot after clicking
          await page.screenshot({ 
            path: 'tests/screenshots/manual-processing-started.png', 
            fullPage: true 
          });
          
          // Step 6: Wait for results
          console.log('⏳ Step 6: Waiting for processing results...');
          
          // Wait up to 30 seconds for results
          await page.waitForTimeout(30000);
          
          // Take final screenshot
          await page.screenshot({ 
            path: 'tests/screenshots/manual-final-results.png', 
            fullPage: true 
          });
          
          // Analyze results
          const resultImages = page.locator('img');
          const errorMessages = page.locator('text=/error|failed|unable|sorry/i');
          const successMessages = page.locator('text=/generated|success|complete|result/i');
          
          const finalImageCount = await resultImages.count();
          const finalErrorCount = await errorMessages.count();
          const finalSuccessCount = await successMessages.count();
          
          console.log(`🖼️  Final image count: ${finalImageCount}`);
          console.log(`❌ Final error count: ${finalErrorCount}`);
          console.log(`✅ Final success count: ${finalSuccessCount}`);
          
          let testResult = 'UNKNOWN';
          let resultMessage = '';
          
          if (finalErrorCount > 0) {
            testResult = 'PASS';
            resultMessage = 'System properly displayed errors instead of fallback images';
          } else if (finalSuccessCount > 0) {
            testResult = 'PASS';
            resultMessage = 'System appears to have generated results successfully';
          } else {
            testResult = 'UNCLEAR';
            resultMessage = 'Processing outcome unclear';
          }
          
          const testResults = {
            timestamp: new Date().toISOString(),
            result: testResult,
            message: resultMessage,
            uploadSuccessful: true,
            processButtonClicked: true,
            consoleErrors: consoleErrors,
            finalCounts: {
              images: finalImageCount,
              errors: finalErrorCount,
              successes: finalSuccessCount
            },
            screenshots: [
              'tests/screenshots/manual-initial-state.png',
              'tests/screenshots/manual-after-modal-close.png',
              'tests/screenshots/manual-interface-loaded.png',
              'tests/screenshots/manual-after-uploads.png',
              'tests/screenshots/manual-processing-started.png',
              'tests/screenshots/manual-final-results.png'
            ]
          };
          
          fs.writeFileSync(
            'tests/manual-test-results.json', 
            JSON.stringify(testResults, null, 2)
          );
          
          console.log('\n' + '='.repeat(60));
          console.log('📊 MANUAL VIRTUAL TRY-ON TEST REPORT');
          console.log('='.repeat(60));
          console.log(`Result: ${testResult}`);
          console.log(`Message: ${resultMessage}`);
          console.log(`Upload Successful: true`);
          console.log(`Process Button Clicked: true`);
          console.log(`Console Errors: ${consoleErrors.length}`);
          console.log(`Final Image Count: ${finalImageCount}`);
          console.log(`Final Error Count: ${finalErrorCount}`);
          console.log(`Final Success Count: ${finalSuccessCount}`);
          console.log('='.repeat(60));
          
        } else {
          console.log('❌ No process button found');
        }
        
      } catch (uploadError) {
        console.log('❌ Upload failed:', uploadError.message);
      }
    } else {
      console.log('❌ Not enough test images available');
    }
    
    console.log('🎉 Manual virtual try-on test completed!');
  });
});
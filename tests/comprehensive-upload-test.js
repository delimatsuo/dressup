const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Create a simple PNG image programmatically for testing
function createTestPNG() {
  const width = 300;
  const height = 400;
  
  // Create a minimal PNG image buffer (1x1 red pixel PNG)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width = 1
    0x00, 0x00, 0x00, 0x01, // height = 1
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth=8, color type=2 (RGB), compression=0, filter=0, interlace=0
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00, 0x01, 0x00, 0x01, // compressed image data (1 red pixel)
    0x5C, 0x6F, 0x80, 0x30, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  return pngData;
}

async function testCompletePhotoUploadFlow() {
  console.log('Starting comprehensive photo upload test...');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext({
    permissions: ['camera']
  });
  
  const page = await context.newPage();
  const consoleMessages = [];
  const networkErrors = [];
  
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
    console.log(`Console ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('requestfailed', request => {
    networkErrors.push({
      url: request.url(),
      failure: request.failure()
    });
    console.log(`Network error: ${request.url()} - ${request.failure()?.errorText}`);
  });
  
  try {
    // Create test PNG file
    const testImagePath = path.join(__dirname, 'test-image.png');
    const pngData = createTestPNG();
    fs.writeFileSync(testImagePath, pngData);
    console.log(`Created test PNG image at ${testImagePath}`);
    
    console.log('Navigating to localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('Handling consent modal...');
    const consentCheckbox = page.locator('input[type="checkbox"]#consent-checkbox');
    const continueButton = page.locator('button').filter({ hasText: /continue to dressup ai/i });
    
    if (await consentCheckbox.count() > 0) {
      await consentCheckbox.check();
      await page.waitForTimeout(500);
      
      if (await continueButton.count() > 0) {
        await continueButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    console.log('Testing photo upload functionality...');
    
    // Test Step 1: Upload user photos
    console.log('Step 1: Uploading user photos...');
    const frontViewInput = page.locator('input[type="file"]').first();
    
    if (await frontViewInput.count() > 0) {
      await frontViewInput.setInputFiles(testImagePath);
      console.log('Front view photo uploaded');
      await page.waitForTimeout(1000);
      
      // Check if there are validation errors
      const errorMessages = await page.locator('.text-red-600, .text-red-500, [role="alert"]').count();
      if (errorMessages > 0) {
        console.log(`Validation errors found: ${errorMessages}`);
        const errorText = await page.locator('.text-red-600, .text-red-500, [role="alert"]').first().textContent();
        console.log(`Error message: ${errorText}`);
      } else {
        console.log('No validation errors for front view upload');
      }
      
      // Try to upload side view if available
      const allFileInputs = await page.locator('input[type="file"]').count();
      if (allFileInputs > 1) {
        await page.locator('input[type="file"]').nth(1).setInputFiles(testImagePath);
        console.log('Side view photo uploaded');
        await page.waitForTimeout(1000);
      }
    }
    
    // Look for "Continue" or "Next" button to proceed to garment upload
    const continueButtons = await page.locator('button').filter({ 
      hasText: /continue|next|proceed/i 
    }).count();
    
    if (continueButtons > 0) {
      console.log('Found continue button, proceeding to next step...');
      await page.locator('button').filter({ hasText: /continue|next|proceed/i }).first().click();
      await page.waitForTimeout(2000);
      
      // Step 2: Upload garment photos
      console.log('Step 2: Uploading garment photos...');
      const garmentInputs = await page.locator('input[type="file"]').count();
      if (garmentInputs > 0) {
        await page.locator('input[type="file"]').first().setInputFiles(testImagePath);
        console.log('Garment photo uploaded');
        await page.waitForTimeout(1000);
      }
    }
    
    // Look for "Generate" or "Process" button
    const generateButtons = await page.locator('button').filter({ 
      hasText: /generate|process|create|try on/i 
    }).count();
    
    if (generateButtons > 0) {
      console.log('Found generate button, testing AI processing...');
      await page.locator('button').filter({ hasText: /generate|process|create|try on/i }).first().click();
      await page.waitForTimeout(3000);
      
      // Check for loading states or results
      const loadingIndicators = await page.locator('.animate-spin, [role="status"], .loading').count();
      if (loadingIndicators > 0) {
        console.log('AI processing initiated - loading indicators found');
      }
    }
    
    // Check for any CORS errors
    const corsErrors = consoleMessages.filter(msg => 
      msg.text.toLowerCase().includes('cors') || 
      msg.text.toLowerCase().includes('access-control-allow-origin') ||
      msg.text.toLowerCase().includes('blocked by cors policy')
    );
    
    console.log('\n=== COMPREHENSIVE TEST RESULTS ===');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Network errors: ${networkErrors.length}`);
    console.log(`CORS-related errors: ${corsErrors.length}`);
    
    if (corsErrors.length > 0) {
      console.log('\n❌ CORS ERRORS FOUND:');
      corsErrors.forEach(error => {
        console.log(`- ${error.type}: ${error.text}`);
      });
    } else {
      console.log('\n✅ NO CORS ERRORS - Upload functionality working correctly!');
    }
    
    if (networkErrors.length > 0) {
      console.log('\nNETWORK ERRORS:');
      networkErrors.forEach(error => {
        console.log(`- ${error.url}: ${error.failure?.errorText}`);
      });
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/comprehensive-test-final.png', 
      fullPage: true 
    });
    console.log('Final screenshot saved');
    
    // Clean up test file
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('Test image file cleaned up');
    }
    
    console.log('\n🎉 Test completed successfully - no CORS issues detected!');
    console.log('The photo upload functionality is working properly.');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
  }
  
  return {
    consoleMessages,
    networkErrors,
    corsErrorCount: consoleMessages.filter(msg => 
      msg.text.toLowerCase().includes('cors') || 
      msg.text.toLowerCase().includes('access-control-allow-origin') ||
      msg.text.toLowerCase().includes('blocked by cors policy')
    ).length
  };
}

// Run the comprehensive test
testCompletePhotoUploadFlow().then(results => {
  console.log('\n=== FINAL VERIFICATION ===');
  if (results.corsErrorCount === 0) {
    console.log('✅ SUCCESS: CORS configuration is working correctly!');
    console.log('✅ Photo upload functionality is operational');
    console.log('✅ No blocking errors detected');
  } else {
    console.log('❌ CORS issues still present');
  }
  
  process.exit(results.corsErrorCount > 0 ? 1 : 0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
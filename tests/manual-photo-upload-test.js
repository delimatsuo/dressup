const { chromium } = require('playwright');
const path = require('path');

async function testPhotoUpload() {
  console.log('Starting photo upload test...');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext({
    permissions: ['camera']
  });
  
  // Listen for console messages to catch CORS errors
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
    console.log('Navigating to localhost:3000...');
    await page.goto('http://localhost:3000');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    console.log('Page loaded, looking for consent modal and photo upload interface...');
    
    // Handle consent modal first
    const consentCheckbox = page.locator('input[type="checkbox"]#consent-checkbox');
    const continueButton = page.locator('button').filter({ hasText: /continue to dressup ai/i });
    
    if (await consentCheckbox.count() > 0) {
      console.log('Found consent modal, completing consent process...');
      
      // Check the consent checkbox
      await consentCheckbox.check();
      await page.waitForTimeout(500);
      
      // Click continue button
      if (await continueButton.count() > 0) {
        console.log('Clicking Continue to DressUp AI...');
        await continueButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Look for file input or photo upload button after consent
    let fileInputs = await page.locator('input[type="file"]').count();
    console.log(`Found ${fileInputs} file input(s)`);
    
    if (fileInputs === 0) {
      // Look for "Get Started", "Upload Photo", "Try Now" type buttons
      const startButtons = await page.locator('button, div, a').filter({ 
        hasText: /get started|upload|photo|image|try now|start|begin/i 
      }).count();
      console.log(`Found ${startButtons} start/upload-related button(s)`);
      
      if (startButtons > 0) {
        console.log('Clicking start/upload button...');
        await page.locator('button, div, a').filter({ 
          hasText: /get started|upload|photo|image|try now|start|begin/i 
        }).first().click();
        await page.waitForTimeout(2000);
        
        // Check for file inputs again after clicking
        fileInputs = await page.locator('input[type="file"]').count();
        console.log(`After clicking start button, found ${fileInputs} file input(s)`);
      }
    }
    
    // Check for file inputs again after potential UI changes
    const fileInputsAfter = await page.locator('input[type="file"]').count();
    console.log(`After interaction, found ${fileInputsAfter} file input(s)`);
    
    if (fileInputsAfter > 0) {
      console.log('Found file input, attempting upload...');
      
      // Create a test image file path - use any existing file as test
      const testImagePath = path.join(__dirname, '..', 'public', 'next.svg');
      
      try {
        await page.locator('input[type="file"]').first().setInputFiles(testImagePath);
        console.log('File selected successfully');
        
        // Wait for any processing
        await page.waitForTimeout(3000);
        
        // Look for submit or generate button
        const submitButton = await page.locator('button').filter({ hasText: /submit|generate|process|analyze/i }).first();
        if (await submitButton.count() > 0) {
          console.log('Found submit button, clicking...');
          await submitButton.click();
          
          // Wait for upload/processing
          await page.waitForTimeout(5000);
        }
        
      } catch (fileError) {
        console.log(`File input error: ${fileError.message}`);
      }
    }
    
    // Check for any CORS errors in console
    const corsErrors = consoleMessages.filter(msg => 
      msg.text.toLowerCase().includes('cors') || 
      msg.text.toLowerCase().includes('access-control-allow-origin') ||
      msg.text.toLowerCase().includes('blocked by cors policy')
    );
    
    console.log('\n=== TEST RESULTS ===');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Network errors: ${networkErrors.length}`);
    console.log(`CORS-related errors: ${corsErrors.length}`);
    
    if (corsErrors.length > 0) {
      console.log('\nCORS ERRORS FOUND:');
      corsErrors.forEach(error => {
        console.log(`- ${error.type}: ${error.text}`);
      });
    }
    
    if (networkErrors.length > 0) {
      console.log('\nNETWORK ERRORS:');
      networkErrors.forEach(error => {
        console.log(`- ${error.url}: ${error.failure?.errorText}`);
      });
    }
    
    // Take a screenshot for manual verification
    await page.screenshot({ path: 'test-results/upload-test-screenshot.png', fullPage: true });
    console.log('Screenshot saved to test-results/upload-test-screenshot.png');
    
    // Keep browser open for manual inspection
    console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Test error:', error);
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

// Run the test
testPhotoUpload().then(results => {
  console.log('\n=== FINAL RESULTS ===');
  console.log(`CORS errors detected: ${results.corsErrorCount}`);
  console.log('Test completed');
  process.exit(results.corsErrorCount > 0 ? 1 : 0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
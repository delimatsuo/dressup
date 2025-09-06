const { chromium } = require('playwright');
const path = require('path');

async function testDressUpApp() {
  let browser;
  let page;
  const results = {
    url: 'https://dressup-9hpqcnu89-deli-matsuos-projects.vercel.app',
    timestamp: new Date().toISOString(),
    tests: [],
    screenshots: [],
    consoleErrors: [],
    networkErrors: [],
    overallStatus: 'UNKNOWN'
  };

  try {
    console.log('Starting DressUp application test...');
    console.log('Target URL:', results.url);
    
    // Launch browser
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    
    page = await context.newPage();
    
    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        results.consoleErrors.push({
          type: 'console',
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
        console.log('Console Error:', msg.text());
      }
    });
    
    // Capture network errors
    page.on('response', (response) => {
      if (response.status() >= 400) {
        results.networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date().toISOString()
        });
        console.log(`Network Error: ${response.status()} ${response.statusText()} - ${response.url()}`);
      }
    });

    // Test 1: Page loads successfully
    console.log('\n1. Testing page load...');
    try {
      const response = await page.goto(results.url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      const pageLoadTest = {
        name: 'Page Load',
        status: response && response.status() < 400 ? 'PASS' : 'FAIL',
        details: `HTTP Status: ${response?.status() || 'Unknown'}`,
        timestamp: new Date().toISOString()
      };
      
      if (response && response.status() >= 400) {
        pageLoadTest.details += ` - ${response.statusText()}`;
      }
      
      results.tests.push(pageLoadTest);
      console.log(`Page load: ${pageLoadTest.status} - ${pageLoadTest.details}`);
      
    } catch (error) {
      results.tests.push({
        name: 'Page Load',
        status: 'FAIL',
        details: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      console.log('Page load failed:', error.message);
    }

    // Wait a bit for page to fully load
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    const mainScreenshot = path.join(__dirname, 'screenshots', 'main-page.png');
    await page.screenshot({ path: mainScreenshot, fullPage: true });
    results.screenshots.push('main-page.png');
    console.log('Screenshot saved:', mainScreenshot);

    // Test 2: Main UI elements visibility
    console.log('\n2. Testing UI elements visibility...');
    const uiElements = [
      { name: 'Header', selector: 'h1, header, [data-testid="header"]' },
      { name: 'Instructions', selector: 'p, .instructions, [data-testid="instructions"]' },
      { name: 'Upload Interface', selector: 'input[type="file"], .upload, [data-testid="upload"]' },
      { name: 'Body Element', selector: 'body' },
      { name: 'Main Content', selector: 'main, #app, .app, .container' }
    ];

    for (const element of uiElements) {
      try {
        const isVisible = await page.isVisible(element.selector);
        const exists = await page.locator(element.selector).count() > 0;
        
        const elementTest = {
          name: `UI Element - ${element.name}`,
          status: (exists && isVisible) ? 'PASS' : 'WARN',
          details: exists ? (isVisible ? 'Visible' : 'Exists but not visible') : 'Element not found',
          selector: element.selector,
          timestamp: new Date().toISOString()
        };
        
        results.tests.push(elementTest);
        console.log(`${element.name}: ${elementTest.status} - ${elementTest.details}`);
        
      } catch (error) {
        results.tests.push({
          name: `UI Element - ${element.name}`,
          status: 'FAIL',
          details: `Error checking element: ${error.message}`,
          selector: element.selector,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Test 3: Session management
    console.log('\n3. Testing session management...');
    try {
      // Look for session-related elements
      const sessionSelectors = [
        '.session-timer',
        '[data-testid="session-timer"]',
        '.timer',
        '.countdown',
        '.session'
      ];
      
      let sessionFound = false;
      let sessionDetails = '';
      
      for (const selector of sessionSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          sessionFound = true;
          const isVisible = await page.isVisible(selector);
          sessionDetails += `Found ${selector} (${isVisible ? 'visible' : 'hidden'}); `;
        }
      }
      
      // Check for session-related text content
      const bodyText = await page.textContent('body');
      const hasSessionText = /session|timer|countdown|expire/i.test(bodyText || '');
      
      const sessionTest = {
        name: 'Session Management',
        status: (sessionFound || hasSessionText) ? 'PASS' : 'WARN',
        details: sessionFound ? sessionDetails : (hasSessionText ? 'Session text found in content' : 'No session elements detected'),
        timestamp: new Date().toISOString()
      };
      
      results.tests.push(sessionTest);
      console.log(`Session management: ${sessionTest.status} - ${sessionTest.details}`);
      
    } catch (error) {
      results.tests.push({
        name: 'Session Management',
        status: 'FAIL',
        details: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test 4: Photo upload interface
    console.log('\n4. Testing photo upload interface...');
    try {
      const fileInputs = await page.locator('input[type="file"]').count();
      const uploadButtons = await page.locator('button:has-text("upload"), .upload-btn, [data-testid*="upload"]').count();
      const dropzones = await page.locator('.dropzone, [data-testid="dropzone"], .drop-area').count();
      
      const uploadTest = {
        name: 'Photo Upload Interface',
        status: (fileInputs > 0 || uploadButtons > 0 || dropzones > 0) ? 'PASS' : 'WARN',
        details: `File inputs: ${fileInputs}, Upload buttons: ${uploadButtons}, Drop zones: ${dropzones}`,
        timestamp: new Date().toISOString()
      };
      
      results.tests.push(uploadTest);
      console.log(`Upload interface: ${uploadTest.status} - ${uploadTest.details}`);
      
    } catch (error) {
      results.tests.push({
        name: 'Photo Upload Interface',
        status: 'FAIL',
        details: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test 5: Firebase configuration
    console.log('\n5. Testing Firebase configuration...');
    try {
      // Check for Firebase-related elements in the page
      const firebaseCheck = await page.evaluate(() => {
        // Check for Firebase in global scope
        const hasFirebase = typeof window.firebase !== 'undefined';
        const hasFirebaseApp = typeof window.firebase?.app !== 'undefined';
        
        // Check for Firebase config in script tags or data attributes
        const scripts = Array.from(document.querySelectorAll('script'));
        const hasFirebaseScript = scripts.some(script => 
          script.src?.includes('firebase') || 
          script.textContent?.includes('firebase') ||
          script.textContent?.includes('initializeApp')
        );
        
        // Check for Firebase errors in console (this won't catch them, but we can look for error divs)
        const errorElements = Array.from(document.querySelectorAll('.error, .firebase-error, [data-testid*="error"]'));
        const hasFirebaseError = errorElements.some(el => 
          el.textContent?.toLowerCase().includes('firebase')
        );
        
        return {
          hasFirebase,
          hasFirebaseApp,
          hasFirebaseScript,
          hasFirebaseError,
          userAgent: navigator.userAgent,
          url: window.location.href
        };
      });
      
      const firebaseTest = {
        name: 'Firebase Configuration',
        status: firebaseCheck.hasFirebaseScript ? 'PASS' : 'WARN',
        details: `Firebase script: ${firebaseCheck.hasFirebaseScript}, Firebase object: ${firebaseCheck.hasFirebase}, Firebase app: ${firebaseCheck.hasFirebaseApp}, Errors: ${firebaseCheck.hasFirebaseError}`,
        timestamp: new Date().toISOString()
      };
      
      results.tests.push(firebaseTest);
      console.log(`Firebase config: ${firebaseTest.status} - ${firebaseTest.details}`);
      
    } catch (error) {
      results.tests.push({
        name: 'Firebase Configuration',
        status: 'FAIL',
        details: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test 6: General functionality check
    console.log('\n6. Testing general functionality...');
    try {
      // Check if page is interactive
      const title = await page.title();
      const bodyText = await page.textContent('body');
      const hasContent = bodyText && bodyText.trim().length > 0;
      
      // Try to interact with clickable elements
      const clickableElements = await page.locator('button, a, input, [role="button"]').count();
      
      const functionalityTest = {
        name: 'General Functionality',
        status: (hasContent && clickableElements > 0) ? 'PASS' : 'WARN',
        details: `Title: "${title}", Content length: ${bodyText?.length || 0}, Clickable elements: ${clickableElements}`,
        timestamp: new Date().toISOString()
      };
      
      results.tests.push(functionalityTest);
      console.log(`General functionality: ${functionalityTest.status} - ${functionalityTest.details}`);
      
    } catch (error) {
      results.tests.push({
        name: 'General Functionality',
        status: 'FAIL',
        details: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    // Take final screenshot
    const finalScreenshot = path.join(__dirname, 'screenshots', 'final-state.png');
    await page.screenshot({ path: finalScreenshot, fullPage: true });
    results.screenshots.push('final-state.png');
    
  } catch (error) {
    console.error('Test execution error:', error);
    results.tests.push({
      name: 'Test Execution',
      status: 'FAIL',
      details: `Critical error: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Determine overall status
  const failCount = results.tests.filter(t => t.status === 'FAIL').length;
  const warnCount = results.tests.filter(t => t.status === 'WARN').length;
  const passCount = results.tests.filter(t => t.status === 'PASS').length;
  
  if (failCount > 0) {
    results.overallStatus = 'FAIL';
  } else if (warnCount > 0) {
    results.overallStatus = 'WARN';
  } else if (passCount > 0) {
    results.overallStatus = 'PASS';
  }

  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('DRESSUP APPLICATION TEST REPORT');
  console.log('='.repeat(60));
  console.log(`URL: ${results.url}`);
  console.log(`Overall Status: ${results.overallStatus}`);
  console.log(`Tests: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`);
  console.log(`Console Errors: ${results.consoleErrors.length}`);
  console.log(`Network Errors: ${results.networkErrors.length}`);
  console.log(`Screenshots: ${results.screenshots.length}`);
  
  console.log('\nDETAILED RESULTS:');
  results.tests.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}: ${test.status}`);
    console.log(`   ${test.details}`);
    if (test.selector) {
      console.log(`   Selector: ${test.selector}`);
    }
  });
  
  if (results.consoleErrors.length > 0) {
    console.log('\nCONSOLE ERRORS:');
    results.consoleErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.message}`);
    });
  }
  
  if (results.networkErrors.length > 0) {
    console.log('\nNETWORK ERRORS:');
    results.networkErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.status} ${error.statusText} - ${error.url}`);
    });
  }

  // Save results to file
  const fs = require('fs');
  const resultsPath = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${resultsPath}`);
  
  return results;
}

// Run the test
testDressUpApp().catch(console.error);
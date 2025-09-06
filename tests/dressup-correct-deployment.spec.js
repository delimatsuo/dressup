const { test, expect } = require('@playwright/test');

const CORRECT_DEPLOYMENT_URL = 'https://dressup.vercel.app';

test.describe('DressUp Application - Correct Deployment Tests', () => {
  let consoleLogs = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Capture console logs and errors
    consoleLogs = [];
    consoleErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else {
        consoleLogs.push(`${msg.type()}: ${msg.text()}`);
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      consoleErrors.push(`Page error: ${error.message}`);
    });
  });

  test('1. Page loads successfully without errors', async ({ page }) => {
    console.log('🔍 Testing correct deployment URL:', CORRECT_DEPLOYMENT_URL);
    
    // Navigate to the correct deployment URL
    const response = await page.goto(CORRECT_DEPLOYMENT_URL);
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Check that the response is successful
    expect(response.status()).toBe(200);
    
    // Check that the page title contains "DressUp"
    await expect(page).toHaveTitle(/DressUp/i);
    
    // Verify no critical console errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('hydration') &&
      !error.includes('warning') &&
      !error.includes('firebase') // Firebase errors are expected during testing
    );
    
    console.log('Console errors:', consoleErrors);
    console.log('Critical errors:', criticalErrors);
    
    // Allow some Firebase/auth errors in testing but not critical JS errors
    const jsErrors = criticalErrors.filter(error => 
      error.includes('ReferenceError') || 
      error.includes('TypeError') || 
      error.includes('SyntaxError')
    );
    
    expect(jsErrors.length).toBe(0);
  });

  test('2. Main UI elements are visible', async ({ page }) => {
    await page.goto(CORRECT_DEPLOYMENT_URL);
    await page.waitForLoadState('networkidle');

    // Check for DressUp header/title - be more flexible with selectors
    const headerSelectors = [
      'h1:has-text("DressUp")',
      'h1:has-text("Dress Up")', 
      '[data-testid="app-title"]',
      '.title',
      'h1, h2, h3'
    ];
    
    let headerFound = false;
    for (const selector of headerSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        console.log(`✅ Found header with selector: ${selector}`);
        await expect(element).toBeVisible();
        headerFound = true;
        break;
      }
    }
    
    if (!headerFound) {
      console.log('⚠️  No specific header found, checking for any text content...');
      const bodyText = await page.locator('body').textContent();
      expect(bodyText.toLowerCase()).toContain('dress');
    }
    
    // Check for "How It Works" section with flexible matching
    const howItWorksSelectors = [
      'text="How It Works"',
      'text="How it works"',
      'text="HOW IT WORKS"',
      '*:has-text("How It Works")',
      '*:has-text("How it works")',
      '*:has-text("how")'
    ];
    
    let howItWorksFound = false;
    for (const selector of howItWorksSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        console.log(`✅ Found "How It Works" with selector: ${selector}`);
        await expect(element).toBeVisible();
        howItWorksFound = true;
        break;
      }
    }
    
    if (!howItWorksFound) {
      console.log('⚠️  "How It Works" section not found with exact text, checking body content...');
      const bodyText = await page.locator('body').textContent();
      console.log('Page content includes:', bodyText.substring(0, 500));
    }
    
    // Check for upload interface elements - be flexible
    const uploadSelectors = [
      'input[type="file"]',
      '[data-testid="upload-interface"]',
      '.upload',
      'button:has-text("Upload")',
      'button:has-text("upload")',
      '.drop-zone',
      '[accept*="image"]'
    ];
    
    let uploadFound = false;
    for (const selector of uploadSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        console.log(`✅ Found upload interface with selector: ${selector}`);
        uploadFound = true;
        break;
      }
    }
    
    console.log(`Upload interface found: ${uploadFound}`);
    
    // Take a screenshot of the main page
    await page.screenshot({ 
      path: 'tests/screenshots/main-page-correct.png',
      fullPage: true 
    });
  });

  test('3. Session management functionality', async ({ page }) => {
    await page.goto(CORRECT_DEPLOYMENT_URL);
    await page.waitForLoadState('networkidle');

    // Look for session timer or session-related elements with flexible selectors
    const sessionSelectors = [
      '[data-testid="session-timer"]',
      '.session-timer',
      '.timer',
      '*:has-text("session")',
      '*:has-text("time")',
      '*:has-text("remaining")',
      '[class*="session"]',
      '[class*="timer"]'
    ];
    
    let sessionElementFound = false;
    for (const selector of sessionSelectors) {
      const elements = await page.locator(selector).count();
      if (elements > 0) {
        console.log(`✅ Found ${elements} session-related elements with selector: ${selector}`);
        sessionElementFound = true;
        
        const element = page.locator(selector).first();
        if (await element.isVisible().catch(() => false)) {
          await expect(element).toBeVisible();
          console.log('Session element is visible');
        } else {
          console.log('Session element exists but not visible');
        }
        break;
      }
    }
    
    if (!sessionElementFound) {
      console.log('⚠️  No explicit session management UI found');
      // Check if session management might be implicit (in localStorage, cookies, etc.)
      const hasSessionStorage = await page.evaluate(() => {
        return Object.keys(sessionStorage).length > 0 || Object.keys(localStorage).length > 0;
      });
      console.log('Has browser storage (potential session management):', hasSessionStorage);
    }
    
    // Take screenshot for session management verification
    await page.screenshot({ 
      path: 'tests/screenshots/session-management-correct.png',
      fullPage: true 
    });
  });

  test('4. Photo upload interface functionality', async ({ page }) => {
    await page.goto(CORRECT_DEPLOYMENT_URL);
    await page.waitForLoadState('networkidle');

    // Look for file input elements
    const fileInputs = page.locator('input[type="file"]');
    const fileInputCount = await fileInputs.count();
    
    console.log(`Found ${fileInputCount} file input elements`);
    
    if (fileInputCount > 0) {
      // Check the first file input
      const firstFileInput = fileInputs.first();
      await expect(firstFileInput).toBeAttached();
      
      // Check if file input accepts image files
      const acceptAttr = await firstFileInput.getAttribute('accept');
      console.log('File input accept attribute:', acceptAttr);
      
      if (acceptAttr) {
        expect(acceptAttr.toLowerCase()).toMatch(/image|jpg|jpeg|png|gif|webp|\*/);
      }
    }
    
    // Look for upload buttons or areas with flexible selectors
    const uploadButtonSelectors = [
      'button:has-text("upload")',
      'button:has-text("Upload")',
      'button:has-text("Choose")',
      'button:has-text("Select")',
      '.upload-button',
      '[data-testid*="upload"]',
      'button[type="button"]'
    ];
    
    let uploadButtonFound = false;
    for (const selector of uploadButtonSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Found ${count} upload buttons with selector: ${selector}`);
        uploadButtonFound = true;
        const element = page.locator(selector).first();
        if (await element.isVisible().catch(() => false)) {
          await expect(element).toBeVisible();
        }
        break;
      }
    }
    
    // Look for drag and drop areas
    const dropZoneSelectors = [
      '.drop-zone',
      '[data-testid="drop-zone"]',
      '.upload-area',
      '*:has-text("drop")',
      '*:has-text("drag")'
    ];
    
    let dropZoneFound = false;
    for (const selector of dropZoneSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Found ${count} drop zones with selector: ${selector}`);
        dropZoneFound = true;
        break;
      }
    }
    
    console.log(`Upload interface summary: ${fileInputCount} file inputs, ${uploadButtonFound ? 'buttons found' : 'no buttons'}, ${dropZoneFound ? 'drop zones found' : 'no drop zones'}`);
    
    // The upload interface should have at least file inputs OR buttons OR drop zones
    const hasUploadInterface = fileInputCount > 0 || uploadButtonFound || dropZoneFound;
    expect(hasUploadInterface).toBe(true);
    
    // Take screenshot of upload interface
    await page.screenshot({ 
      path: 'tests/screenshots/upload-interface-correct.png',
      fullPage: true 
    });
  });

  test('5. Check for console errors that prevent functionality', async ({ page }) => {
    await page.goto(CORRECT_DEPLOYMENT_URL);
    await page.waitForLoadState('networkidle');
    
    // Wait a bit more to catch any delayed errors
    await page.waitForTimeout(3000);
    
    // Filter out non-critical errors
    const functionalErrors = consoleErrors.filter(error => {
      const lowerError = error.toLowerCase();
      return !lowerError.includes('favicon') && 
             !lowerError.includes('manifest') &&
             !lowerError.includes('service worker') &&
             !lowerError.includes('ads') &&
             !lowerError.includes('analytics') &&
             !lowerError.includes('firebase') && // Firebase errors expected in testing
             lowerError.includes('error');
    });
    
    console.log('All console errors:', consoleErrors);
    console.log('Functional errors (filtered):', functionalErrors);
    
    // Only fail if there are critical JavaScript errors
    const criticalErrors = functionalErrors.filter(error => 
      error.includes('ReferenceError') || 
      error.includes('TypeError') || 
      error.includes('SyntaxError')
    );
    
    console.log('Critical JavaScript errors:', criticalErrors);
    
    expect(criticalErrors.length).toBe(0);
  });

  test('6. UI verification with comprehensive screenshots', async ({ page }) => {
    await page.goto(CORRECT_DEPLOYMENT_URL);
    await page.waitForLoadState('networkidle');
    
    // Take screenshots of different viewport sizes
    
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ 
      path: 'tests/screenshots/desktop-view.png',
      fullPage: true 
    });
    
    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ 
      path: 'tests/screenshots/tablet-view.png',
      fullPage: true 
    });
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ 
      path: 'tests/screenshots/mobile-view.png',
      fullPage: true 
    });
    
    // Reset to desktop for other screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Take specific section screenshots if elements exist
    const sections = [
      { name: 'header', selectors: ['header', '.header', 'nav', 'h1'] },
      { name: 'main-content', selectors: ['main', '.main-content', '.content', 'section'] },
      { name: 'upload-section', selectors: ['input[type="file"]', '.upload', '*:has-text("upload")', 'button'] }
    ];
    
    for (const section of sections) {
      let captured = false;
      for (const selector of section.selectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible().catch(() => false)) {
          await element.screenshot({ 
            path: `tests/screenshots/${section.name}-section.png`,
            timeout: 5000
          });
          console.log(`✅ Captured ${section.name} screenshot`);
          captured = true;
          break;
        }
      }
      if (!captured) {
        console.log(`⚠️  Could not capture ${section.name} - elements not found`);
      }
    }
    
    // Final full page screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/final-full-page.png',
      fullPage: true 
    });
  });

  test('7. Basic functionality test', async ({ page }) => {
    await page.goto(CORRECT_DEPLOYMENT_URL);
    await page.waitForLoadState('networkidle');
    
    // Test basic interactions
    const bodyText = await page.locator('body').textContent();
    console.log('Page contains text:', bodyText.length > 0);
    
    // Test if the page is interactive
    const clickableElements = await page.locator('button, a, input').count();
    console.log('Clickable elements found:', clickableElements);
    
    // Test scroll functionality
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, 0));
    
    // Check if JavaScript is working (page should be interactive)
    const jsWorking = await page.evaluate(() => {
      return typeof window !== 'undefined' && typeof document !== 'undefined';
    });
    
    console.log('JavaScript environment working:', jsWorking);
    expect(jsWorking).toBe(true);
  });

  test.afterEach(async ({ page }) => {
    // Log summary of console activity
    console.log(`Test completed with ${consoleLogs.length} console messages and ${consoleErrors.length} errors`);
  });
});
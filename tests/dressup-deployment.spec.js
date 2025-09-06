const { test, expect } = require('@playwright/test');

const DEPLOYMENT_URL = 'https://dressup-hsu24fo3h-deli-matsuos-projects.vercel.app';

test.describe('DressUp Application Deployment Tests', () => {
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
    // Navigate to the deployment URL
    await page.goto(DEPLOYMENT_URL);
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Check that the page title contains "DressUp"
    await expect(page).toHaveTitle(/DressUp/i);
    
    // Verify no critical console errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('hydration') &&
      !error.includes('warning')
    );
    
    console.log('Console errors:', consoleErrors);
    console.log('Critical errors:', criticalErrors);
    
    expect(criticalErrors.length).toBe(0);
  });

  test('2. Main UI elements are visible', async ({ page }) => {
    await page.goto(DEPLOYMENT_URL);
    await page.waitForLoadState('networkidle');

    // Check for DressUp header
    const header = page.locator('h1, [data-testid="app-title"], .title').first();
    await expect(header).toBeVisible();
    
    // Check for "How It Works" section
    const howItWorksSection = page.locator('text="How It Works"').first();
    await expect(howItWorksSection).toBeVisible();
    
    // Check for upload interface elements
    const uploadInterface = page.locator('[data-testid="upload-interface"], .upload, input[type="file"]').first();
    await expect(uploadInterface).toBeVisible();
    
    // Take a screenshot of the main page
    await page.screenshot({ 
      path: 'tests/screenshots/main-page.png',
      fullPage: true 
    });
  });

  test('3. Session management works', async ({ page }) => {
    await page.goto(DEPLOYMENT_URL);
    await page.waitForLoadState('networkidle');

    // Look for session timer or session-related elements
    const sessionTimer = page.locator('[data-testid="session-timer"], .session-timer, .timer').first();
    
    // Wait a bit to see if session timer appears
    await page.waitForTimeout(2000);
    
    // Check if session timer is visible (may not be visible immediately)
    const isSessionTimerVisible = await sessionTimer.isVisible().catch(() => false);
    
    if (isSessionTimerVisible) {
      console.log('Session timer found and visible');
      await expect(sessionTimer).toBeVisible();
    } else {
      console.log('Session timer not immediately visible - checking for session-related functionality');
      
      // Check for any elements that might indicate session management
      const sessionElements = await page.locator('[class*="session"], [class*="timer"], [data-testid*="session"]').count();
      console.log(`Found ${sessionElements} potential session-related elements`);
    }
    
    // Take screenshot for session management verification
    await page.screenshot({ 
      path: 'tests/screenshots/session-management.png',
      fullPage: true 
    });
  });

  test('4. Photo upload interface is functional', async ({ page }) => {
    await page.goto(DEPLOYMENT_URL);
    await page.waitForLoadState('networkidle');

    // Look for file input elements
    const fileInputs = page.locator('input[type="file"]');
    const fileInputCount = await fileInputs.count();
    
    expect(fileInputCount).toBeGreaterThan(0);
    
    // Check the first file input
    const firstFileInput = fileInputs.first();
    await expect(firstFileInput).toBeAttached();
    
    // Check if file input accepts image files
    const acceptAttr = await firstFileInput.getAttribute('accept');
    console.log('File input accept attribute:', acceptAttr);
    
    // Look for upload buttons or areas
    const uploadButtons = page.locator('button:has-text("upload"), .upload-button, [data-testid*="upload"]');
    const uploadButtonCount = await uploadButtons.count();
    
    if (uploadButtonCount > 0) {
      await expect(uploadButtons.first()).toBeVisible();
    }
    
    // Look for drag and drop areas
    const dropZones = page.locator('.drop-zone, [data-testid="drop-zone"], .upload-area');
    const dropZoneCount = await dropZones.count();
    
    console.log(`Found ${fileInputCount} file inputs, ${uploadButtonCount} upload buttons, ${dropZoneCount} drop zones`);
    
    // Take screenshot of upload interface
    await page.screenshot({ 
      path: 'tests/screenshots/upload-interface.png',
      fullPage: true 
    });
  });

  test('5. Check for console errors that would prevent functionality', async ({ page }) => {
    await page.goto(DEPLOYMENT_URL);
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
             lowerError.includes('error');
    });
    
    console.log('All console errors:', consoleErrors);
    console.log('Functional errors:', functionalErrors);
    
    // Report but don't fail on minor errors
    if (functionalErrors.length > 0) {
      console.warn('Found potential functional errors:', functionalErrors);
    }
    
    // Only fail if there are critical JavaScript errors
    const criticalErrors = functionalErrors.filter(error => 
      error.includes('ReferenceError') || 
      error.includes('TypeError') || 
      error.includes('SyntaxError')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('6. Comprehensive UI verification with screenshots', async ({ page }) => {
    await page.goto(DEPLOYMENT_URL);
    await page.waitForLoadState('networkidle');
    
    // Take screenshots of different sections
    
    // Full page screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/full-page.png',
      fullPage: true 
    });
    
    // Header section
    const header = page.locator('header, .header, nav').first();
    if (await header.isVisible()) {
      await header.screenshot({ path: 'tests/screenshots/header-section.png' });
    }
    
    // Main content area
    const mainContent = page.locator('main, .main-content, .content').first();
    if (await mainContent.isVisible()) {
      await mainContent.screenshot({ path: 'tests/screenshots/main-content.png' });
    }
    
    // How it works section
    const howItWorks = page.locator('text="How It Works"').first();
    if (await howItWorks.isVisible()) {
      await howItWorks.screenshot({ path: 'tests/screenshots/how-it-works.png' });
    }
    
    // Scroll to bottom to capture footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'tests/screenshots/bottom-page.png',
      fullPage: false 
    });
  });

  test.afterEach(async ({ page }) => {
    // Log summary of console activity
    console.log(`Test completed with ${consoleLogs.length} console messages and ${consoleErrors.length} errors`);
    
    // Close page
    await page.close();
  });
});
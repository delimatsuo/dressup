const { test, expect } = require('@playwright/test');

const DEPLOYMENT_URL = 'https://dressup-hsu24fo3h-deli-matsuos-projects.vercel.app';

test.describe('DressUp Deployment Diagnostic', () => {
  test('Diagnostic: Check deployment status and content', async ({ page }) => {
    console.log('🔍 Starting diagnostic test for:', DEPLOYMENT_URL);
    
    // Capture all responses
    const responses = [];
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    });

    // Navigate to the deployment URL
    const response = await page.goto(DEPLOYMENT_URL);
    
    console.log('📡 Initial response status:', response.status());
    console.log('📡 Initial response URL:', response.url());
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Get page title
    const title = await page.title();
    console.log('📋 Page title:', title);
    
    // Get current URL (in case of redirects)
    const currentUrl = page.url();
    console.log('🌐 Current URL:', currentUrl);
    
    // Check if we're on a login page
    const isLoginPage = title.includes('Login') || currentUrl.includes('login') || currentUrl.includes('auth');
    console.log('🔐 Is login page?', isLoginPage);
    
    // Get page content for analysis
    const bodyText = await page.locator('body').textContent();
    const firstFewWords = bodyText.substring(0, 200);
    console.log('📝 First 200 characters of page:', firstFewWords);
    
    // Check for specific elements
    const hasLoginForm = await page.locator('form[action*="auth"], form[action*="login"], input[type="email"], input[type="password"]').count() > 0;
    console.log('📝 Has login form?', hasLoginForm);
    
    // Check for DressUp specific content
    const hasDressUpContent = bodyText.toLowerCase().includes('dressup') || 
                             bodyText.toLowerCase().includes('dress up') ||
                             bodyText.toLowerCase().includes('upload') ||
                             bodyText.toLowerCase().includes('how it works');
    console.log('👗 Has DressUp content?', hasDressUpContent);
    
    // Take a diagnostic screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/diagnostic-page.png',
      fullPage: true 
    });
    
    // Log all network responses
    console.log('🌐 Network responses:');
    responses.forEach(resp => {
      console.log(`  ${resp.status} ${resp.statusText} - ${resp.url}`);
    });
    
    // Log page HTML structure
    const htmlStructure = await page.locator('body *').evaluateAll(elements => {
      return elements.slice(0, 10).map(el => `${el.tagName.toLowerCase()}${el.className ? '.' + el.className.split(' ').join('.') : ''}${el.id ? '#' + el.id : ''}`);
    });
    console.log('🏗️ HTML structure (first 10 elements):', htmlStructure);
    
    // Create diagnostic report
    const diagnosticData = {
      url: DEPLOYMENT_URL,
      finalUrl: currentUrl,
      status: response.status(),
      title: title,
      isLoginPage: isLoginPage,
      hasLoginForm: hasLoginForm,
      hasDressUpContent: hasDressUpContent,
      pageLength: bodyText.length,
      responses: responses,
      htmlStructure: htmlStructure,
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 Diagnostic complete. Summary:');
    console.log(`   Status: ${response.status()}`);
    console.log(`   Title: ${title}`);
    console.log(`   Is accessible: ${response.status() === 200}`);
    console.log(`   Has DressUp content: ${hasDressUpContent}`);
    console.log(`   Requires authentication: ${isLoginPage}`);
    
    // Write diagnostic report
    const fs = require('fs');
    fs.writeFileSync('tests/diagnostic-report.json', JSON.stringify(diagnosticData, null, 2));
    
    // The test should always pass, it's just for diagnostics
    expect(response.status()).toBeGreaterThanOrEqual(200);
  });

  test('Check alternative URL formats', async ({ page }) => {
    console.log('🔍 Testing alternative URL formats...');
    
    const urlsToTry = [
      'https://dressup-hsu24fo3h-deli-matsuos-projects.vercel.app',
      'https://dressup-hsu24fo3h-deli-matsuos-projects.vercel.app/',
      'https://dressup.vercel.app',
      'https://dressup-git-main-deli-matsuos-projects.vercel.app'
    ];
    
    const results = [];
    
    for (const url of urlsToTry) {
      try {
        console.log(`🌐 Trying: ${url}`);
        const response = await page.goto(url, { timeout: 10000 });
        const title = await page.title();
        const currentUrl = page.url();
        
        results.push({
          testUrl: url,
          status: response.status(),
          finalUrl: currentUrl,
          title: title,
          accessible: response.status() < 400,
          isDressUp: title.toLowerCase().includes('dressup') || title.toLowerCase().includes('dress up')
        });
        
        console.log(`   ✅ ${url} → ${response.status()} "${title}"`);
      } catch (error) {
        results.push({
          testUrl: url,
          error: error.message,
          accessible: false
        });
        console.log(`   ❌ ${url} → Error: ${error.message}`);
      }
    }
    
    // Log summary
    console.log('📊 URL Test Summary:');
    results.forEach(result => {
      const status = result.accessible ? '✅' : '❌';
      console.log(`   ${status} ${result.testUrl} - ${result.status || 'Error'}`);
    });
    
    // Write results
    const fs = require('fs');
    fs.writeFileSync('tests/url-test-results.json', JSON.stringify(results, null, 2));
    
    expect(results.length).toBeGreaterThan(0);
  });
});
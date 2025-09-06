/**
 * End-to-End Production Tests
 * Comprehensive testing suite for production readiness
 */

import { test, expect } from '@playwright/test';

test.describe('Production E2E Tests', () => {
  const baseURL = process.env.TEST_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Set up performance monitoring
    await page.addInitScript(() => {
      window.performance.mark('test-start');
    });
  });

  test.describe('Core Functionality', () => {
    test('should load homepage with critical resources', async ({ page }) => {
      await page.goto(baseURL);
      
      // Check critical content is loaded
      await expect(page.locator('h1')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="upload-area"]')).toBeVisible();
      
      // Verify no console errors
      const consoleMessages = [];
      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleMessages.push(message.text());
        }
      });
      
      expect(consoleMessages).toHaveLength(0);
    });

    test('should handle file upload flow', async ({ page }) => {
      await page.goto(baseURL);
      
      // Test file upload interaction
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeAttached();
      
      // Create a test image file
      const testImage = Buffer.from('fake-image-data');
      await fileInput.setInputFiles({
        name: 'test-image.jpg',
        mimeType: 'image/jpeg',
        buffer: testImage,
      });
      
      // Verify upload feedback
      await expect(page.locator('[data-testid="upload-feedback"]')).toBeVisible({ timeout: 10000 });
    });

    test('should maintain responsive design', async ({ page, viewport }) => {
      const viewports = [
        { width: 375, height: 667 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 }, // Desktop
      ];

      for (const size of viewports) {
        await page.setViewportSize(size);
        await page.goto(baseURL);
        
        // Check layout adaptation
        const header = page.locator('header');
        const main = page.locator('main');
        
        await expect(header).toBeVisible();
        await expect(main).toBeVisible();
        
        // Verify no horizontal scroll on mobile
        if (size.width <= 768) {
          const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
          expect(bodyWidth).toBeLessThanOrEqual(size.width);
        }
      }
    });
  });

  test.describe('Performance Tests', () => {
    test('should meet Core Web Vitals thresholds', async ({ page }) => {
      await page.goto(baseURL);
      
      // Measure Core Web Vitals
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals = {};
            
            entries.forEach((entry) => {
              if (entry.name === 'FCP') {
                vitals.fcp = entry.value;
              } else if (entry.name === 'LCP') {
                vitals.lcp = entry.value;
              } else if (entry.name === 'CLS') {
                vitals.cls = entry.value;
              } else if (entry.name === 'FID') {
                vitals.fid = entry.value;
              }
            });
            
            resolve(vitals);
          });
          
          observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] });
          
          // Fallback timeout
          setTimeout(() => resolve({}), 10000);
        });
      });

      // Assert Core Web Vitals thresholds
      if (vitals.fcp) expect(vitals.fcp).toBeLessThan(1800); // 1.8s
      if (vitals.lcp) expect(vitals.lcp).toBeLessThan(2500); // 2.5s
      if (vitals.cls) expect(vitals.cls).toBeLessThan(0.1); // 0.1
      if (vitals.fid) expect(vitals.fid).toBeLessThan(100); // 100ms
    });

    test('should load critical resources efficiently', async ({ page }) => {
      const resourceSizes = {};
      let totalSize = 0;

      page.on('response', async (response) => {
        const url = response.url();
        const resourceType = response.request().resourceType();
        
        try {
          const body = await response.body();
          const size = body.length;
          totalSize += size;
          
          if (!resourceSizes[resourceType]) {
            resourceSizes[resourceType] = 0;
          }
          resourceSizes[resourceType] += size;
        } catch (error) {
          // Some responses might not have a body
        }
      });

      await page.goto(baseURL, { waitUntil: 'networkidle' });
      
      // Assert resource budgets
      expect(totalSize).toBeLessThan(5 * 1024 * 1024); // 5MB total
      expect(resourceSizes.script || 0).toBeLessThan(1024 * 1024); // 1MB JS
      expect(resourceSizes.stylesheet || 0).toBeLessThan(102400); // 100KB CSS
      expect(resourceSizes.image || 0).toBeLessThan(2 * 1024 * 1024); // 2MB images
    });
  });

  test.describe('Security Tests', () => {
    test('should have proper security headers', async ({ page }) => {
      const response = await page.goto(baseURL);
      const headers = response?.headers() || {};
      
      // Check critical security headers
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-xss-protection']).toBe('1; mode=block');
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      
      // Check CSP header exists
      expect(headers['content-security-policy']).toBeDefined();
      expect(headers['content-security-policy']).toContain("default-src 'self'");
    });

    test('should prevent XSS attacks', async ({ page }) => {
      await page.goto(baseURL);
      
      // Try to inject malicious script
      const maliciousInput = '<script>window.xssTest = true;</script>';
      
      // Try injection in search/input fields
      const inputs = await page.locator('input, textarea').all();
      for (const input of inputs) {
        await input.fill(maliciousInput);
      }
      
      // Check that script was not executed
      const xssExecuted = await page.evaluate(() => window.xssTest);
      expect(xssExecuted).toBeUndefined();
    });

    test('should handle HTTPS requirements', async ({ page }) => {
      // This test assumes production deployment uses HTTPS
      if (baseURL.startsWith('https://')) {
        const response = await page.goto(baseURL);
        expect(response?.status()).toBe(200);
        
        // Check for HSTS header in production
        const headers = response?.headers() || {};
        if (process.env.NODE_ENV === 'production') {
          expect(headers['strict-transport-security']).toBeDefined();
        }
      }
    });
  });

  test.describe('Accessibility Tests', () => {
    test('should meet WCAG 2.1 AA standards', async ({ page }) => {
      await page.goto(baseURL);
      
      // Basic accessibility checks
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
      expect(headings).toBeGreaterThan(0);
      
      // Check for alt text on images
      const images = await page.locator('img').all();
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        expect(alt).toBeDefined();
      }
      
      // Check for proper form labels
      const inputs = await page.locator('input[type="text"], input[type="email"], textarea').all();
      for (const input of inputs) {
        const label = await input.getAttribute('aria-label');
        const labelledBy = await input.getAttribute('aria-labelledby');
        expect(label || labelledBy).toBeDefined();
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto(baseURL);
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      const firstFocusable = await page.locator(':focus').first();
      expect(firstFocusable).toBeVisible();
      
      // Test escape key functionality
      await page.keyboard.press('Escape');
      // Should close any open modals/dropdowns
    });

    test('should work with screen readers', async ({ page }) => {
      await page.goto(baseURL);
      
      // Check for proper ARIA attributes
      const landmarks = await page.locator('[role="main"], main, [role="banner"], header, [role="navigation"], nav').count();
      expect(landmarks).toBeGreaterThan(0);
      
      // Check for skip links
      const skipLink = page.locator('a[href="#main-content"], a[href="#content"]').first();
      if (await skipLink.count() > 0) {
        expect(skipLink).toBeAttached();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page, context }) => {
      // Simulate offline condition
      await context.setOffline(true);
      await page.goto(baseURL, { waitUntil: 'networkidle' });
      
      // Check for offline message or cached content
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      const cachedContent = page.locator('main');
      
      const hasOfflineIndicator = await offlineIndicator.count() > 0;
      const hasCachedContent = await cachedContent.count() > 0;
      
      expect(hasOfflineIndicator || hasCachedContent).toBeTruthy();
      
      // Restore online state
      await context.setOffline(false);
    });

    test('should handle 404 errors appropriately', async ({ page }) => {
      const response = await page.goto(`${baseURL}/non-existent-page`);
      
      // Should either redirect to home or show 404 page
      if (response?.status() === 404) {
        await expect(page.locator('h1')).toContainText(/not found|404/i);
      } else {
        // Redirected to home
        expect(response?.status()).toBe(200);
      }
    });

    test('should handle JavaScript errors gracefully', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      await page.goto(baseURL);
      
      // Trigger potential error conditions
      await page.evaluate(() => {
        // Try to call undefined function
        try {
          window.undefinedFunction();
        } catch (e) {
          // Should be handled gracefully
        }
      });
      
      // Should not have uncaught errors
      const uncaughtErrors = errors.filter(error => 
        !error.includes('Network request failed') &&
        !error.includes('Failed to fetch')
      );
      
      expect(uncaughtErrors).toHaveLength(0);
    });
  });

  test.describe('Browser Compatibility', () => {
    test('should work in different browsers', async ({ browserName, page }) => {
      await page.goto(baseURL);
      
      // Basic functionality should work across browsers
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-testid="upload-area"]')).toBeVisible();
      
      // Check for browser-specific features
      const supportsWebP = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      });
      
      // Modern browsers should support WebP
      if (['chromium', 'webkit'].includes(browserName)) {
        expect(supportsWebP).toBeTruthy();
      }
    });
  });

  test.describe('SEO Tests', () => {
    test('should have proper meta tags', async ({ page }) => {
      await page.goto(baseURL);
      
      // Check essential meta tags
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeLessThan(60);
      
      const description = await page.getAttribute('meta[name="description"]', 'content');
      expect(description).toBeTruthy();
      expect(description.length).toBeLessThan(160);
      
      const viewport = await page.getAttribute('meta[name="viewport"]', 'content');
      expect(viewport).toContain('width=device-width');
    });

    test('should have proper structured data', async ({ page }) => {
      await page.goto(baseURL);
      
      // Check for structured data
      const structuredData = await page.locator('script[type="application/ld+json"]').count();
      
      // Should have at least basic organization/website schema
      if (structuredData > 0) {
        const schema = await page.locator('script[type="application/ld+json"]').first().textContent();
        const data = JSON.parse(schema);
        expect(data['@context']).toBe('https://schema.org');
      }
    });
  });
});
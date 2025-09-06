#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Performance budget configuration
const PERFORMANCE_BUDGET = {
  // Bundle size limits (in bytes)
  bundles: {
    'main': 500 * 1024, // 500KB
    'vendor': 800 * 1024, // 800KB
    'total': 1.5 * 1024 * 1024, // 1.5MB
  },
  
  // Asset size limits
  assets: {
    'css': 100 * 1024, // 100KB
    'images': 2 * 1024 * 1024, // 2MB per image
    'fonts': 200 * 1024, // 200KB total
  },
  
  // Performance metrics limits
  metrics: {
    'lcp': 2500, // 2.5s
    'fid': 100, // 100ms
    'cls': 0.1,
    'ttfb': 600, // 600ms
    'fcp': 1800, // 1.8s
  },
  
  // Lighthouse scores
  lighthouse: {
    'performance': 90,
    'accessibility': 95,
    'best-practices': 90,
    'seo': 90,
  }
};

class PerformanceBudgetChecker {
  constructor(buildDir = '.next') {
    this.buildDir = buildDir;
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
    };
  }

  async checkBundleSizes() {
    console.log('🔍 Checking bundle sizes...');
    
    const buildManifest = path.join(this.buildDir, 'build-manifest.json');
    if (!fs.existsSync(buildManifest)) {
      this.results.warnings.push('Build manifest not found. Run `npm run build` first.');
      return;
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
      const staticDir = path.join(this.buildDir, 'static');
      
      // Check main bundle
      await this.checkMainBundle(staticDir);
      
      // Check vendor bundles
      await this.checkVendorBundles(staticDir);
      
      // Check total bundle size
      await this.checkTotalBundleSize(staticDir);
      
    } catch (error) {
      this.results.failed.push(`Bundle size check failed: ${error.message}`);
    }
  }

  async checkMainBundle(staticDir) {
    const jsDir = path.join(staticDir, 'chunks');
    if (!fs.existsSync(jsDir)) return;

    let mainBundleSize = 0;
    const files = fs.readdirSync(jsDir);
    
    for (const file of files) {
      if (file.includes('main') && file.endsWith('.js')) {
        const filePath = path.join(jsDir, file);
        const stats = fs.statSync(filePath);
        mainBundleSize += stats.size;
      }
    }

    const limit = PERFORMANCE_BUDGET.bundles.main;
    if (mainBundleSize > limit) {
      this.results.failed.push(
        `Main bundle size exceeds budget: ${this.formatBytes(mainBundleSize)} > ${this.formatBytes(limit)}`
      );
    } else {
      this.results.passed.push(
        `Main bundle size within budget: ${this.formatBytes(mainBundleSize)}`
      );
    }
  }

  async checkVendorBundles(staticDir) {
    const jsDir = path.join(staticDir, 'chunks');
    if (!fs.existsSync(jsDir)) return;

    let vendorBundleSize = 0;
    const files = fs.readdirSync(jsDir);
    
    for (const file of files) {
      if ((file.includes('vendor') || file.includes('framework')) && file.endsWith('.js')) {
        const filePath = path.join(jsDir, file);
        const stats = fs.statSync(filePath);
        vendorBundleSize += stats.size;
      }
    }

    const limit = PERFORMANCE_BUDGET.bundles.vendor;
    if (vendorBundleSize > limit) {
      this.results.failed.push(
        `Vendor bundle size exceeds budget: ${this.formatBytes(vendorBundleSize)} > ${this.formatBytes(limit)}`
      );
    } else {
      this.results.passed.push(
        `Vendor bundle size within budget: ${this.formatBytes(vendorBundleSize)}`
      );
    }
  }

  async checkTotalBundleSize(staticDir) {
    let totalSize = 0;
    
    const countFiles = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          countFiles(filePath);
        } else if (file.endsWith('.js') || file.endsWith('.css')) {
          totalSize += stats.size;
        }
      }
    };

    countFiles(staticDir);

    const limit = PERFORMANCE_BUDGET.bundles.total;
    if (totalSize > limit) {
      this.results.failed.push(
        `Total bundle size exceeds budget: ${this.formatBytes(totalSize)} > ${this.formatBytes(limit)}`
      );
    } else {
      this.results.passed.push(
        `Total bundle size within budget: ${this.formatBytes(totalSize)}`
      );
    }
  }

  async checkAssetSizes() {
    console.log('🖼️  Checking asset sizes...');
    
    const publicDir = 'public';
    await this.checkImageSizes(publicDir);
    await this.checkCSSSize();
  }

  async checkImageSizes(publicDir) {
    if (!fs.existsSync(publicDir)) return;

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
    
    const checkDir = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          checkDir(filePath);
        } else if (imageExtensions.some(ext => file.toLowerCase().endsWith(ext))) {
          const limit = PERFORMANCE_BUDGET.assets.images;
          if (stats.size > limit) {
            this.results.failed.push(
              `Image size exceeds budget: ${file} (${this.formatBytes(stats.size)} > ${this.formatBytes(limit)})`
            );
          }
        }
      }
    };

    checkDir(publicDir);
  }

  async checkCSSSize() {
    const cssDir = path.join(this.buildDir, 'static', 'css');
    if (!fs.existsSync(cssDir)) return;

    let totalCSSSize = 0;
    const files = fs.readdirSync(cssDir);
    
    for (const file of files) {
      if (file.endsWith('.css')) {
        const filePath = path.join(cssDir, file);
        const stats = fs.statSync(filePath);
        totalCSSSize += stats.size;
      }
    }

    const limit = PERFORMANCE_BUDGET.assets.css;
    if (totalCSSSize > limit) {
      this.results.failed.push(
        `CSS size exceeds budget: ${this.formatBytes(totalCSSSize)} > ${this.formatBytes(limit)}`
      );
    } else {
      this.results.passed.push(
        `CSS size within budget: ${this.formatBytes(totalCSSSize)}`
      );
    }
  }

  async runLighthouseChecks() {
    console.log('🏮 Running Lighthouse checks...');
    
    // This would integrate with Lighthouse CI in a real implementation
    // For now, we'll create a placeholder that would be integrated with actual Lighthouse runs
    
    const mockScores = {
      performance: 85,
      accessibility: 90,
      bestPractices: 85,
      seo: 88
    };

    for (const [metric, score] of Object.entries(mockScores)) {
      const limit = PERFORMANCE_BUDGET.lighthouse[metric.replace(/([A-Z])/g, '-$1').toLowerCase()];
      if (score < limit) {
        this.results.failed.push(
          `Lighthouse ${metric} score below budget: ${score} < ${limit}`
        );
      } else {
        this.results.passed.push(
          `Lighthouse ${metric} score within budget: ${score}`
        );
      }
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  generateReport() {
    console.log('\n📊 Performance Budget Report');
    console.log('================================\n');

    if (this.results.passed.length > 0) {
      console.log('✅ Passed Checks:');
      this.results.passed.forEach(check => console.log(`  ${check}`));
      console.log('');
    }

    if (this.results.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      this.results.warnings.forEach(warning => console.log(`  ${warning}`));
      console.log('');
    }

    if (this.results.failed.length > 0) {
      console.log('❌ Failed Checks:');
      this.results.failed.forEach(failure => console.log(`  ${failure}`));
      console.log('');
    }

    const totalChecks = this.results.passed.length + this.results.failed.length;
    const passRate = totalChecks > 0 ? (this.results.passed.length / totalChecks) * 100 : 0;
    
    console.log(`Summary: ${this.results.passed.length}/${totalChecks} checks passed (${passRate.toFixed(1)}%)`);
    
    // Return exit code based on results
    return this.results.failed.length > 0 ? 1 : 0;
  }

  async run() {
    console.log('🚀 Running Performance Budget Checks...\n');
    
    const startTime = performance.now();
    
    await this.checkBundleSizes();
    await this.checkAssetSizes();
    await this.runLighthouseChecks();
    
    const endTime = performance.now();
    console.log(`\n⏱️  Budget check completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    return this.generateReport();
  }
}

// CLI execution
if (require.main === module) {
  const checker = new PerformanceBudgetChecker();
  checker.run().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Performance budget check failed:', error);
    process.exit(1);
  });
}

module.exports = { PerformanceBudgetChecker, PERFORMANCE_BUDGET };
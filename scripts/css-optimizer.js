#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PurgeCSS } = require('purgecss');

class CSSOptimizer {
  constructor(options = {}) {
    this.options = {
      buildDir: options.buildDir || '.next',
      srcDir: options.srcDir || 'src',
      publicDir: options.publicDir || 'public',
      outputDir: options.outputDir || 'dist/optimized-css',
      ...options
    };
    
    this.stats = {
      originalSize: 0,
      optimizedSize: 0,
      filesProcessed: 0,
      savings: 0,
    };
  }

  async optimizeCSS() {
    console.log('🎨 Starting CSS optimization...');
    
    await this.ensureOutputDir();
    await this.purgeCSSFiles();
    await this.extractCriticalCSS();
    await this.minifyCSS();
    
    this.printStats();
  }

  async ensureOutputDir() {
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  async purgeCSSFiles() {
    console.log('🧹 Purging unused CSS...');
    
    const cssDir = path.join(this.options.buildDir, 'static', 'css');
    if (!fs.existsSync(cssDir)) {
      console.log('No CSS files found to purge');
      return;
    }

    const cssFiles = fs.readdirSync(cssDir)
      .filter(file => file.endsWith('.css'))
      .map(file => path.join(cssDir, file));

    if (cssFiles.length === 0) {
      console.log('No CSS files found to purge');
      return;
    }

    // Find all content files (HTML, JS, JSX, TS, TSX)
    const contentFiles = await this.findContentFiles();

    for (const cssFile of cssFiles) {
      await this.purgeSingleFile(cssFile, contentFiles);
    }
  }

  async findContentFiles() {
    const extensions = ['html', 'js', 'jsx', 'ts', 'tsx'];
    const contentFiles = [];

    const scanDirectory = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && !file.includes('node_modules')) {
          scanDirectory(filePath);
        } else if (extensions.some(ext => file.endsWith(`.${ext}`))) {
          contentFiles.push(filePath);
        }
      }
    };

    // Scan source directory
    scanDirectory(this.options.srcDir);
    
    // Include build files
    const pagesDir = path.join(this.options.buildDir, 'server', 'pages');
    if (fs.existsSync(pagesDir)) {
      scanDirectory(pagesDir);
    }

    return contentFiles;
  }

  async purgeSingleFile(cssFile, contentFiles) {
    try {
      const originalContent = fs.readFileSync(cssFile, 'utf8');
      this.stats.originalSize += originalContent.length;

      const purgeCSSResult = await new PurgeCSS().purge({
        content: contentFiles,
        css: [cssFile],
        defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
        safelist: [
          // Keep important classes that might be added dynamically
          /^sr-only$/,
          /^focus:/,
          /^hover:/,
          /^active:/,
          /^disabled:/,
          /^group-hover:/,
          /^animate-/,
          /^transition-/,
          /^duration-/,
          /^ease-/,
          // Keep responsive classes
          /^sm:/,
          /^md:/,
          /^lg:/,
          /^xl:/,
          /^2xl:/,
        ],
      });

      if (purgeCSSResult && purgeCSSResult[0]) {
        const purgedContent = purgeCSSResult[0].css;
        this.stats.optimizedSize += purgedContent.length;
        
        const outputFile = path.join(this.options.outputDir, `purged-${path.basename(cssFile)}`);
        fs.writeFileSync(outputFile, purgedContent);
        
        console.log(`Purged ${path.basename(cssFile)}: ${originalContent.length} → ${purgedContent.length} bytes`);
        this.stats.filesProcessed++;
      }
    } catch (error) {
      console.error(`Error purging ${cssFile}:`, error.message);
    }
  }

  async extractCriticalCSS() {
    console.log('🚀 Extracting critical CSS...');
    
    // This would integrate with tools like critical or puppeteer
    // For now, we'll create a basic critical CSS extractor
    
    const criticalRules = [
      // Above-the-fold styles
      'html', 'body', 
      '.mobile-container',
      'h1', 'h2', 'h3',
      '.text-responsive-3xl',
      '.text-responsive-2xl',
      '.bg-blue-50',
      '.rounded-lg',
      '.p-4', '.p-6',
      '.mb-4', '.mb-6', '.mb-8',
      '.grid', '.grid-cols-1', '.grid-cols-3',
      '.flex', '.items-center', '.justify-center',
      '.font-bold', '.font-semibold',
      '.text-gray-900', '.text-gray-700',
      // Loading states
      '.animate-spin',
      '.border-b-2',
      '.border-blue-600',
      // Critical responsive classes
      '.sm\\:grid-cols-3',
      '.sm\\:p-6',
      '.sm\\:mb-8',
      '.sm\\:mb-12',
    ];

    const criticalCSS = this.generateCriticalCSS(criticalRules);
    
    const criticalFile = path.join(this.options.outputDir, 'critical.css');
    fs.writeFileSync(criticalFile, criticalCSS);
    
    console.log(`Critical CSS extracted to ${criticalFile}`);
  }

  generateCriticalCSS(rules) {
    // This is a simplified version - in production, you'd use a proper CSS parser
    return `
/* Critical CSS - Above the fold styles */
html, body {
  margin: 0;
  padding: 0;
  font-family: var(--font-geist-sans), system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  color: #1f2937;
}

.mobile-container {
  max-width: 100%;
  margin: 0 auto;
  padding: 1rem;
}

h1, h2, h3 {
  margin: 0;
  font-weight: 700;
  line-height: 1.2;
}

.text-responsive-3xl {
  font-size: 2rem;
}

.text-responsive-2xl {
  font-size: 1.5rem;
}

.bg-blue-50 {
  background-color: #eff6ff;
}

.rounded-lg {
  border-radius: 0.5rem;
}

.p-4 { padding: 1rem; }
.p-6 { padding: 1.5rem; }

.mb-4 { margin-bottom: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mb-8 { margin-bottom: 2rem; }

.grid { display: grid; }
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

.flex { display: flex; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }

.font-bold { font-weight: 700; }
.font-semibold { font-weight: 600; }

.text-gray-900 { color: #111827; }
.text-gray-700 { color: #374151; }

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.border-b-2 { border-bottom-width: 2px; }
.border-blue-600 { border-color: #2563eb; }

@media (min-width: 640px) {
  .sm\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .sm\\:p-6 { padding: 1.5rem; }
  .sm\\:mb-8 { margin-bottom: 2rem; }
  .sm\\:mb-12 { margin-bottom: 3rem; }
  
  .text-responsive-3xl { font-size: 3rem; }
  .text-responsive-2xl { font-size: 2rem; }
}
    `.trim();
  }

  async minifyCSS() {
    console.log('📦 Minifying CSS...');
    
    const cssFiles = fs.readdirSync(this.options.outputDir)
      .filter(file => file.endsWith('.css'))
      .map(file => path.join(this.options.outputDir, file));

    for (const cssFile of cssFiles) {
      await this.minifySingleFile(cssFile);
    }
  }

  async minifySingleFile(cssFile) {
    try {
      const content = fs.readFileSync(cssFile, 'utf8');
      const minified = this.minifyCSS(content);
      
      const minifiedFile = cssFile.replace('.css', '.min.css');
      fs.writeFileSync(minifiedFile, minified);
      
      console.log(`Minified ${path.basename(cssFile)}: ${content.length} → ${minified.length} bytes`);
    } catch (error) {
      console.error(`Error minifying ${cssFile}:`, error.message);
    }
  }

  minifyCSS(css) {
    return css
      // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove unnecessary whitespace
      .replace(/\s+/g, ' ')
      // Remove spaces around certain characters
      .replace(/\s*([{}:;,>+~])\s*/g, '$1')
      // Remove trailing semicolons
      .replace(/;}/g, '}')
      // Remove leading/trailing spaces
      .trim();
  }

  printStats() {
    this.stats.savings = this.stats.originalSize - this.stats.optimizedSize;
    const savingsPercent = this.stats.originalSize > 0 
      ? ((this.stats.savings / this.stats.originalSize) * 100).toFixed(1)
      : 0;

    console.log('\n📊 CSS Optimization Results');
    console.log('============================');
    console.log(`Files processed: ${this.stats.filesProcessed}`);
    console.log(`Original size: ${this.formatBytes(this.stats.originalSize)}`);
    console.log(`Optimized size: ${this.formatBytes(this.stats.optimizedSize)}`);
    console.log(`Savings: ${this.formatBytes(this.stats.savings)} (${savingsPercent}%)`);
    console.log(`Output directory: ${this.options.outputDir}`);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI execution
if (require.main === module) {
  const optimizer = new CSSOptimizer();
  optimizer.optimizeCSS().catch(error => {
    console.error('CSS optimization failed:', error);
    process.exit(1);
  });
}

module.exports = CSSOptimizer;
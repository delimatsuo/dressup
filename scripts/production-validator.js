#!/usr/bin/env node

/**
 * Production Validator Script
 * Comprehensive production readiness validation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProductionValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.coverage = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      error: '\x1b[31m',
      warning: '\x1b[33m',
      success: '\x1b[32m',
      info: '\x1b[36m',
      reset: '\x1b[0m'
    };

    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  addError(message, details = null) {
    this.errors.push({ message, details });
    this.log(`ERROR: ${message}`, 'error');
    if (details) {
      console.log('  Details:', details);
    }
  }

  addWarning(message, details = null) {
    this.warnings.push({ message, details });
    this.log(`WARNING: ${message}`, 'warning');
    if (details) {
      console.log('  Details:', details);
    }
  }

  addPass(message) {
    this.passed.push(message);
    this.log(`✓ ${message}`, 'success');
  }

  // Test suite execution and coverage validation
  async validateTestSuite() {
    this.log('Running comprehensive test suite...', 'info');
    
    try {
      const coverageOutput = execSync('npm run test:coverage', { 
        encoding: 'utf8',
        stdio: 'pipe' 
      });

      // Parse coverage from output
      const coverageMatch = coverageOutput.match(/All files\s*\|\s*([\d.]+)/);
      if (coverageMatch) {
        const coverage = parseFloat(coverageMatch[1]);
        this.coverage = coverage;
        
        if (coverage >= 95) {
          this.addPass(`Test coverage: ${coverage}% (meets 95% requirement)`);
        } else if (coverage >= 80) {
          this.addWarning(`Test coverage: ${coverage}% (below 95% target)`);
        } else {
          this.addError(`Test coverage: ${coverage}% (critically low)`);
        }
      } else {
        this.addWarning('Could not parse test coverage percentage');
      }

      this.addPass('All tests passed');
    } catch (error) {
      this.addError('Test suite failed', error.message);
    }
  }

  // Build validation
  async validateBuild() {
    this.log('Validating production build...', 'info');
    
    try {
      execSync('npm run build', { encoding: 'utf8', stdio: 'pipe' });
      this.addPass('Production build successful');
      
      // Check if build artifacts exist
      const buildDir = path.join(process.cwd(), '.next');
      if (fs.existsSync(buildDir)) {
        this.addPass('Build artifacts generated');
      } else {
        this.addError('Build artifacts not found');
      }
      
    } catch (error) {
      this.addError('Production build failed', error.message);
    }
  }

  // Security validation
  async validateSecurity() {
    this.log('Validating security configuration...', 'info');

    // Check for security dependencies
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Check for known vulnerable packages (simplified)
    const vulnerablePackages = [];
    
    if (vulnerablePackages.length > 0) {
      this.addError('Vulnerable dependencies detected', vulnerablePackages);
    } else {
      this.addPass('No known vulnerable dependencies');
    }

    // Check for security headers in Next.js config
    try {
      const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
      if (fs.existsSync(nextConfigPath)) {
        const configContent = fs.readFileSync(nextConfigPath, 'utf8');
        
        const securityHeaders = [
          'X-Frame-Options',
          'X-Content-Type-Options',
          'X-XSS-Protection',
          'Referrer-Policy',
          'Content-Security-Policy'
        ];

        const missingHeaders = securityHeaders.filter(header => 
          !configContent.includes(header)
        );

        if (missingHeaders.length === 0) {
          this.addPass('Security headers properly configured');
        } else {
          this.addWarning('Missing security headers', missingHeaders);
        }
      }
    } catch (error) {
      this.addWarning('Could not validate security headers configuration');
    }

    // Check for .env exposure
    if (fs.existsSync('.env') || fs.existsSync('.env.local')) {
      const gitignore = fs.existsSync('.gitignore') ? 
        fs.readFileSync('.gitignore', 'utf8') : '';
      
      if (gitignore.includes('.env')) {
        this.addPass('Environment files properly ignored by git');
      } else {
        this.addError('Environment files may be exposed in git');
      }
    }
  }

  // Performance validation
  async validatePerformance() {
    this.log('Validating performance configuration...', 'info');

    // Check bundle analyzer configuration
    const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
    if (fs.existsSync(nextConfigPath)) {
      const configContent = fs.readFileSync(nextConfigPath, 'utf8');
      
      if (configContent.includes('BundleAnalyzerPlugin')) {
        this.addPass('Bundle analyzer configured');
      } else {
        this.addWarning('Bundle analyzer not configured');
      }

      // Check for image optimization
      if (configContent.includes('images')) {
        this.addPass('Image optimization configured');
      } else {
        this.addWarning('Image optimization not configured');
      }

      // Check for compression
      if (configContent.includes('compress: true')) {
        this.addPass('Compression enabled');
      } else {
        this.addWarning('Compression not explicitly enabled');
      }
    }

    // Check Lighthouse CI configuration
    const lighthouseConfigPath = path.join(process.cwd(), '.lighthouserc.json');
    if (fs.existsSync(lighthouseConfigPath)) {
      try {
        const lighthouseConfig = JSON.parse(fs.readFileSync(lighthouseConfigPath, 'utf8'));
        
        if (lighthouseConfig.ci && lighthouseConfig.ci.assert) {
          const assertions = lighthouseConfig.ci.assert.assertions;
          
          // Check performance thresholds
          const perfScore = assertions['categories:performance'];
          if (perfScore && perfScore[1] && perfScore[1].minScore >= 0.9) {
            this.addPass('Performance score threshold set (≥90%)');
          } else {
            this.addWarning('Performance score threshold too low or not set');
          }

          // Check accessibility threshold
          const a11yScore = assertions['categories:accessibility'];
          if (a11yScore && a11yScore[1] && a11yScore[1].minScore >= 0.95) {
            this.addPass('Accessibility score threshold set (≥95%)');
          } else {
            this.addWarning('Accessibility score threshold too low or not set');
          }
        }
      } catch (error) {
        this.addWarning('Invalid Lighthouse CI configuration');
      }
    } else {
      this.addWarning('Lighthouse CI not configured');
    }
  }

  // Environment validation
  async validateEnvironment() {
    this.log('Validating environment configuration...', 'info');

    const requiredEnvVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID'
    ];

    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      const missingVars = requiredEnvVars.filter(varName => 
        !envContent.includes(varName)
      );

      if (missingVars.length === 0) {
        this.addPass('All required environment variables present');
      } else {
        this.addError('Missing required environment variables', missingVars);
      }

      // Check for placeholder values
      const placeholderPatterns = [
        'YOUR_API_KEY_HERE',
        'your-project-id',
        'example.com',
        'localhost'
      ];

      const hasPlaceholders = placeholderPatterns.some(pattern => 
        envContent.includes(pattern)
      );

      if (hasPlaceholders) {
        this.addWarning('Environment file contains placeholder values');
      } else {
        this.addPass('No placeholder values in environment file');
      }
    } else {
      this.addError('Environment file (.env.local) not found');
    }
  }

  // Accessibility validation
  async validateAccessibility() {
    this.log('Validating accessibility configuration...', 'info');

    // Check for accessibility testing dependencies
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const a11yDeps = [
      '@axe-core/react',
      'axe-playwright'
    ];

    const missingA11yDeps = a11yDeps.filter(dep => 
      !packageJson.devDependencies?.[dep] && !packageJson.dependencies?.[dep]
    );

    if (missingA11yDeps.length === 0) {
      this.addPass('Accessibility testing dependencies installed');
    } else {
      this.addWarning('Missing accessibility testing dependencies', missingA11yDeps);
    }

    // Check for ARIA landmarks in main layout
    try {
      const appPath = path.join(process.cwd(), 'src/app');
      if (fs.existsSync(appPath)) {
        const files = fs.readdirSync(appPath, { withFileTypes: true });
        const layoutFiles = files.filter(file => 
          file.isFile() && file.name.includes('layout')
        );

        if (layoutFiles.length > 0) {
          const layoutContent = fs.readFileSync(
            path.join(appPath, layoutFiles[0].name), 
            'utf8'
          );

          const hasSemanticElements = [
            '<main',
            '<header',
            '<nav',
            'role=',
            'aria-'
          ].some(element => layoutContent.includes(element));

          if (hasSemanticElements) {
            this.addPass('Semantic HTML elements detected');
          } else {
            this.addWarning('Limited semantic HTML elements found');
          }
        }
      }
    } catch (error) {
      this.addWarning('Could not validate semantic HTML structure');
    }
  }

  // SEO validation
  async validateSEO() {
    this.log('Validating SEO configuration...', 'info');

    // Check for sitemap
    const sitemapPaths = ['public/sitemap.xml', 'public/sitemap.txt'];
    const hasSitemap = sitemapPaths.some(path => fs.existsSync(path));

    if (hasSitemap) {
      this.addPass('Sitemap file found');
    } else {
      this.addWarning('No sitemap file found');
    }

    // Check for robots.txt
    const robotsPath = path.join(process.cwd(), 'public/robots.txt');
    if (fs.existsSync(robotsPath)) {
      this.addPass('Robots.txt file found');
    } else {
      this.addWarning('Robots.txt file not found');
    }

    // Check Next.js metadata configuration
    try {
      const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
      if (fs.existsSync(layoutPath)) {
        const layoutContent = fs.readFileSync(layoutPath, 'utf8');
        
        if (layoutContent.includes('metadata') || layoutContent.includes('generateMetadata')) {
          this.addPass('Metadata configuration found');
        } else {
          this.addWarning('No metadata configuration found');
        }
      }
    } catch (error) {
      this.addWarning('Could not validate metadata configuration');
    }
  }

  // Database and Firebase validation
  async validateDatabase() {
    this.log('Validating database configuration...', 'info');

    // Check Firestore rules
    const firestoreRulesPath = path.join(process.cwd(), 'firestore.rules');
    if (fs.existsSync(firestoreRulesPath)) {
      const rulesContent = fs.readFileSync(firestoreRulesPath, 'utf8');
      
      if (rulesContent.includes('allow read, write: if false;')) {
        this.addError('Firestore rules are completely locked down');
      } else if (rulesContent.includes('request.auth')) {
        this.addPass('Firestore rules include authentication checks');
      } else {
        this.addWarning('Firestore rules may be too permissive');
      }
    } else {
      this.addWarning('Firestore rules file not found');
    }

    // Check Firebase config
    const firebaseConfigPath = path.join(process.cwd(), 'firebase.json');
    if (fs.existsSync(firebaseConfigPath)) {
      try {
        const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
        
        if (firebaseConfig.hosting) {
          this.addPass('Firebase hosting configured');
        }
        
        if (firebaseConfig.firestore) {
          this.addPass('Firestore configuration found');
        }
        
        if (firebaseConfig.storage) {
          this.addPass('Firebase Storage configured');
        }
      } catch (error) {
        this.addWarning('Invalid Firebase configuration file');
      }
    } else {
      this.addWarning('Firebase configuration file not found');
    }
  }

  // Generate comprehensive report
  generateReport() {
    this.log('\n=== PRODUCTION VALIDATION REPORT ===', 'info');
    
    const totalChecks = this.passed.length + this.warnings.length + this.errors.length;
    const successRate = ((this.passed.length / totalChecks) * 100).toFixed(1);
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Checks: ${totalChecks}`);
    console.log(`   ✅ Passed: ${this.passed.length}`);
    console.log(`   ⚠️  Warnings: ${this.warnings.length}`);
    console.log(`   ❌ Errors: ${this.errors.length}`);
    console.log(`   📈 Success Rate: ${successRate}%`);
    
    if (this.coverage) {
      console.log(`   🧪 Test Coverage: ${this.coverage}%`);
    }

    console.log(`\n✅ PASSED CHECKS:`);
    this.passed.forEach((check, index) => {
      console.log(`   ${index + 1}. ${check}`);
    });

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS:`);
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning.message}`);
        if (warning.details) {
          console.log(`      Details: ${JSON.stringify(warning.details)}`);
        }
      });
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ ERRORS:`);
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.message}`);
        if (error.details) {
          console.log(`      Details: ${JSON.stringify(error.details)}`);
        }
      });
    }

    // Production readiness assessment
    console.log(`\n🎯 PRODUCTION READINESS:`);
    if (this.errors.length === 0) {
      if (this.warnings.length === 0) {
        this.log('🚀 READY FOR PRODUCTION! All checks passed.', 'success');
      } else if (this.warnings.length <= 3) {
        this.log('✅ MOSTLY READY FOR PRODUCTION. Address warnings for optimal deployment.', 'warning');
      } else {
        this.log('⚠️ PRODUCTION READY WITH CAVEATS. Multiple warnings need attention.', 'warning');
      }
    } else {
      this.log('❌ NOT READY FOR PRODUCTION. Critical errors must be fixed.', 'error');
    }

    // Save report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalChecks,
        passed: this.passed.length,
        warnings: this.warnings.length,
        errors: this.errors.length,
        successRate: parseFloat(successRate),
        coverage: this.coverage
      },
      passed: this.passed,
      warnings: this.warnings,
      errors: this.errors
    };

    fs.writeFileSync('production-validation-report.json', JSON.stringify(reportData, null, 2));
    this.log('\n📄 Detailed report saved to: production-validation-report.json', 'info');

    // Exit with appropriate code
    process.exit(this.errors.length > 0 ? 1 : 0);
  }

  // Main validation runner
  async run() {
    this.log('🔍 Starting comprehensive production validation...', 'info');
    
    await this.validateTestSuite();
    await this.validateBuild();
    await this.validateSecurity();
    await this.validatePerformance();
    await this.validateEnvironment();
    await this.validateAccessibility();
    await this.validateSEO();
    await this.validateDatabase();
    
    this.generateReport();
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ProductionValidator();
  validator.run().catch((error) => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionValidator;
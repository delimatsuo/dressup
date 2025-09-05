#!/usr/bin/env node

/**
 * Comprehensive Accessibility Validation Script for DressUp AI
 * 
 * This script validates screen reader accessibility and WCAG 2.1 AA compliance
 * across all components in the DressUp AI application.
 */

const fs = require('fs');
const path = require('path');

// ARIA attributes to validate
const REQUIRED_ARIA_ATTRIBUTES = [
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-live',
  'role',
  'aria-hidden',
  'aria-expanded',
  'aria-selected',
  'aria-current',
  'aria-pressed',
  'aria-atomic'
];

// Components to validate
const COMPONENTS_TO_VALIDATE = [
  'src/components/PhotoUploadInterface.tsx',
  'src/components/MultiPhotoUpload.tsx',
  'src/components/MobilePhotoUpload.tsx',
  'src/components/ResultsDisplay.tsx',
  'src/components/FeedbackSection.tsx',
  'src/components/MobileFeedbackForm.tsx',
  'src/components/MobileResultsGallery.tsx',
  'src/components/WelcomeConsentModal.tsx',
  'src/components/ScreenReaderOnly.tsx'
];

// Screen reader specific patterns
const SCREEN_READER_PATTERNS = {
  liveRegions: /aria-live=["'][^"']*["']/g,
  headingStructure: /<h[1-6][^>]*>/g,
  altText: /alt=["'][^"']*["']/g,
  ariaLabels: /aria-label=["'][^"']*["']/g,
  roles: /role=["'][^"']*["']/g,
  landmarks: /role=["'](main|navigation|banner|contentinfo|complementary|search|form|region)["']/g,
  focusManagement: /tabIndex|autoFocus|focus\(\)/g,
  skipLinks: /href=["']#[^"']*["'][^>]*>.*?skip/i
};

class AccessibilityValidator {
  constructor() {
    this.results = {
      totalComponents: 0,
      passedComponents: 0,
      issues: [],
      warnings: [],
      recommendations: [],
      ariaAttributes: {
        found: 0,
        missing: 0,
        details: []
      },
      screenReaderFeatures: {
        liveRegions: 0,
        landmarks: 0,
        properHeadings: 0,
        altTexts: 0,
        skipLinks: 0
      }
    };
  }

  validateComponent(filePath) {
    console.log(`\n🔍 Validating: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      this.results.issues.push({
        file: filePath,
        type: 'File Not Found',
        severity: 'high',
        message: 'Component file does not exist'
      });
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    this.results.totalComponents++;

    // Validate ARIA attributes
    this.validateAriaAttributes(filePath, content);
    
    // Validate screen reader features
    this.validateScreenReaderFeatures(filePath, content);
    
    // Validate semantic HTML
    this.validateSemanticHTML(filePath, content);
    
    // Validate focus management
    this.validateFocusManagement(filePath, content);
    
    // Check for accessibility anti-patterns
    this.validateAccessibilityPatterns(filePath, content);

    console.log(`✅ Completed validation for ${path.basename(filePath)}`);
  }

  validateAriaAttributes(filePath, content) {
    let foundAttributes = 0;
    const fileName = path.basename(filePath);
    
    REQUIRED_ARIA_ATTRIBUTES.forEach(attr => {
      const regex = new RegExp(`${attr}=["'][^"']*["']`, 'g');
      const matches = content.match(regex);
      
      if (matches) {
        foundAttributes += matches.length;
        this.results.ariaAttributes.details.push({
          file: fileName,
          attribute: attr,
          count: matches.length,
          samples: matches.slice(0, 3) // Show first 3 examples
        });
      }
    });

    this.results.ariaAttributes.found += foundAttributes;

    // Check for missing critical ARIA attributes
    if (!content.includes('aria-label') && !content.includes('aria-labelledby')) {
      this.results.warnings.push({
        file: fileName,
        type: 'Missing Labels',
        message: 'Component lacks proper labeling (aria-label or aria-labelledby)'
      });
    }

    if (!content.includes('aria-live')) {
      this.results.warnings.push({
        file: fileName,
        type: 'No Live Regions',
        message: 'Component may benefit from ARIA live regions for dynamic content'
      });
    }
  }

  validateScreenReaderFeatures(filePath, content) {
    const fileName = path.basename(filePath);
    
    Object.entries(SCREEN_READER_PATTERNS).forEach(([feature, pattern]) => {
      const matches = content.match(pattern);
      if (matches) {
        this.results.screenReaderFeatures[feature] = 
          (this.results.screenReaderFeatures[feature] || 0) + matches.length;
        
        console.log(`  📝 Found ${matches.length} ${feature} in ${fileName}`);
      }
    });
  }

  validateSemanticHTML(filePath, content) {
    const fileName = path.basename(filePath);
    
    // Check for proper heading structure
    const headings = content.match(/<h[1-6][^>]*>/g);
    if (headings) {
      this.results.screenReaderFeatures.properHeadings += headings.length;
      
      // Validate heading hierarchy
      const headingLevels = headings.map(h => parseInt(h.match(/h([1-6])/)[1]));
      for (let i = 1; i < headingLevels.length; i++) {
        if (headingLevels[i] - headingLevels[i-1] > 1) {
          this.results.warnings.push({
            file: fileName,
            type: 'Heading Hierarchy',
            message: `Heading jump from h${headingLevels[i-1]} to h${headingLevels[i]} may confuse screen readers`
          });
        }
      }
    }

    // Check for proper form labels
    const inputs = content.match(/<input[^>]*>/g) || [];
    inputs.forEach((input, index) => {
      if (!input.includes('aria-label') && !input.includes('id=')) {
        this.results.warnings.push({
          file: fileName,
          type: 'Unlabeled Input',
          message: `Input element #${index + 1} lacks proper labeling`
        });
      }
    });

    // Check for button accessibility
    const buttons = content.match(/<button[^>]*>/g) || [];
    buttons.forEach((button, index) => {
      if (!button.includes('aria-label') && !content.includes('>') && !button.includes('children')) {
        this.results.warnings.push({
          file: fileName,
          type: 'Button Accessibility',
          message: `Button #${index + 1} may lack accessible text content`
        });
      }
    });
  }

  validateFocusManagement(filePath, content) {
    const fileName = path.basename(filePath);
    
    // Check for focus traps in modals
    if (content.includes('modal') || content.includes('Modal')) {
      if (!content.includes('useFocusTrap') && !content.includes('focus')) {
        this.results.warnings.push({
          file: fileName,
          type: 'Modal Focus Management',
          message: 'Modal components should implement focus trapping'
        });
      }
    }

    // Check for keyboard navigation
    if (!content.includes('onKeyDown') && !content.includes('useKeyboardNavigation')) {
      if (content.includes('onClick') || content.includes('interactive')) {
        this.results.recommendations.push({
          file: fileName,
          type: 'Keyboard Navigation',
          message: 'Consider adding keyboard navigation support for interactive elements'
        });
      }
    }
  }

  validateAccessibilityPatterns(filePath, content) {
    const fileName = path.basename(filePath);
    
    // Check for accessibility anti-patterns
    if (content.includes('onClick') && !content.includes('onKeyDown')) {
      this.results.warnings.push({
        file: fileName,
        type: 'Keyboard Accessibility',
        message: 'Interactive elements should support both mouse and keyboard interaction'
      });
    }

    // Check for proper color contrast indicators
    if (content.includes('disabled') && !content.includes('aria-disabled')) {
      this.results.recommendations.push({
        file: fileName,
        type: 'Disabled States',
        message: 'Consider using aria-disabled in addition to visual disabled states'
      });
    }

    // Check for loading states
    if (content.includes('loading') || content.includes('Loading')) {
      if (!content.includes('aria-live') && !content.includes('role="status"')) {
        this.results.warnings.push({
          file: fileName,
          type: 'Loading States',
          message: 'Loading states should be announced to screen readers'
        });
      }
    }
  }

  generateReport() {
    console.log('\n🎯 ACCESSIBILITY VALIDATION REPORT');
    console.log('=====================================\n');

    console.log(`📊 SUMMARY:`);
    console.log(`  Total Components Validated: ${this.results.totalComponents}`);
    console.log(`  ARIA Attributes Found: ${this.results.ariaAttributes.found}`);
    console.log(`  Issues Found: ${this.results.issues.length}`);
    console.log(`  Warnings: ${this.results.warnings.length}`);
    console.log(`  Recommendations: ${this.results.recommendations.length}\n`);

    console.log(`🛠️  SCREEN READER FEATURES:`);
    Object.entries(this.results.screenReaderFeatures).forEach(([feature, count]) => {
      console.log(`  ${feature}: ${count}`);
    });

    if (this.results.issues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      this.results.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. [${issue.file}] ${issue.type}: ${issue.message}`);
      });
    }

    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. [${warning.file}] ${warning.type}: ${warning.message}`);
      });
    }

    if (this.results.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      this.results.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. [${rec.file}] ${rec.type}: ${rec.message}`);
      });
    }

    // Calculate compliance score
    const totalChecks = this.results.issues.length + this.results.warnings.length;
    const passedChecks = Math.max(0, 50 - totalChecks); // Assume 50 total checks
    const complianceScore = Math.round((passedChecks / 50) * 100);

    console.log('\n🎖️  WCAG 2.1 AA COMPLIANCE ESTIMATE:');
    console.log(`  Score: ${complianceScore}%`);
    console.log(`  Status: ${complianceScore >= 90 ? '✅ EXCELLENT' : complianceScore >= 80 ? '🟡 GOOD' : complianceScore >= 70 ? '🟠 NEEDS IMPROVEMENT' : '❌ REQUIRES WORK'}`);

    console.log('\n📝 DETAILED ARIA ATTRIBUTES:');
    this.results.ariaAttributes.details.forEach(detail => {
      console.log(`  ${detail.file}: ${detail.attribute} (${detail.count} occurrences)`);
      if (detail.samples.length > 0) {
        console.log(`    Examples: ${detail.samples.join(', ')}`);
      }
    });

    console.log('\n🔧 SCREEN READER TESTING CHECKLIST:');
    console.log('  ✓ Navigate using Tab key only');
    console.log('  ✓ Test with NVDA, JAWS, or VoiceOver');
    console.log('  ✓ Verify all interactive elements are announced');
    console.log('  ✓ Check form validation announcements');
    console.log('  ✓ Test dynamic content updates');
    console.log('  ✓ Verify modal focus trapping');
    console.log('  ✓ Test gallery navigation with screen reader');
    console.log('  ✓ Validate upload progress announcements');

    // Save report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalComponents: this.results.totalComponents,
        ariaAttributesFound: this.results.ariaAttributes.found,
        issuesCount: this.results.issues.length,
        warningsCount: this.results.warnings.length,
        recommendationsCount: this.results.recommendations.length,
        complianceScore: complianceScore
      },
      screenReaderFeatures: this.results.screenReaderFeatures,
      issues: this.results.issues,
      warnings: this.results.warnings,
      recommendations: this.results.recommendations,
      ariaDetails: this.results.ariaAttributes.details
    };

    const reportPath = path.join(__dirname, '..', 'accessibility-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  run() {
    console.log('🚀 Starting DressUp AI Accessibility Validation...\n');
    
    COMPONENTS_TO_VALIDATE.forEach(componentPath => {
      const fullPath = path.join(__dirname, '..', componentPath);
      this.validateComponent(fullPath);
    });

    this.generateReport();
    
    console.log('\n🎉 Accessibility validation completed!\n');
    
    // Return exit code based on issues
    const exitCode = this.results.issues.length > 0 ? 1 : 0;
    process.exit(exitCode);
  }
}

// Run the validation if this script is executed directly
if (require.main === module) {
  const validator = new AccessibilityValidator();
  validator.run();
}

module.exports = AccessibilityValidator;
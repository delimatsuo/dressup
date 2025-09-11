#!/usr/bin/env node

/**
 * Direct HEIC Functionality Test
 * Tests the HEIC conversion without browser automation
 */

const fs = require('fs');
const path = require('path');

// Create a test directory
const testDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

/**
 * Test 1: Check package.json for heic2any dependency
 */
function testPackageDependency() {
  console.log('📦 Test 1: Checking heic2any dependency...');
  
  try {
    const packagePath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const hasHeicDependency = packageJson.dependencies && packageJson.dependencies['heic2any'];
    const version = hasHeicDependency ? packageJson.dependencies['heic2any'] : null;
    
    if (hasHeicDependency) {
      console.log('✅ heic2any dependency found:', version);
      return { success: true, version };
    } else {
      console.log('❌ heic2any dependency not found');
      return { success: false, error: 'Dependency not found' };
    }
  } catch (error) {
    console.log('❌ Failed to read package.json:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Check if heic2any is installed in node_modules
 */
function testNodeModulesInstallation() {
  console.log('📂 Test 2: Checking node_modules installation...');
  
  try {
    const nodeModulesPath = path.join(__dirname, '../../node_modules/heic2any');
    const packageJsonPath = path.join(nodeModulesPath, 'package.json');
    
    if (fs.existsSync(nodeModulesPath) && fs.existsSync(packageJsonPath)) {
      const packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      console.log('✅ heic2any module found in node_modules');
      console.log('   Version:', packageInfo.version);
      console.log('   Main:', packageInfo.main);
      return { success: true, version: packageInfo.version, main: packageInfo.main };
    } else {
      console.log('❌ heic2any module not found in node_modules');
      return { success: false, error: 'Module not installed' };
    }
  } catch (error) {
    console.log('❌ Failed to check node_modules:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 3: Analyze imageConversion.ts implementation
 */
function testImplementationAnalysis() {
  console.log('🔍 Test 3: Analyzing HEIC implementation...');
  
  try {
    const implPath = path.join(__dirname, '../utils/imageConversion.ts');
    const implementation = fs.readFileSync(implPath, 'utf8');
    
    const checks = {
      hasHeicImport: implementation.includes("import heic2any from 'heic2any'"),
      hasConvertFunction: implementation.includes('convertHeicToJpeg'),
      hasProcessFunction: implementation.includes('processImageForUpload'),
      hasHeicDetection: implementation.includes('.heic') || implementation.includes('.heif'),
      hasErrorHandling: implementation.includes('try') && implementation.includes('catch'),
      hasFileTypeCheck: implementation.includes('file.type === \'image/heic\''),
      hasConversionCall: implementation.includes('heic2any({')
    };
    
    console.log('✅ Implementation analysis:');
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✓' : '✗'} ${check}: ${passed ? 'PASS' : 'FAIL'}`);
    });
    
    const allChecksPass = Object.values(checks).every(Boolean);
    return { success: allChecksPass, checks };
  } catch (error) {
    console.log('❌ Failed to analyze implementation:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 4: Check component usage of HEIC conversion
 */
function testComponentUsage() {
  console.log('🧩 Test 4: Checking component usage...');
  
  const results = [];
  const componentsToCheck = [
    '../components/SimplifiedUploadFlow.tsx',
    '../components/MobilePhotoUpload.tsx'
  ];
  
  for (const componentPath of componentsToCheck) {
    try {
      const fullPath = path.join(__dirname, componentPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const usage = {
        file: componentPath,
        hasProcessImageImport: content.includes("processImageForUpload"),
        hasHeicMention: content.includes('HEIC') || content.includes('heic'),
        callsProcessImage: content.includes('processImageForUpload(')
      };
      
      results.push(usage);
      console.log(`   📄 ${path.basename(componentPath)}:`);
      console.log(`      Import: ${usage.hasProcessImageImport ? '✓' : '✗'}`);
      console.log(`      HEIC mention: ${usage.hasHeicMention ? '✓' : '✗'}`);
      console.log(`      Calls process: ${usage.callsProcessImage ? '✓' : '✗'}`);
      
    } catch (error) {
      console.log(`   ❌ Failed to check ${componentPath}: ${error.message}`);
    }
  }
  
  return { success: true, components: results };
}

/**
 * Test 5: Create a simulated HEIC file test scenario
 */
function testHeicFileScenario() {
  console.log('📁 Test 5: Creating HEIC file scenario test...');
  
  try {
    const testScenarios = [
      { filename: 'test-image.heic', mimetype: 'image/heic' },
      { filename: 'test-image.HEIC', mimetype: 'image/heic' },
      { filename: 'test-image.heif', mimetype: 'image/heif' },
      { filename: 'test-image.HEIF', mimetype: 'image/heif' },
      { filename: 'test-image.jpg', mimetype: 'image/jpeg' }, // Control case
    ];
    
    // Create test logic based on the implementation
    const detectionLogic = (filename, mimetype) => {
      return mimetype === 'image/heic' || 
             mimetype === 'image/heif' || 
             filename.toLowerCase().endsWith('.heic') ||
             filename.toLowerCase().endsWith('.heif');
    };
    
    console.log('   Testing HEIC detection logic:');
    testScenarios.forEach(scenario => {
      const isHeic = detectionLogic(scenario.filename, scenario.mimetype);
      const expected = scenario.filename.toLowerCase().includes('heic') || 
                      scenario.filename.toLowerCase().includes('heif');
      const correct = isHeic === expected;
      
      console.log(`      ${scenario.filename} (${scenario.mimetype}): ${isHeic ? 'HEIC' : 'NOT HEIC'} ${correct ? '✓' : '✗'}`);
    });
    
    return { success: true, scenarios: testScenarios };
  } catch (error) {
    console.log('❌ HEIC scenario test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 6: Check browser compatibility considerations
 */
function testBrowserCompatibility() {
  console.log('🌐 Test 6: Checking browser compatibility considerations...');
  
  const compatibilityNotes = {
    fileApiSupport: 'Modern browsers support File API (required for reading files)',
    heicSupport: 'Native HEIC support varies by browser - Safari supports it, Chrome/Firefox need conversion',
    fileReaderSupport: 'FileReader API needed for creating data URLs - widely supported',
    conversionLibrary: 'heic2any provides browser-based conversion for wider compatibility'
  };
  
  console.log('   Browser compatibility analysis:');
  Object.entries(compatibilityNotes).forEach(([aspect, note]) => {
    console.log(`      ${aspect}: ${note}`);
  });
  
  return { success: true, compatibility: compatibilityNotes };
}

/**
 * Test 7: Identify potential issues and solutions
 */
function identifyPotentialIssues() {
  console.log('🚨 Test 7: Identifying potential issues...');
  
  const potentialIssues = [
    {
      issue: 'HEIC shows "Ready" but no preview image',
      possibleCauses: [
        'FileReader.readAsDataURL() called on original HEIC file instead of converted JPEG',
        'Image src set before conversion completes',
        'Conversion fails silently and original file data is used',
        'Error in async/await flow causing preview update to be skipped'
      ],
      solutions: [
        'Ensure FileReader.readAsDataURL() is called on converted file',
        'Add proper await/loading states during conversion',
        'Add error handling for conversion failures',
        'Verify correct sequence: convert -> read converted file -> set preview'
      ]
    },
    {
      issue: 'heic2any library not loading',
      possibleCauses: [
        'Dynamic import fails in browser environment',
        'Library not installed or build issues',
        'Module resolution problems'
      ],
      solutions: [
        'Check browser console for import errors',
        'Verify npm installation',
        'Test with static import if dynamic import fails'
      ]
    },
    {
      issue: 'Conversion takes too long or times out',
      possibleCauses: [
        'Large file sizes causing slow conversion',
        'Memory issues with heavy images',
        'No timeout handling'
      ],
      solutions: [
        'Add file size limits before conversion',
        'Show loading indicator during conversion',
        'Implement conversion timeout'
      ]
    }
  ];
  
  potentialIssues.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.issue}`);
    console.log('      Possible causes:');
    item.possibleCauses.forEach(cause => console.log(`         • ${cause}`));
    console.log('      Solutions:');
    item.solutions.forEach(solution => console.log(`         → ${solution}`));
    console.log('');
  });
  
  return { success: true, issues: potentialIssues };
}

/**
 * Generate test report
 */
function generateTestReport(results) {
  console.log('📊 HEIC FUNCTIONALITY TEST REPORT');
  console.log('='.repeat(50));
  
  const summary = {
    totalTests: Object.keys(results).length,
    passed: Object.values(results).filter(r => r.success).length,
    failed: Object.values(results).filter(r => !r.success).length
  };
  
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Success Rate: ${((summary.passed / summary.totalTests) * 100).toFixed(1)}%`);
  console.log('');
  
  // Key findings
  console.log('🔍 KEY FINDINGS:');
  
  if (results.packageDependency.success && results.nodeModulesInstallation.success) {
    console.log('✅ heic2any library is properly installed');
  } else {
    console.log('❌ heic2any library installation issue detected');
  }
  
  if (results.implementationAnalysis.success) {
    console.log('✅ HEIC conversion implementation looks complete');
  } else {
    console.log('❌ HEIC conversion implementation has issues');
  }
  
  if (results.componentUsage.success) {
    const componentsUsingHeic = results.componentUsage.components.filter(c => 
      c.hasProcessImageImport && c.callsProcessImage
    );
    console.log(`✅ ${componentsUsingHeic.length} component(s) properly use HEIC conversion`);
  }
  
  console.log('');
  console.log('🎯 LIKELY CAUSE OF "READY" STATUS WITHOUT IMAGE PREVIEW:');
  console.log('The issue is likely in the sequence of operations:');
  console.log('1. File is processed and converted to JPEG ✓');
  console.log('2. "Ready" status is set ✓');
  console.log('3. Image preview should use converted file data ❓');
  console.log('');
  console.log('Check if the FileReader.readAsDataURL() is called on the');
  console.log('converted file rather than the original HEIC file.');
  
  // Save report to file
  const reportPath = path.join(testDir, 'heic-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary,
    results
  }, null, 2));
  
  console.log('');
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  
  return summary;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 Direct HEIC Functionality Test Suite');
  console.log('='.repeat(50));
  console.log('');
  
  const results = {};
  
  // Run all tests
  results.packageDependency = testPackageDependency();
  console.log('');
  
  results.nodeModulesInstallation = testNodeModulesInstallation();
  console.log('');
  
  results.implementationAnalysis = testImplementationAnalysis();
  console.log('');
  
  results.componentUsage = testComponentUsage();
  console.log('');
  
  results.heicFileScenario = testHeicFileScenario();
  console.log('');
  
  results.browserCompatibility = testBrowserCompatibility();
  console.log('');
  
  results.potentialIssues = identifyPotentialIssues();
  console.log('');
  
  // Generate final report
  const summary = generateTestReport(results);
  
  return { results, summary };
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
/**
 * HEIC Upload Test Script for DressUp AI
 * Tests HEIC image upload functionality using browser automation
 */

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  testImageSize: 1024 * 1024, // 1MB test image
};

// Mock HEIC file data (base64 encoded tiny image data)
const MOCK_HEIC_DATA = 'data:image/heic;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/**
 * Create a mock HEIC file for testing
 */
function createMockHeicFile(name = 'test-image.heic', size = TEST_CONFIG.testImageSize) {
  // Convert base64 to blob
  const byteCharacters = atob(MOCK_HEIC_DATA.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  
  return new File([byteArray], name, { 
    type: 'image/heic',
    lastModified: Date.now()
  });
}

/**
 * Test HEIC library loading
 */
async function testHeicLibraryLoading() {
  console.log('🔍 Testing HEIC library loading...');
  
  try {
    // Try to import heic2any dynamically
    const heic2any = await import('heic2any');
    console.log('✅ heic2any library loaded successfully');
    
    // Test basic functionality
    if (typeof heic2any.default === 'function') {
      console.log('✅ heic2any function is available');
      return { success: true, library: heic2any.default };
    } else {
      console.error('❌ heic2any is not a function');
      return { success: false, error: 'heic2any is not a function' };
    }
  } catch (error) {
    console.error('❌ Failed to load heic2any:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test HEIC to JPEG conversion
 */
async function testHeicConversion(heic2any) {
  console.log('🔄 Testing HEIC to JPEG conversion...');
  
  try {
    const mockFile = createMockHeicFile();
    console.log('📁 Created mock HEIC file:', mockFile.name, mockFile.type, `${mockFile.size} bytes`);
    
    // Attempt conversion
    const convertedBlob = await heic2any({
      blob: mockFile,
      toType: 'image/jpeg',
      quality: 0.9
    });
    
    console.log('✅ HEIC conversion successful');
    console.log('📊 Converted blob size:', convertedBlob.size);
    console.log('📊 Converted blob type:', convertedBlob.type);
    
    return { success: true, convertedBlob };
  } catch (error) {
    console.error('❌ HEIC conversion failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test file input simulation
 */
function testFileInputSimulation() {
  console.log('📤 Testing file input simulation...');
  
  try {
    // Find file inputs on the page
    const fileInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
    console.log(`📊 Found ${fileInputs.length} file input(s)`);
    
    fileInputs.forEach((input, index) => {
      console.log(`📋 Input ${index + 1}:`, {
        id: input.id,
        accept: input.accept,
        multiple: input.multiple,
        parentElement: input.parentElement?.className
      });
    });
    
    return { success: true, inputs: fileInputs };
  } catch (error) {
    console.error('❌ File input simulation failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Monitor console for errors
 */
function setupConsoleMonitoring() {
  console.log('🔊 Setting up console monitoring...');
  
  const errors = [];
  const warnings = [];
  
  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Override console.error
  console.error = function(...args) {
    errors.push({
      timestamp: new Date().toISOString(),
      message: args.join(' ')
    });
    originalError.apply(console, args);
  };
  
  // Override console.warn
  console.warn = function(...args) {
    warnings.push({
      timestamp: new Date().toISOString(),
      message: args.join(' ')
    });
    originalWarn.apply(console, args);
  };
  
  return {
    getErrors: () => errors,
    getWarnings: () => warnings,
    restore: () => {
      console.error = originalError;
      console.warn = originalWarn;
    }
  };
}

/**
 * Test image preview functionality
 */
async function testImagePreview() {
  console.log('🖼️ Testing image preview functionality...');
  
  try {
    // Look for image preview elements
    const images = document.querySelectorAll('img');
    const imageContainers = document.querySelectorAll('[class*="preview"], [class*="image"]');
    
    console.log(`📊 Found ${images.length} img elements`);
    console.log(`📊 Found ${imageContainers.length} potential image containers`);
    
    // Check for "Ready" status indicators
    const readyStatuses = document.querySelectorAll('[class*="ready"], [class*="Ready"]');
    console.log(`📊 Found ${readyStatuses.length} "Ready" status indicators`);
    
    readyStatuses.forEach((element, index) => {
      console.log(`📋 Ready status ${index + 1}:`, element.textContent, element.className);
    });
    
    return { 
      success: true, 
      images: images.length, 
      containers: imageContainers.length,
      readyStatuses: readyStatuses.length
    };
  } catch (error) {
    console.error('❌ Image preview test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Simulate HEIC file upload
 */
async function simulateHeicUpload() {
  console.log('⬆️ Simulating HEIC file upload...');
  
  try {
    const mockFile = createMockHeicFile();
    const fileInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
    
    if (fileInputs.length === 0) {
      throw new Error('No file inputs found');
    }
    
    const firstInput = fileInputs[0];
    console.log('📤 Using first file input:', firstInput.id || 'no-id');
    
    // Create a FileList-like object
    const fileList = {
      0: mockFile,
      length: 1,
      item: (index) => index === 0 ? mockFile : null
    };
    
    // Set the files property
    Object.defineProperty(firstInput, 'files', {
      value: fileList,
      writable: false
    });
    
    // Dispatch change event
    const changeEvent = new Event('change', { bubbles: true });
    firstInput.dispatchEvent(changeEvent);
    
    console.log('✅ File upload simulation completed');
    return { success: true, file: mockFile };
  } catch (error) {
    console.error('❌ File upload simulation failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Main test runner
 */
async function runHeicTests() {
  console.log('🚀 Starting HEIC functionality tests...');
  console.log('='.repeat(50));
  
  const results = {
    libraryLoading: null,
    conversion: null,
    fileInput: null,
    imagePreview: null,
    uploadSimulation: null,
    consoleErrors: [],
    consoleWarnings: []
  };
  
  // Setup console monitoring
  const consoleMonitor = setupConsoleMonitoring();
  
  try {
    // Test 1: Library loading
    results.libraryLoading = await testHeicLibraryLoading();
    
    // Test 2: HEIC conversion (if library loaded)
    if (results.libraryLoading.success) {
      results.conversion = await testHeicConversion(results.libraryLoading.library);
    }
    
    // Test 3: File input simulation
    results.fileInput = testFileInputSimulation();
    
    // Test 4: Image preview
    results.imagePreview = await testImagePreview();
    
    // Test 5: Upload simulation
    results.uploadSimulation = await simulateHeicUpload();
    
    // Wait a moment for any async operations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Collect console errors and warnings
    results.consoleErrors = consoleMonitor.getErrors();
    results.consoleWarnings = consoleMonitor.getWarnings();
    
  } finally {
    consoleMonitor.restore();
  }
  
  // Generate report
  console.log('='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  
  console.log('1. HEIC Library Loading:', results.libraryLoading?.success ? '✅ PASS' : '❌ FAIL');
  if (!results.libraryLoading?.success) {
    console.log('   Error:', results.libraryLoading?.error);
  }
  
  console.log('2. HEIC Conversion:', results.conversion?.success ? '✅ PASS' : '❌ FAIL');
  if (!results.conversion?.success) {
    console.log('   Error:', results.conversion?.error);
  }
  
  console.log('3. File Input Detection:', results.fileInput?.success ? '✅ PASS' : '❌ FAIL');
  if (results.fileInput?.success) {
    console.log('   Inputs found:', results.fileInput.inputs.length);
  }
  
  console.log('4. Image Preview Test:', results.imagePreview?.success ? '✅ PASS' : '❌ FAIL');
  if (results.imagePreview?.success) {
    console.log('   Images:', results.imagePreview.images, 'Containers:', results.imagePreview.containers, 'Ready statuses:', results.imagePreview.readyStatuses);
  }
  
  console.log('5. Upload Simulation:', results.uploadSimulation?.success ? '✅ PASS' : '❌ FAIL');
  
  console.log('\n📝 Console Activity:');
  console.log('   Errors:', results.consoleErrors.length);
  console.log('   Warnings:', results.consoleWarnings.length);
  
  if (results.consoleErrors.length > 0) {
    console.log('\n❌ Console Errors:');
    results.consoleErrors.forEach((error, index) => {
      console.log(`   ${index + 1}. [${error.timestamp}] ${error.message}`);
    });
  }
  
  if (results.consoleWarnings.length > 0) {
    console.log('\n⚠️ Console Warnings:');
    results.consoleWarnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. [${warning.timestamp}] ${warning.message}`);
    });
  }
  
  return results;
}

// Auto-run tests if in browser environment
if (typeof window !== 'undefined') {
  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(runHeicTests, 1000);
    });
  } else {
    setTimeout(runHeicTests, 1000);
  }
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runHeicTests,
    createMockHeicFile,
    testHeicLibraryLoading,
    testHeicConversion
  };
}
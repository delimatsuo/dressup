#!/usr/bin/env node

/**
 * HEIC Test Runner - Opens browser and runs HEIC upload tests
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 60000, // 1 minute timeout
  testScriptPath: path.join(__dirname, 'heic-test-script.js')
};

/**
 * Check if the development server is running
 */
async function checkServerRunning() {
  console.log('🔍 Checking if development server is running...');
  
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(TEST_CONFIG.baseUrl, { 
      timeout: 5000,
      signal: AbortSignal.timeout(5000)
    });
    console.log('✅ Server is running on', TEST_CONFIG.baseUrl);
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start it with: npm run dev');
    console.log('   Error:', error.message);
    return false;
  }
}

/**
 * Create a test HTML page that loads our script
 */
function createTestHtml() {
  const testHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HEIC Upload Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .status {
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
        }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 HEIC Upload Functionality Test</h1>
        <div id="test-status" class="status info">
            ⏳ Initializing tests... Please wait.
        </div>
        <div id="test-results"></div>
        
        <!-- Test iframe to load the actual app -->
        <h2>🖥️ DressUp App (Test Target)</h2>
        <iframe 
            id="app-iframe"
            src="${TEST_CONFIG.baseUrl}"
            width="100%"
            height="600"
            frameborder="1"
            style="border-radius: 4px; margin-top: 10px;">
        </iframe>
        
        <div style="margin-top: 20px;">
            <button id="run-tests" style="padding: 10px 20px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                🚀 Run HEIC Tests
            </button>
            <button id="manual-test" style="padding: 10px 20px; font-size: 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                📱 Manual Test
            </button>
        </div>
        
        <div id="manual-instructions" style="display: none; margin-top: 20px; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px;">
            <h3>📋 Manual Testing Instructions</h3>
            <ol>
                <li>In the iframe above, try to upload a HEIC image file</li>
                <li>Watch for the "Ready" status to appear</li>
                <li>Check if the image preview displays</li>
                <li>Open browser dev tools (F12) to monitor console for errors</li>
                <li>Look for heic2any related messages in the console</li>
            </ol>
        </div>
    </div>

    <script>
        let testResults = [];
        
        // Load and run the test script
        async function runTests() {
            const statusDiv = document.getElementById('test-status');
            const resultsDiv = document.getElementById('test-results');
            
            statusDiv.className = 'status info';
            statusDiv.innerHTML = '⏳ Running HEIC tests...';
            
            try {
                // Get the iframe and its window
                const iframe = document.getElementById('app-iframe');
                const appWindow = iframe.contentWindow;
                const appDocument = iframe.contentDocument;
                
                if (!appWindow || !appDocument) {
                    throw new Error('Cannot access iframe content. Check CORS policy.');
                }
                
                // Wait for the iframe to load
                await new Promise((resolve, reject) => {
                    if (iframe.contentDocument.readyState === 'complete') {
                        resolve();
                    } else {
                        iframe.onload = resolve;
                        iframe.onerror = reject;
                        setTimeout(() => reject(new Error('Iframe load timeout')), 10000);
                    }
                });
                
                console.log('✅ Iframe loaded successfully');
                
                // Inject our test script into the iframe
                const script = appDocument.createElement('script');
                script.textContent = \`${fs.readFileSync(TEST_CONFIG.testScriptPath, 'utf8')}\`;
                appDocument.head.appendChild(script);
                
                console.log('✅ Test script injected');
                
                // Wait for tests to complete
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                statusDiv.className = 'status success';
                statusDiv.innerHTML = '✅ HEIC tests completed! Check console and iframe for results.';
                
                // Try to get results from iframe console
                const iframeConsole = appWindow.console;
                if (iframeConsole) {
                    console.log('📊 Check the browser console for detailed test results');
                }
                
            } catch (error) {
                console.error('❌ Test execution failed:', error);
                statusDiv.className = 'status error';
                statusDiv.innerHTML = \`❌ Test failed: \${error.message}\`;
                
                resultsDiv.innerHTML = \`
                    <h3>❌ Error Details</h3>
                    <pre>\${error.stack || error.message}</pre>
                    <p><strong>Troubleshooting:</strong></p>
                    <ul>
                        <li>Make sure the development server is running on port 3000</li>
                        <li>Check browser console for additional errors</li>
                        <li>Try refreshing the page</li>
                    </ul>
                \`;
            }
        }
        
        function showManualInstructions() {
            const instructions = document.getElementById('manual-instructions');
            instructions.style.display = instructions.style.display === 'none' ? 'block' : 'none';
        }
        
        // Event listeners
        document.getElementById('run-tests').addEventListener('click', runTests);
        document.getElementById('manual-test').addEventListener('click', showManualInstructions);
        
        // Auto-run tests after 2 seconds
        setTimeout(() => {
            console.log('🚀 Starting automated HEIC tests...');
            runTests();
        }, 2000);
    </script>
</body>
</html>`;

  const testHtmlPath = path.join(__dirname, 'heic-test.html');
  fs.writeFileSync(testHtmlPath, testHtml, 'utf8');
  return testHtmlPath;
}

/**
 * Open browser with the test page
 */
function openBrowser(testHtmlPath) {
  console.log('🌐 Opening browser for HEIC testing...');
  
  const platform = process.platform;
  let command;
  
  if (platform === 'darwin') {
    command = 'open';
  } else if (platform === 'win32') {
    command = 'start';
  } else {
    command = 'xdg-open';
  }
  
  const browser = spawn(command, [testHtmlPath], {
    stdio: 'inherit',
    detached: true
  });
  
  browser.unref();
  console.log('✅ Browser opened with test page');
}

/**
 * Main function
 */
async function main() {
  console.log('🧪 HEIC Upload Test Runner');
  console.log('='.repeat(40));
  
  // Check if server is running
  const serverRunning = await checkServerRunning();
  if (!serverRunning) {
    process.exit(1);
  }
  
  // Create test HTML page
  console.log('📄 Creating test HTML page...');
  const testHtmlPath = createTestHtml();
  console.log('✅ Test page created:', testHtmlPath);
  
  // Open browser
  openBrowser(testHtmlPath);
  
  console.log('');
  console.log('📋 What to look for:');
  console.log('1. Check if heic2any library loads without errors');
  console.log('2. Try uploading a HEIC file and watch for conversion');
  console.log('3. Verify "Ready" status appears but image preview may not show');
  console.log('4. Monitor browser console for JavaScript errors');
  console.log('5. Test both SimplifiedUploadFlow and MobilePhotoUpload components');
  console.log('');
  console.log('✨ Test page will auto-run tests and display results');
  console.log('💡 Keep this terminal open and check the browser window');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { main, checkServerRunning };
#!/usr/bin/env node

/**
 * Script to set up Firebase Storage lifecycle rules
 * Run this after deploying functions to configure automatic cleanup
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'project-friday-471118';
const BUCKET_NAME = `${PROJECT_ID}.appspot.com`;

console.log('🔄 Setting up Firebase Storage lifecycle rules...');

// Check if lifecycle config exists
const lifecycleConfigPath = path.join(__dirname, '..', 'storage-lifecycle.json');
if (!fs.existsSync(lifecycleConfigPath)) {
  console.error('❌ storage-lifecycle.json not found');
  process.exit(1);
}

// Read and validate lifecycle config
let lifecycleConfig;
try {
  lifecycleConfig = JSON.parse(fs.readFileSync(lifecycleConfigPath, 'utf8'));
  console.log('✅ Lifecycle configuration loaded');
} catch (error) {
  console.error('❌ Error reading lifecycle config:', error.message);
  process.exit(1);
}

// Function to execute shell commands
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function setupLifecycleRules() {
  try {
    console.log(`📦 Configuring lifecycle rules for bucket: ${BUCKET_NAME}`);
    
    // Apply lifecycle configuration using gsutil
    const command = `echo '${JSON.stringify(lifecycleConfig)}' | gsutil lifecycle set /dev/stdin gs://${BUCKET_NAME}`;
    
    const result = await execPromise(command);
    
    console.log('✅ Storage lifecycle rules applied successfully');
    console.log('📋 Current lifecycle configuration:');
    
    // Display current lifecycle rules
    lifecycleConfig.lifecycle.rule.forEach((rule, index) => {
      console.log(`   Rule ${index + 1}:`);
      console.log(`     Action: ${rule.action.type}`);
      if (rule.action.storageClass) {
        console.log(`     Storage Class: ${rule.action.storageClass}`);
      }
      console.log(`     Condition: Age ${rule.condition.age} days`);
      if (rule.condition.matchesPrefix) {
        console.log(`     Applies to: ${rule.condition.matchesPrefix.join(', ')}`);
      }
      console.log('');
    });

    console.log('🚀 Lifecycle rules are now active and will automatically manage storage costs');
    
  } catch (error) {
    console.error('❌ Error setting up lifecycle rules:', error.message);
    console.error('');
    console.error('📝 Manual setup instructions:');
    console.error('1. Install Google Cloud SDK if not already installed');
    console.error('2. Authenticate: gcloud auth login');
    console.error(`3. Set project: gcloud config set project ${PROJECT_ID}`);
    console.error(`4. Apply lifecycle: gsutil lifecycle set storage-lifecycle.json gs://${BUCKET_NAME}`);
    process.exit(1);
  }
}

// Run the setup
setupLifecycleRules();
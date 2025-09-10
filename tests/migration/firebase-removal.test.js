/**
 * Tests for Firebase Dependency Removal
 * Task 1.1: Remove Firebase Dependencies and Configuration
 * 
 * TDD Protocol: These tests verify complete removal of Firebase from the project
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

describe('Firebase Dependency Removal', () => {
  const projectRoot = path.join(__dirname, '../..');
  
  describe('Package.json cleanup', () => {
    it('should not contain any Firebase dependencies', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const dependencies = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
      };
      
      const firebasePackages = Object.keys(dependencies).filter(pkg => 
        pkg.includes('firebase') || 
        pkg.includes('@firebase') ||
        pkg === 'firebase-admin' ||
        pkg === 'firebase-functions'
      );
      
      expect(firebasePackages).toHaveLength(0);
    });
    
    it('should not contain any Firebase scripts', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const scripts = packageJson.scripts || {};
      const firebaseScripts = Object.entries(scripts).filter(([key, value]) =>
        key.includes('firebase') || 
        value.includes('firebase') ||
        value.includes('emulator')
      );
      
      expect(firebaseScripts).toHaveLength(0);
    });
  });
  
  describe('Functions package.json cleanup', () => {
    it('should not have functions/package.json if functions directory exists', () => {
      const functionsPackagePath = path.join(projectRoot, 'functions/package.json');
      
      if (fs.existsSync(path.join(projectRoot, 'functions'))) {
        const packageJson = JSON.parse(fs.readFileSync(functionsPackagePath, 'utf8'));
        
        const dependencies = {
          ...packageJson.dependencies || {},
          ...packageJson.devDependencies || {}
        };
        
        const firebasePackages = Object.keys(dependencies).filter(pkg => 
          pkg.includes('firebase') || 
          pkg.includes('@firebase')
        );
        
        expect(firebasePackages).toHaveLength(0);
      }
    });
  });
  
  describe('Firebase configuration files', () => {
    it('should not have firebase.json', () => {
      const firebaseJsonPath = path.join(projectRoot, 'firebase.json');
      expect(fs.existsSync(firebaseJsonPath)).toBe(false);
    });
    
    it('should not have .firebaserc', () => {
      const firebasercPath = path.join(projectRoot, '.firebaserc');
      expect(fs.existsSync(firebasercPath)).toBe(false);
    });
    
    it('should not have firestore.rules', () => {
      const firestoreRulesPath = path.join(projectRoot, 'firestore.rules');
      expect(fs.existsSync(firestoreRulesPath)).toBe(false);
    });
    
    it('should not have storage.rules', () => {
      const storageRulesPath = path.join(projectRoot, 'storage.rules');
      expect(fs.existsSync(storageRulesPath)).toBe(false);
    });
    
    it('should not have .firebase directory', () => {
      const firebaseDirPath = path.join(projectRoot, '.firebase');
      expect(fs.existsSync(firebaseDirPath)).toBe(false);
    });
  });
  
  describe('Source code cleanup', () => {
    it('should not have src/lib/firebase.ts or firebase.js', () => {
      const firebaseTsPath = path.join(projectRoot, 'src/lib/firebase.ts');
      const firebaseJsPath = path.join(projectRoot, 'src/lib/firebase.js');
      
      expect(fs.existsSync(firebaseTsPath)).toBe(false);
      expect(fs.existsSync(firebaseJsPath)).toBe(false);
    });
    
    it('should not contain any Firebase imports in TypeScript/JavaScript files', () => {
      const srcFiles = glob.sync('src/**/*.{ts,tsx,js,jsx}', {
        cwd: projectRoot,
        absolute: true
      });
      
      const filesWithFirebaseImports = [];
      
      srcFiles.forEach(file => {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          const hasFirebaseImport = 
            content.includes('from \'firebase') ||
            content.includes('from "firebase') ||
            content.includes('require(\'firebase') ||
            content.includes('require("firebase') ||
            content.includes('from \'@firebase') ||
            content.includes('from "@firebase') ||
            content.includes('firebase/app') ||
            content.includes('firebase/auth') ||
            content.includes('firebase/storage') ||
            content.includes('firebase/firestore') ||
            content.includes('firebase/functions');
          
          if (hasFirebaseImport) {
            filesWithFirebaseImports.push(path.relative(projectRoot, file));
          }
        }
      });
      
      expect(filesWithFirebaseImports).toHaveLength(0);
    });
    
    it('should not reference Firebase in environment variables', () => {
      const envExamplePath = path.join(projectRoot, '.env.example');
      
      if (fs.existsSync(envExamplePath)) {
        const content = fs.readFileSync(envExamplePath, 'utf8');
        const firebaseEnvVars = content.split('\n').filter(line =>
          line.includes('FIREBASE') ||
          line.includes('REACT_APP_FIREBASE') ||
          line.includes('NEXT_PUBLIC_FIREBASE')
        );
        
        expect(firebaseEnvVars).toHaveLength(0);
      }
    });
  });
  
  describe('Gitignore cleanup', () => {
    it('should not have Firebase-specific entries in .gitignore', () => {
      const gitignorePath = path.join(projectRoot, '.gitignore');
      
      if (fs.existsSync(gitignorePath)) {
        const content = fs.readFileSync(gitignorePath, 'utf8');
        const firebaseEntries = content.split('\n').filter(line =>
          line.includes('firebase') ||
          line.includes('.firebase') ||
          line.includes('firebase-debug') ||
          line.includes('firestore-debug') ||
          line.includes('ui-debug.log')
        );
        
        // Allow .firebase in comments
        const nonCommentFirebaseEntries = firebaseEntries.filter(line => 
          !line.trim().startsWith('#')
        );
        
        expect(nonCommentFirebaseEntries).toHaveLength(0);
      }
    });
  });
  
  describe('Functions directory removal', () => {
    it('should not have Firebase-specific code in functions directory if it exists', () => {
      const functionsPath = path.join(projectRoot, 'functions');
      
      if (fs.existsSync(functionsPath)) {
        const functionFiles = glob.sync('**/*.{ts,js}', {
          cwd: functionsPath,
          absolute: true
        });
        
        const filesWithFirebaseSDK = [];
        
        functionFiles.forEach(file => {
          // Skip directories
          if (!fs.statSync(file).isFile()) return;
          const content = fs.readFileSync(file, 'utf8');
          if (
            content.includes('firebase-functions') ||
            content.includes('firebase-admin') ||
            content.includes('functions.https') ||
            content.includes('functions.firestore') ||
            content.includes('admin.initializeApp')
          ) {
            filesWithFirebaseSDK.push(path.relative(functionsPath, file));
          }
        });
        
        expect(filesWithFirebaseSDK).toHaveLength(0);
      }
    });
  });
});
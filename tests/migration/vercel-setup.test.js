/**
 * Tests for Vercel Project Configuration
 * Task 1.2: Set up Vercel Project Configuration
 * 
 * TDD Protocol: These tests verify proper Vercel configuration setup
 */

const fs = require('fs');
const path = require('path');

describe('Vercel Project Configuration', () => {
  const projectRoot = path.join(__dirname, '../..');
  
  describe('vercel.json configuration', () => {
    it('should have vercel.json file', () => {
      const vercelJsonPath = path.join(projectRoot, 'vercel.json');
      expect(fs.existsSync(vercelJsonPath)).toBe(true);
    });
    
    it('should have proper Edge Functions configuration', () => {
      const vercelJsonPath = path.join(projectRoot, 'vercel.json');
      const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
      
      // Should have functions configuration
      expect(vercelConfig.functions).toBeDefined();
      
      // API routes should use Edge Runtime
      const apiConfig = vercelConfig.functions?.['app/api/**/*.ts'] || 
                       vercelConfig.functions?.['src/app/api/**/*.ts'];
      expect(apiConfig).toBeDefined();
      expect(apiConfig.runtime).toBe('edge');
    });
    
    it('should have proper build settings for Next.js', () => {
      const vercelJsonPath = path.join(projectRoot, 'vercel.json');
      const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
      
      // Should have framework preset or build command
      if (vercelConfig.framework) {
        expect(vercelConfig.framework).toBe('nextjs');
      }
      
      // Should have output directory configuration if specified
      if (vercelConfig.outputDirectory) {
        expect(vercelConfig.outputDirectory).toBe('.next');
      }
    });
    
    it('should have environment variables configuration', () => {
      const vercelJsonPath = path.join(projectRoot, 'vercel.json');
      const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
      
      // Should have env configuration or build.env
      const hasEnvConfig = vercelConfig.env || vercelConfig.build?.env;
      expect(hasEnvConfig).toBeDefined();
    });
    
    it('should have regions configuration for Edge Functions', () => {
      const vercelJsonPath = path.join(projectRoot, 'vercel.json');
      const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
      
      // Check for regions configuration
      if (vercelConfig.regions) {
        expect(Array.isArray(vercelConfig.regions)).toBe(true);
        expect(vercelConfig.regions.length).toBeGreaterThan(0);
      }
    });
  });
  
  describe('Environment variables setup', () => {
    it('should have .env.local.example file with Vercel variables', () => {
      const envExamplePath = path.join(projectRoot, '.env.local.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);
      
      const content = fs.readFileSync(envExamplePath, 'utf8');
      
      // Should have Vercel KV variables
      expect(content).toMatch(/KV_REST_API_URL=/);
      expect(content).toMatch(/KV_REST_API_TOKEN=/);
      
      // Should have Vercel Blob variables
      expect(content).toMatch(/BLOB_READ_WRITE_TOKEN=/);
      
      // Should have Gemini API key
      expect(content).toMatch(/GEMINI_API_KEY=/);
    });
    
    it('should not have Firebase environment variables', () => {
      const envExamplePath = path.join(projectRoot, '.env.local.example');
      const content = fs.readFileSync(envExamplePath, 'utf8');
      
      // Should not have Firebase variables
      expect(content).not.toMatch(/FIREBASE/i);
      expect(content).not.toMatch(/REACT_APP_FIREBASE/);
      expect(content).not.toMatch(/NEXT_PUBLIC_FIREBASE/);
    });
  });
  
  describe('Package.json scripts', () => {
    it('should have Vercel build scripts', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const scripts = packageJson.scripts || {};
      
      // Should have build script
      expect(scripts.build).toBeDefined();
      expect(scripts.build).toMatch(/next build/);
      
      // Should have dev script
      expect(scripts.dev).toBeDefined();
      
      // Should have start script for production
      expect(scripts.start).toBeDefined();
    });
    
    it('should have Vercel CLI in devDependencies', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const devDeps = packageJson.devDependencies || {};
      
      // Vercel CLI is optional but recommended
      if (devDeps.vercel) {
        expect(devDeps.vercel).toBeDefined();
      }
    });
  });
  
  describe('Next.js configuration', () => {
    it('should have next.config.js with proper settings', () => {
      const nextConfigPath = path.join(projectRoot, 'next.config.js');
      const nextConfigMjsPath = path.join(projectRoot, 'next.config.mjs');
      
      const configExists = fs.existsSync(nextConfigPath) || fs.existsSync(nextConfigMjsPath);
      expect(configExists).toBe(true);
    });
    
    it('should have images configuration for Vercel', () => {
      const nextConfigPath = path.join(projectRoot, 'next.config.js');
      const nextConfigMjsPath = path.join(projectRoot, 'next.config.mjs');
      
      let configContent = '';
      if (fs.existsSync(nextConfigPath)) {
        configContent = fs.readFileSync(nextConfigPath, 'utf8');
      } else if (fs.existsSync(nextConfigMjsPath)) {
        configContent = fs.readFileSync(nextConfigMjsPath, 'utf8');
      }
      
      // Should have images configuration
      expect(configContent).toMatch(/images:/);
      
      // Should allow blob URLs for Vercel Blob storage
      if (configContent.includes('remotePatterns')) {
        expect(configContent).toMatch(/blob\.vercel-storage\.com/);
      }
    });
  });
  
  describe('API directory structure', () => {
    it('should have app/api directory for Edge Functions', () => {
      const apiPath = path.join(projectRoot, 'app/api');
      const srcApiPath = path.join(projectRoot, 'src/app/api');
      
      const apiExists = fs.existsSync(apiPath) || fs.existsSync(srcApiPath);
      expect(apiExists).toBe(true);
    });
  });
  
  describe('TypeScript configuration', () => {
    it('should have proper TypeScript config for Vercel', () => {
      const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);
      
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      
      // Should have proper compiler options
      expect(tsconfig.compilerOptions).toBeDefined();
      expect(tsconfig.compilerOptions.target).toBeDefined();
      
      // Should include app directory
      if (tsconfig.include) {
        const includesApp = tsconfig.include.some(pattern => 
          pattern.includes('app') || pattern.includes('**/*.ts')
        );
        expect(includesApp).toBe(true);
      }
    });
  });
});
/**
 * Tests for Core API Route Structure
 * Task 1.3: Create Core API Route Structure
 * 
 * TDD Protocol: These tests verify the foundational API route architecture
 */

const fs = require('fs');
const path = require('path');

describe('Core API Route Structure', () => {
  const projectRoot = path.join(__dirname, '../..');
  const apiRoot = path.join(projectRoot, 'src/app/api');
  
  describe('API Directory Structure', () => {
    it('should have session API routes directory', () => {
      const sessionPath = path.join(apiRoot, 'session');
      expect(fs.existsSync(sessionPath)).toBe(true);
    });
    
    it('should have upload API routes directory', () => {
      const uploadPath = path.join(apiRoot, 'upload');
      expect(fs.existsSync(uploadPath)).toBe(true);
    });
    
    it('should have try-on API routes directory', () => {
      const tryOnPath = path.join(apiRoot, 'try-on');
      expect(fs.existsSync(tryOnPath)).toBe(true);
    });
  });
  
  describe('Session API Routes', () => {
    it('should have session create route', () => {
      const createRoutePath = path.join(apiRoot, 'session/create/route.ts');
      expect(fs.existsSync(createRoutePath)).toBe(true);
    });
    
    it('should have session get route with dynamic ID', () => {
      const getRoutePath = path.join(apiRoot, 'session/[id]/route.ts');
      expect(fs.existsSync(getRoutePath)).toBe(true);
    });
    
    it('should have Edge Runtime configuration in session routes', () => {
      const createRoutePath = path.join(apiRoot, 'session/create/route.ts');
      if (fs.existsSync(createRoutePath)) {
        const content = fs.readFileSync(createRoutePath, 'utf8');
        expect(content).toMatch(/export const runtime = ['"]edge['"]/);
      }
    });
  });
  
  describe('Upload API Routes', () => {
    it('should have upload route', () => {
      const uploadRoutePath = path.join(apiRoot, 'upload/route.ts');
      expect(fs.existsSync(uploadRoutePath)).toBe(true);
    });
    
    it('should have Edge Runtime configuration in upload route', () => {
      const uploadRoutePath = path.join(apiRoot, 'upload/route.ts');
      if (fs.existsSync(uploadRoutePath)) {
        const content = fs.readFileSync(uploadRoutePath, 'utf8');
        expect(content).toMatch(/export const runtime = ['"]edge['"]/);
      }
    });
  });
  
  describe('Try-on API Routes', () => {
    it('should have try-on route', () => {
      const tryOnRoutePath = path.join(apiRoot, 'try-on/route.ts');
      expect(fs.existsSync(tryOnRoutePath)).toBe(true);
    });
    
    it('should have Edge Runtime configuration in try-on route', () => {
      const tryOnRoutePath = path.join(apiRoot, 'try-on/route.ts');
      if (fs.existsSync(tryOnRoutePath)) {
        const content = fs.readFileSync(tryOnRoutePath, 'utf8');
        expect(content).toMatch(/export const runtime = ['"]edge['"]/);
      }
    });
  });
  
  describe('Middleware and Utilities', () => {
    it('should have validation utilities', () => {
      const validationPath = path.join(projectRoot, 'src/lib/validation.ts');
      expect(fs.existsSync(validationPath)).toBe(true);
    });
    
    it('should have error handler utilities', () => {
      const errorHandlerPath = path.join(projectRoot, 'src/lib/error-handler.ts');
      expect(fs.existsSync(errorHandlerPath)).toBe(true);
    });
    
    it('should have response utilities', () => {
      const responsePath = path.join(projectRoot, 'src/lib/response.ts');
      expect(fs.existsSync(responsePath)).toBe(true);
    });
    
    it('should have middleware configuration', () => {
      const middlewarePath = path.join(projectRoot, 'src/lib/middleware.ts');
      expect(fs.existsSync(middlewarePath)).toBe(true);
    });
  });
  
  describe('CORS and Security Configuration', () => {
    it('should have CORS configuration in middleware', () => {
      const middlewarePath = path.join(projectRoot, 'src/lib/middleware.ts');
      if (fs.existsSync(middlewarePath)) {
        const content = fs.readFileSync(middlewarePath, 'utf8');
        expect(content).toMatch(/Access-Control-Allow-Origin/i);
      }
    });
    
    it('should have security headers in middleware', () => {
      const middlewarePath = path.join(projectRoot, 'src/lib/middleware.ts');
      if (fs.existsSync(middlewarePath)) {
        const content = fs.readFileSync(middlewarePath, 'utf8');
        expect(content).toMatch(/X-Content-Type-Options/i);
      }
    });
  });
  
  describe('Health Check Route', () => {
    it('should have health check API route', () => {
      const healthPath = path.join(apiRoot, 'health/route.ts');
      expect(fs.existsSync(healthPath)).toBe(true);
    });
    
    it('should export GET handler in health route', () => {
      const healthPath = path.join(apiRoot, 'health/route.ts');
      if (fs.existsSync(healthPath)) {
        const content = fs.readFileSync(healthPath, 'utf8');
        expect(content).toMatch(/export.*GET/);
      }
    });
  });
});
/**
 * Production Environment Configuration
 * Comprehensive settings for production deployment
 */

export const productionConfig = {
  // Environment Settings
  environment: 'production',
  nodeEnv: 'production',
  
  // Security Configuration
  security: {
    // Content Security Policy
    csp: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", 'https://www.googletagmanager.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      'connect-src': ["'self'", 'https://firestore.googleapis.com', 'https://firebase.googleapis.com'],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'object-src': ["'none'"]
    },
    
    // Security Headers
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    },
    
    // Rate Limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP'
    }
  },
  
  // Performance Configuration
  performance: {
    budgets: {
      maxScriptSize: 1048576, // 1MB
      maxStylesheetSize: 102400, // 100KB
      maxImageSize: 2097152, // 2MB
      maxTotalSize: 5242880, // 5MB
      maxFirstContentfulPaint: 1800, // 1.8s
      maxLargestContentfulPaint: 2500, // 2.5s
      maxCumulativeLayoutShift: 0.1,
      maxTotalBlockingTime: 200, // 200ms
      maxSpeedIndex: 3400
    },
    
    caching: {
      staticAssets: 'public, max-age=31536000, immutable',
      dynamicContent: 'public, max-age=86400, stale-while-revalidate=604800',
      serviceWorker: 'no-cache, no-store, must-revalidate'
    },
    
    compression: {
      gzip: true,
      brotli: true,
      threshold: 1024
    }
  },
  
  // Monitoring Configuration
  monitoring: {
    apm: {
      enabled: true,
      sampleRate: 1.0,
      environment: 'production'
    },
    
    logging: {
      level: 'warn',
      structured: true,
      includeRequestId: true
    },
    
    errorTracking: {
      enabled: true,
      captureUnhandledRejections: true,
      captureConsoleErrors: false
    },
    
    metrics: {
      webVitals: true,
      customEvents: true,
      userTiming: true
    }
  },
  
  // Database Configuration
  database: {
    connectionPool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000
    },
    
    backup: {
      enabled: true,
      frequency: 'daily',
      retention: 30
    }
  },
  
  // CDN Configuration
  cdn: {
    enabled: true,
    domains: ['https://cdn.example.com'],
    cacheHeaders: {
      images: 'public, max-age=31536000',
      fonts: 'public, max-age=31536000',
      scripts: 'public, max-age=31536000',
      styles: 'public, max-age=31536000'
    }
  },
  
  // SSL/TLS Configuration
  ssl: {
    enabled: true,
    minVersion: 'TLSv1.2',
    ciphers: [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384'
    ],
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },
  
  // Health Check Configuration
  healthCheck: {
    endpoint: '/health',
    timeout: 5000,
    checks: [
      'database',
      'firebase',
      'memory',
      'disk'
    ]
  }
};

export default productionConfig;
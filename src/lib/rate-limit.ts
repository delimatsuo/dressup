/**
 * Enhanced Rate Limiting with Vercel KV Storage
 * Edge Runtime compatible rate limiting implementation
 */

import { kvGet, kvSet } from './kv';
import type { RateLimitInfo } from '@/types/api';

// ================================
// Rate Limiting Configuration
// ================================

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (identifier: string) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (identifier: string, info: RateLimitInfo) => void;
}

export interface RateLimitStore {
  count: number;
  resetTime: number; // Unix timestamp
  firstRequest: number; // Unix timestamp
}

// ================================
// Default Configurations
// ================================

export const DEFAULT_RATE_LIMITS = {
  // General API rate limit
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
  // Upload specific rate limit
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  // Try-on processing rate limit
  tryOn: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
  },
  // Session creation rate limit
  session: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  },
  // Strict rate limit for potential abuse
  strict: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
  }
} as const;

// ================================
// Rate Limiter Class
// ================================

export class RateLimiter {
  constructor(public config: RateLimitConfig) {}

  private getKey(identifier: string): string {
    const keyGen = this.config.keyGenerator || ((id) => `ratelimit:${id}`);
    return keyGen(identifier);
  }

  async checkLimit(identifier: string): Promise<{
    allowed: boolean;
    info: RateLimitInfo;
  }> {
    const key = this.getKey(identifier);
    const now = Date.now();
    const resetTime = now + this.config.windowMs;

    try {
      // Get current rate limit data
      const stored = await kvGet<RateLimitStore>(key);
      
      if (!stored || now >= stored.resetTime) {
        // No existing limit or window has reset
        const newStore: RateLimitStore = {
          count: 1,
          resetTime,
          firstRequest: now
        };
        
        // Store with TTL equal to window
        await kvSet(key, newStore, Math.ceil(this.config.windowMs / 1000));
        
        return {
          allowed: true,
          info: {
            limit: this.config.maxRequests,
            remaining: this.config.maxRequests - 1,
            reset: resetTime,
            window: this.config.windowMs / 1000
          }
        };
      }

      // Check if limit exceeded
      const remaining = Math.max(0, this.config.maxRequests - stored.count);
      const allowed = stored.count < this.config.maxRequests;

      if (allowed) {
        // Increment counter
        const updatedStore: RateLimitStore = {
          ...stored,
          count: stored.count + 1
        };
        
        // Update with remaining TTL
        const ttl = Math.max(1, Math.ceil((stored.resetTime - now) / 1000));
        await kvSet(key, updatedStore, ttl);
      } else {
        // Limit exceeded, trigger callback if provided
        const info = {
          limit: this.config.maxRequests,
          remaining: 0,
          reset: stored.resetTime,
          window: this.config.windowMs / 1000
        };
        
        this.config.onLimitReached?.(identifier, info);
      }

      return {
        allowed,
        info: {
          limit: this.config.maxRequests,
          remaining: remaining - (allowed ? 1 : 0),
          reset: stored.resetTime,
          window: this.config.windowMs / 1000
        }
      };

    } catch (error) {
      console.error('Rate limit check failed:', error);
      
      // Fail open - allow request if storage is unavailable
      return {
        allowed: true,
        info: {
          limit: this.config.maxRequests,
          remaining: this.config.maxRequests - 1,
          reset: resetTime,
          window: this.config.windowMs / 1000
        }
      };
    }
  }

  async resetLimit(identifier: string): Promise<void> {
    const key = this.getKey(identifier);
    try {
      // Remove the rate limit entry
      const { kvDel } = await import('./kv');
      await kvDel(key);
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
    }
  }

  async getRemainingRequests(identifier: string): Promise<number> {
    const { allowed, info } = await this.checkLimit(identifier);
    return info.remaining + (allowed ? 1 : 0); // Add back the request we just "used"
  }
}

// ================================
// Pre-configured Rate Limiters
// ================================

export const rateLimiters = {
  api: new RateLimiter({
    ...DEFAULT_RATE_LIMITS.api,
    keyGenerator: (id) => `ratelimit:api:${id}`,
    onLimitReached: (id, info) => {
      console.warn(`API rate limit exceeded for ${id}:`, info);
    }
  }),

  upload: new RateLimiter({
    ...DEFAULT_RATE_LIMITS.upload,
    keyGenerator: (id) => `ratelimit:upload:${id}`,
    onLimitReached: (id, info) => {
      console.warn(`Upload rate limit exceeded for ${id}:`, info);
    }
  }),

  tryOn: new RateLimiter({
    ...DEFAULT_RATE_LIMITS.tryOn,
    keyGenerator: (id) => `ratelimit:tryon:${id}`,
    onLimitReached: (id, info) => {
      console.warn(`Try-on rate limit exceeded for ${id}:`, info);
    }
  }),

  session: new RateLimiter({
    ...DEFAULT_RATE_LIMITS.session,
    keyGenerator: (id) => `ratelimit:session:${id}`,
    onLimitReached: (id, info) => {
      console.warn(`Session rate limit exceeded for ${id}:`, info);
    }
  }),

  strict: new RateLimiter({
    ...DEFAULT_RATE_LIMITS.strict,
    keyGenerator: (id) => `ratelimit:strict:${id}`,
    onLimitReached: (id, info) => {
      console.warn(`Strict rate limit exceeded for ${id}:`, info);
    }
  })
};

// ================================
// Utility Functions
// ================================

/**
 * Extract client identifier from request
 */
export function getClientIdentifier(
  ip: string,
  sessionId?: string,
  userId?: string
): string {
  // Prefer user ID, then session ID, then IP
  if (userId) return `user:${userId}`;
  if (sessionId) return `session:${sessionId}`;
  return `ip:${ip}`;
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(info: RateLimitInfo): Record<string, string> {
  return {
    'X-RateLimit-Limit': info.limit.toString(),
    'X-RateLimit-Remaining': info.remaining.toString(),
    'X-RateLimit-Reset': info.reset.toString(),
    'X-RateLimit-Window': info.window.toString(),
    'Retry-After': Math.ceil((info.reset - Date.now()) / 1000).toString()
  };
}

/**
 * Check multiple rate limits at once
 */
export async function checkMultipleRateLimits(
  identifier: string,
  limiters: RateLimiter[]
): Promise<{
  allowed: boolean;
  info: RateLimitInfo;
  limiterIndex?: number;
}> {
  for (let i = 0; i < limiters.length; i++) {
    const result = await limiters[i].checkLimit(identifier);
    if (!result.allowed) {
      return {
        allowed: false,
        info: result.info,
        limiterIndex: i
      };
    }
  }

  // Return info from the most restrictive limiter (first one)
  const { info } = await limiters[0].checkLimit(identifier);
  return { allowed: true, info };
}

/**
 * Sliding window rate limiter for more accurate limiting
 */
export class SlidingWindowRateLimiter {
  constructor(
    private windowMs: number,
    private maxRequests: number,
    private keyPrefix: string = 'sliding'
  ) {}

  private getKeys(identifier: string, timestamp: number): {
    currentKey: string;
    previousKey: string;
  } {
    const windowStart = Math.floor(timestamp / this.windowMs) * this.windowMs;
    const currentKey = `${this.keyPrefix}:${identifier}:${windowStart}`;
    const previousKey = `${this.keyPrefix}:${identifier}:${windowStart - this.windowMs}`;
    
    return { currentKey, previousKey };
  }

  async checkLimit(identifier: string): Promise<{
    allowed: boolean;
    info: RateLimitInfo;
  }> {
    const now = Date.now();
    const { currentKey, previousKey } = this.getKeys(identifier, now);
    
    try {
      // Get counts from current and previous windows
      const [currentCount, previousCount] = await Promise.all([
        kvGet<number>(currentKey).then(c => c || 0),
        kvGet<number>(previousKey).then(c => c || 0)
      ]);

      // Calculate weighted count based on position in current window
      const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
      const progressInWindow = (now - windowStart) / this.windowMs;
      const weightedPreviousCount = previousCount * (1 - progressInWindow);
      const totalCount = currentCount + weightedPreviousCount;

      const allowed = totalCount < this.maxRequests;
      const resetTime = windowStart + this.windowMs;

      if (allowed) {
        // Increment current window count
        const ttl = Math.ceil(this.windowMs / 1000);
        await kvSet(currentKey, currentCount + 1, ttl);
      }

      return {
        allowed,
        info: {
          limit: this.maxRequests,
          remaining: Math.max(0, Math.floor(this.maxRequests - totalCount - (allowed ? 1 : 0))),
          reset: resetTime,
          window: this.windowMs / 1000
        }
      };

    } catch (error) {
      console.error('Sliding window rate limit check failed:', error);
      
      // Fail open
      return {
        allowed: true,
        info: {
          limit: this.maxRequests,
          remaining: this.maxRequests - 1,
          reset: now + this.windowMs,
          window: this.windowMs / 1000
        }
      };
    }
  }
}

// ================================
// Advanced Rate Limiting Strategies
// ================================

/**
 * Adaptive rate limiter that adjusts based on system load
 */
export class AdaptiveRateLimiter extends RateLimiter {
  constructor(
    config: RateLimitConfig,
    private getSystemLoad: () => Promise<number> // 0-1, where 1 is fully loaded
  ) {
    super(config);
  }

  async checkLimit(identifier: string): Promise<{
    allowed: boolean;
    info: RateLimitInfo;
  }> {
    const systemLoad = await this.getSystemLoad();
    
    // Reduce limit based on system load
    const loadFactor = Math.max(0.1, 1 - systemLoad);
    const adjustedMaxRequests = Math.floor(this.config.maxRequests * loadFactor);
    
    const adjustedConfig = {
      ...this.config,
      maxRequests: adjustedMaxRequests
    };
    
    const tempLimiter = new RateLimiter(adjustedConfig);
    return tempLimiter.checkLimit(identifier);
  }
}

export default RateLimiter;
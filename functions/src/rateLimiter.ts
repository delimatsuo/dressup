import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
}

/**
 * Simple in-memory rate limiter for Firebase Functions
 * For production, consider using Firebase Firestore or Redis
 */
class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMinutes: number = 1) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMinutes * 60 * 1000;
    
    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if a request should be allowed
   * @param identifier - Unique identifier (IP, session ID, etc.)
   * @returns true if request is allowed, false if rate limited
   */
  async checkLimit(identifier: string): Promise<boolean> {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry) {
      // First request from this identifier
      this.limits.set(identifier, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
      });
      return true;
    }

    // Check if window has expired
    if (now - entry.firstRequest > this.windowMs) {
      // Reset the window
      this.limits.set(identifier, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
      });
      return true;
    }

    // Within window - check count
    if (entry.count >= this.maxRequests) {
      logger.warn(`Rate limit exceeded for ${identifier}`, {
        count: entry.count,
        maxRequests: this.maxRequests,
        windowMs: this.windowMs,
      });
      return false;
    }

    // Increment count
    entry.count++;
    entry.lastRequest = now;
    this.limits.set(identifier, entry);
    return true;
  }

  /**
   * Get remaining requests for an identifier
   */
  getRemainingRequests(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry) return this.maxRequests;
    
    const now = Date.now();
    if (now - entry.firstRequest > this.windowMs) {
      return this.maxRequests;
    }
    
    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now - entry.lastRequest > this.windowMs * 2) {
        this.limits.delete(key);
      }
    }
  }
}

// Firestore-based rate limiter for distributed environments
export class FirestoreRateLimiter {
  private db: admin.firestore.Firestore | null = null;
  private collectionName: string = 'rateLimits';
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMinutes: number = 1) {
    // Lazy initialization - don't initialize Firestore in constructor
    this.maxRequests = maxRequests;
    this.windowMs = windowMinutes * 60 * 1000;
  }
  
  private getDb(): admin.firestore.Firestore {
    if (!this.db) {
      this.db = admin.firestore();
    }
    return this.db;
  }

  async checkLimit(identifier: string): Promise<boolean> {
    const docRef = this.getDb().collection(this.collectionName).doc(identifier);
    
    try {
      const result = await this.getDb().runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        const now = Date.now();
        
        if (!doc.exists) {
          // First request
          transaction.set(docRef, {
            count: 1,
            firstRequest: now,
            lastRequest: now,
            expiresAt: new Date(now + this.windowMs * 2),
          });
          return true;
        }
        
        const data = doc.data() as RateLimitEntry & { expiresAt: any };
        
        // Check if window expired
        if (now - data.firstRequest > this.windowMs) {
          transaction.set(docRef, {
            count: 1,
            firstRequest: now,
            lastRequest: now,
            expiresAt: new Date(now + this.windowMs * 2),
          });
          return true;
        }
        
        // Check if limit exceeded
        if (data.count >= this.maxRequests) {
          return false;
        }
        
        // Update count
        transaction.update(docRef, {
          count: data.count + 1,
          lastRequest: now,
        });
        return true;
      });
      
      return result;
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // On error, allow the request (fail open)
      return true;
    }
  }
}

// Export singleton instances
export const memoryRateLimiter = new RateLimiter(10, 1); // 10 requests per minute
export const firestoreRateLimiter = new FirestoreRateLimiter(10, 1); // 10 requests per minute

// Export middleware function
export async function checkRateLimit(
  identifier: string,
  useFirestore: boolean = false
): Promise<{ allowed: boolean; remaining: number }> {
  if (useFirestore) {
    const allowed = await firestoreRateLimiter.checkLimit(identifier);
    return {
      allowed,
      remaining: allowed ? -1 : 0, // Firestore doesn't track remaining easily
    };
  } else {
    const allowed = await memoryRateLimiter.checkLimit(identifier);
    return {
      allowed,
      remaining: memoryRateLimiter.getRemainingRequests(identifier),
    };
  }
}
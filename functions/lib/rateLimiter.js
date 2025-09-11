"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.firestoreRateLimiter = exports.memoryRateLimiter = exports.FirestoreRateLimiter = void 0;
exports.checkRateLimit = checkRateLimit;
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
/**
 * Simple in-memory rate limiter for Firebase Functions
 * For production, consider using Firebase Firestore or Redis
 */
class RateLimiter {
    constructor(maxRequests = 10, windowMinutes = 1) {
        this.limits = new Map();
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
    async checkLimit(identifier) {
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
            firebase_functions_1.logger.warn(`Rate limit exceeded for ${identifier}`, {
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
    getRemainingRequests(identifier) {
        const entry = this.limits.get(identifier);
        if (!entry)
            return this.maxRequests;
        const now = Date.now();
        if (now - entry.firstRequest > this.windowMs) {
            return this.maxRequests;
        }
        return Math.max(0, this.maxRequests - entry.count);
    }
    /**
     * Clean up expired entries
     */
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.limits.entries()) {
            if (now - entry.lastRequest > this.windowMs * 2) {
                this.limits.delete(key);
            }
        }
    }
}
// Firestore-based rate limiter for distributed environments
class FirestoreRateLimiter {
    constructor(maxRequests = 10, windowMinutes = 1) {
        this.db = null;
        this.collectionName = 'rateLimits';
        // Lazy initialization - don't initialize Firestore in constructor
        this.maxRequests = maxRequests;
        this.windowMs = windowMinutes * 60 * 1000;
    }
    getDb() {
        if (!this.db) {
            this.db = admin.firestore();
        }
        return this.db;
    }
    async checkLimit(identifier) {
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
                const data = doc.data();
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
        }
        catch (error) {
            firebase_functions_1.logger.error('Rate limiter error:', error);
            // On error, allow the request (fail open)
            return true;
        }
    }
}
exports.FirestoreRateLimiter = FirestoreRateLimiter;
// Export singleton instances
exports.memoryRateLimiter = new RateLimiter(10, 1); // 10 requests per minute
exports.firestoreRateLimiter = new FirestoreRateLimiter(10, 1); // 10 requests per minute
// Export middleware function
async function checkRateLimit(identifier, useFirestore = false) {
    if (useFirestore) {
        const allowed = await exports.firestoreRateLimiter.checkLimit(identifier);
        return {
            allowed,
            remaining: allowed ? -1 : 0, // Firestore doesn't track remaining easily
        };
    }
    else {
        const allowed = await exports.memoryRateLimiter.checkLimit(identifier);
        return {
            allowed,
            remaining: exports.memoryRateLimiter.getRemainingRequests(identifier),
        };
    }
}
//# sourceMappingURL=rateLimiter.js.map
// Service Worker registration and management
import React from 'react';

export interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

export interface CacheInfo {
  [cacheName: string]: {
    entries: number;
    urls: string[];
  };
}

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private config: ServiceWorkerConfig;

  private constructor(config: ServiceWorkerConfig = {}) {
    this.config = config;
  }

  public static getInstance(config?: ServiceWorkerConfig): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager(config);
    }
    return ServiceWorkerManager.instance;
  }

  public async register(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('Service Workers not supported');
      return null;
    }

    // Only register in production or when explicitly enabled
    if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_SW_ENABLED) {
      console.log('Service Worker registration skipped in development');
      return null;
    }

    try {
      console.log('Registering Service Worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      this.registration = registration;

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is available
            console.log('New service worker available');
            this.config.onUpdate?.(registration);
          }
        });
      });

      // Service worker is ready
      if (registration.active) {
        console.log('Service Worker registered successfully');
        this.config.onSuccess?.(registration);
      }

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      this.config.onError?.(error as Error);
      return null;
    }
  }

  public async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      console.log('Service Worker unregistered:', result);
      return result;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  public async update(): Promise<void> {
    if (!this.registration) {
      console.warn('No service worker registration found');
      return;
    }

    try {
      await this.registration.update();
      console.log('Service Worker update check completed');
    } catch (error) {
      console.error('Service Worker update failed:', error);
    }
  }

  public async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) {
      return;
    }

    // Post message to service worker to skip waiting
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  public async getCacheInfo(): Promise<CacheInfo | null> {
    if (!this.registration?.active) {
      return null;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      this.registration!.active!.postMessage(
        { type: 'GET_CACHE_INFO' },
        [messageChannel.port2]
      );
    });
  }

  public async clearCache(): Promise<boolean> {
    if (!this.registration?.active) {
      return false;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success || false);
      };

      this.registration!.active!.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    });
  }

  public getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  }

  public isRegistered(): boolean {
    return this.registration !== null;
  }
}

// Hook for React components
export function useServiceWorker(config?: ServiceWorkerConfig) {
  const [isRegistered, setIsRegistered] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [hasUpdate, setHasUpdate] = React.useState(false);
  const [cacheInfo, setCacheInfo] = React.useState<CacheInfo | null>(null);

  React.useEffect(() => {
    const swManager = ServiceWorkerManager.getInstance({
      ...config,
      onSuccess: (registration) => {
        setIsRegistered(true);
        config?.onSuccess?.(registration);
      },
      onUpdate: (registration) => {
        setHasUpdate(true);
        config?.onUpdate?.(registration);
      },
      onError: (error) => {
        setIsRegistered(false);
        config?.onError?.(error);
      },
    });

    swManager.register();

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'CACHE_PERFORMANCE') {
          // Handle cache performance data
          console.log('Cache performance:', event.data.data);
        }
      });
    }
  }, []);

  const updateServiceWorker = React.useCallback(async () => {
    setIsUpdating(true);
    const swManager = ServiceWorkerManager.getInstance();
    await swManager.skipWaiting();
    setHasUpdate(false);
    setIsUpdating(false);
    window.location.reload();
  }, []);

  const getCacheInfo = React.useCallback(async () => {
    const swManager = ServiceWorkerManager.getInstance();
    const info = await swManager.getCacheInfo();
    setCacheInfo(info);
    return info;
  }, []);

  const clearCache = React.useCallback(async () => {
    const swManager = ServiceWorkerManager.getInstance();
    const success = await swManager.clearCache();
    if (success) {
      setCacheInfo(null);
    }
    return success;
  }, []);

  return {
    isSupported: ServiceWorkerManager.getInstance().isSupported(),
    isRegistered,
    isUpdating,
    hasUpdate,
    cacheInfo,
    updateServiceWorker,
    getCacheInfo,
    clearCache,
  };
}

// Utility functions for offline functionality
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function onConnectionChange(callback: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export function preloadCriticalResources(resources: string[]): Promise<void[]> {
  const promises = resources.map(url => {
    return new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      
      // Determine resource type
      if (url.endsWith('.css')) {
        link.as = 'style';
      } else if (url.endsWith('.js')) {
        link.as = 'script';
      } else if (url.match(/\.(jpg|jpeg|png|webp|avif|gif)$/)) {
        link.as = 'image';
      } else if (url.match(/\.(woff2|woff)$/)) {
        link.as = 'font';
        link.crossOrigin = 'anonymous';
      }
      
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to preload: ${url}`));
      
      document.head.appendChild(link);
    });
  });

  return Promise.all(promises);
}

// Performance cache utilities
export function getCachePerformanceMetrics(): {
  hitRate: number;
  missRate: number;
  averageResponseTime: number;
} {
  // This would integrate with the actual cache performance data
  // For now, return mock data
  return {
    hitRate: 0.75,
    missRate: 0.25,
    averageResponseTime: 150,
  };
}

export function enableBackgroundSync(tag: string = 'background-sync'): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      reject(new Error('Background sync not supported'));
      return;
    }

    navigator.serviceWorker.ready.then(registration => {
      return (registration as any).sync?.register(tag);
    }).then(() => {
      console.log('Background sync registered');
      resolve();
    }).catch(reject);
  });
}
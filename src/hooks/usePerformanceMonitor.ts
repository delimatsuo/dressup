import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  performanceMonitor, 
  componentPerformanceTracker, 
  memoryMonitor,
  PerformanceMetrics 
} from '@/utils/performance';

export interface UsePerformanceMonitorOptions {
  trackMemory?: boolean;
  memoryInterval?: number;
  trackComponentRender?: boolean;
  componentName?: string;
}

export interface PerformanceState {
  metrics: PerformanceMetrics | null;
  isLoading: boolean;
  renderTime: number | null;
  memoryUsage: {
    current: { used: number; total: number } | null;
    peak: { used: number; total: number } | null;
    average: { used: number; total: number } | null;
  };
}

export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}): PerformanceState {
  const {
    trackMemory = false,
    memoryInterval = 5000,
    trackComponentRender = false,
    componentName = 'UnknownComponent'
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renderTime, setRenderTime] = useState<number | null>(null);
  const [memoryUsage, setMemoryUsage] = useState<PerformanceState['memoryUsage']>({
    current: null,
    peak: null,
    average: null,
  });

  const renderStartRef = useRef<number | null>(null);

  // Initialize performance monitoring
  useEffect(() => {
    performanceMonitor.init();
    
    const unsubscribe = performanceMonitor.subscribe((newMetrics) => {
      setMetrics(newMetrics);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Memory monitoring
  useEffect(() => {
    if (!trackMemory) return;

    memoryMonitor.startMonitoring(memoryInterval);

    const intervalId = setInterval(() => {
      setMemoryUsage(memoryMonitor.getMemoryStats());
    }, memoryInterval);

    return () => {
      clearInterval(intervalId);
      memoryMonitor.stopMonitoring();
    };
  }, [trackMemory, memoryInterval]);

  // Component render tracking
  useEffect(() => {
    if (!trackComponentRender) return;

    renderStartRef.current = performance.now();
    componentPerformanceTracker.startRender(componentName);

    return () => {
      if (renderStartRef.current) {
        const endTime = componentPerformanceTracker.endRender(componentName);
        setRenderTime(endTime);
      }
    };
  }, [trackComponentRender, componentName]);

  return {
    metrics,
    isLoading,
    renderTime,
    memoryUsage,
  };
}

// Hook for component-level performance tracking
export function useComponentPerformance(componentName: string) {
  const renderTimeRef = useRef<number | null>(null);
  const [renderStats, setRenderStats] = useState({
    count: 0,
    average: 0,
    p95: 0,
    min: 0,
    max: 0,
  });

  const startRender = useCallback(() => {
    renderTimeRef.current = performance.now();
    componentPerformanceTracker.startRender(componentName);
  }, [componentName]);

  const endRender = useCallback(() => {
    if (renderTimeRef.current) {
      componentPerformanceTracker.endRender(componentName);
      setRenderStats(componentPerformanceTracker.getRenderStats(componentName));
    }
  }, [componentName]);

  // Track render automatically
  useEffect(() => {
    startRender();
    
    return () => {
      endRender();
    };
  });

  return {
    renderStats,
    startRender,
    endRender,
  };
}

// Hook for image loading performance
export function useImagePerformance() {
  const [imageMetrics, setImageMetrics] = useState<{
    loadTime: number | null;
    size: number | null;
    isLoaded: boolean;
    error: string | null;
  }>({
    loadTime: null,
    size: null,
    isLoaded: false,
    error: null,
  });

  const trackImageLoad = useCallback((imageUrl: string) => {
    const startTime = performance.now();
    const img = new Image();
    
    img.onload = () => {
      const loadTime = performance.now() - startTime;
      setImageMetrics(prev => ({
        ...prev,
        loadTime,
        isLoaded: true,
      }));
      
      // Check performance budget for image loading (2s target)
      if (loadTime > 2000) {
        console.warn(`Slow image load detected: ${imageUrl} took ${loadTime.toFixed(2)}ms`);
      }
    };

    img.onerror = () => {
      setImageMetrics(prev => ({
        ...prev,
        error: `Failed to load image: ${imageUrl}`,
        isLoaded: false,
      }));
    };

    img.src = imageUrl;

    // Try to get image size information
    fetch(imageUrl, { method: 'HEAD' })
      .then(response => {
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          setImageMetrics(prev => ({
            ...prev,
            size: parseInt(contentLength, 10),
          }));
        }
      })
      .catch(() => {
        // Ignore size fetch errors
      });
  }, []);

  return {
    imageMetrics,
    trackImageLoad,
  };
}

// Hook for bundle size monitoring
export function useBundleAnalysis() {
  const [bundleInfo, setBundleInfo] = useState<{
    totalSize: number | null;
    gzippedSize: number | null;
    chunks: Array<{ name: string; size: number }>;
    isAnalyzing: boolean;
  }>({
    totalSize: null,
    gzippedSize: null,
    chunks: [],
    isAnalyzing: false,
  });

  const analyzeBundles = useCallback(async () => {
    setBundleInfo(prev => ({ ...prev, isAnalyzing: true }));

    try {
      // In a real implementation, this would fetch bundle analysis data
      // For now, we'll mock the data structure
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockBundleData = {
        totalSize: 750 * 1024, // 750KB
        gzippedSize: 250 * 1024, // 250KB
        chunks: [
          { name: 'main', size: 400 * 1024 },
          { name: 'vendor', size: 300 * 1024 },
          { name: 'runtime', size: 50 * 1024 },
        ],
      };

      setBundleInfo({
        ...mockBundleData,
        isAnalyzing: false,
      });
    } catch (error) {
      console.error('Bundle analysis failed:', error);
      setBundleInfo(prev => ({ ...prev, isAnalyzing: false }));
    }
  }, []);

  return {
    bundleInfo,
    analyzeBundles,
  };
}

// Hook for API performance monitoring
export function useAPIPerformance() {
  const [apiMetrics, setApiMetrics] = useState<Map<string, {
    url: string;
    method: string;
    duration: number;
    status: number;
    timestamp: number;
  }>>(new Map());

  const trackAPICall = useCallback(async <T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const startTime = performance.now();
    const requestId = `${Date.now()}-${Math.random()}`;

    try {
      const response = await fetch(url, options);
      const duration = performance.now() - startTime;

      setApiMetrics(prev => new Map(prev).set(requestId, {
        url,
        method: options.method || 'GET',
        duration,
        status: response.status,
        timestamp: Date.now(),
      }));

      // Log slow API calls
      if (duration > 1000) {
        console.warn(`Slow API call detected: ${url} took ${duration.toFixed(2)}ms`);
      }

      return await response.json();
    } catch (error) {
      const duration = performance.now() - startTime;
      
      setApiMetrics(prev => new Map(prev).set(requestId, {
        url,
        method: options.method || 'GET',
        duration,
        status: 0,
        timestamp: Date.now(),
      }));

      throw error;
    }
  }, []);

  const getAPIStats = useCallback(() => {
    const calls = Array.from(apiMetrics.values());
    
    if (calls.length === 0) {
      return null;
    }

    const totalCalls = calls.length;
    const averageDuration = calls.reduce((sum, call) => sum + call.duration, 0) / totalCalls;
    const slowCalls = calls.filter(call => call.duration > 1000).length;
    const errorCalls = calls.filter(call => call.status >= 400).length;

    return {
      totalCalls,
      averageDuration,
      slowCalls,
      errorCalls,
      successRate: ((totalCalls - errorCalls) / totalCalls) * 100,
    };
  }, [apiMetrics]);

  return {
    apiMetrics: Array.from(apiMetrics.values()),
    trackAPICall,
    getAPIStats,
  };
}
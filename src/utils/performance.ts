import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';

export interface PerformanceMetrics {
  cls: number | null;
  fid: number | null;
  fcp: number | null;
  lcp: number | null;
  ttfb: number | null;
  timestamp: number;
  url: string;
  userAgent: string;
  connectionType: string;
  deviceMemory: number;
}

export interface PerformanceBudget {
  lcp: number; // 2.5s
  fid: number; // 100ms
  cls: number; // 0.1
  ttfb: number; // 600ms
  fcp: number; // 1.8s
  bundleSize: number; // 500KB
  totalJSSize: number; // 1MB
  totalCSSSize: number; // 100KB
  lighthousePerformance: number; // 90
  lighthouseAccessibility: number; // 95
  lighthouseBestPractices: number; // 90
  lighthouseSEO: number; // 90
}

export const PERFORMANCE_BUDGET: PerformanceBudget = {
  lcp: 2500, // 2.5s in ms
  fid: 100, // 100ms
  cls: 0.1,
  ttfb: 600, // 600ms
  fcp: 1800, // 1.8s in ms
  bundleSize: 500 * 1024, // 500KB
  totalJSSize: 1024 * 1024, // 1MB
  totalCSSSize: 100 * 1024, // 100KB
  lighthousePerformance: 90,
  lighthouseAccessibility: 95,
  lighthouseBestPractices: 90,
  lighthouseSEO: 90,
};

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private observers: Array<(metrics: PerformanceMetrics) => void> = [];
  private isInitialized = false;

  private constructor() {
    this.metrics = this.createEmptyMetrics();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private createEmptyMetrics(): PerformanceMetrics {
    return {
      cls: null,
      fid: null,
      fcp: null,
      lcp: null,
      ttfb: null,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      connectionType: this.getConnectionType(),
      deviceMemory: this.getDeviceMemory(),
    };
  }

  private getConnectionType(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection ? connection.effectiveType : 'unknown';
  }

  private getDeviceMemory(): number {
    if (typeof navigator === 'undefined') return 0;
    return (navigator as any).deviceMemory || 0;
  }

  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    this.isInitialized = true;
    
    // Initialize Web Vitals monitoring
    getCLS(this.handleMetric.bind(this));
    getFID(this.handleMetric.bind(this));
    getFCP(this.handleMetric.bind(this));
    getLCP(this.handleMetric.bind(this));
    getTTFB(this.handleMetric.bind(this));

    // Add page lifecycle listeners
    this.addPageLifecycleListeners();
  }

  private handleMetric(metric: Metric): void {
    const metricName = metric.name.toLowerCase() as keyof Pick<PerformanceMetrics, 'cls' | 'fid' | 'fcp' | 'lcp' | 'ttfb'>;
    this.metrics[metricName] = metric.value;
    this.metrics.timestamp = Date.now();
    
    // Notify observers
    this.notifyObservers();
    
    // Log performance violations
    this.checkPerformanceBudget(metricName, metric.value);
    
    // Send to analytics if configured
    this.sendToAnalytics(metric);
  }

  private addPageLifecycleListeners(): void {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendFinalMetrics();
      }
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.sendFinalMetrics();
    });
  }

  private checkPerformanceBudget(metricName: string, value: number): void {
    const budgetKey = metricName as keyof PerformanceBudget;
    const budgetValue = PERFORMANCE_BUDGET[budgetKey];
    
    if (budgetValue && value > budgetValue) {
      console.warn(`Performance budget exceeded for ${metricName}:`, {
        actual: value,
        budget: budgetValue,
        overage: value - budgetValue,
      });
      
      // Dispatch custom event for monitoring systems
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('performance-budget-exceeded', {
          detail: {
            metric: metricName,
            value,
            budget: budgetValue,
            timestamp: Date.now(),
          }
        }));
      }
    }
  }

  private sendToAnalytics(metric: Metric): void {
    // This would integrate with analytics services like Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        custom_parameter_1: metric.id,
        non_interaction: true,
      });
    }
    
    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Web Vital: ${metric.name}`, metric);
    }
  }

  private sendFinalMetrics(): void {
    // Send final metrics when page is about to unload
    const metricsToSend = { ...this.metrics };
    
    // Use sendBeacon for reliable delivery
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/performance-metrics', JSON.stringify(metricsToSend));
    }
  }

  public subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  private notifyObservers(): void {
    this.observers.forEach(callback => callback(this.metrics));
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public reset(): void {
    this.metrics = this.createEmptyMetrics();
  }
}

// Component-level performance utilities
export class ComponentPerformanceTracker {
  private renderTimes: Map<string, number[]> = new Map();
  private currentRenders: Map<string, number> = new Map();

  public startRender(componentName: string): void {
    this.currentRenders.set(componentName, performance.now());
  }

  public endRender(componentName: string): number {
    const startTime = this.currentRenders.get(componentName);
    if (!startTime) {
      console.warn(`No start time found for component: ${componentName}`);
      return 0;
    }

    const renderTime = performance.now() - startTime;
    this.currentRenders.delete(componentName);

    // Store render time
    if (!this.renderTimes.has(componentName)) {
      this.renderTimes.set(componentName, []);
    }
    this.renderTimes.get(componentName)!.push(renderTime);

    // Check if render time exceeds budget (16ms for 60fps)
    if (renderTime > 16) {
      console.warn(`Slow render detected for ${componentName}: ${renderTime.toFixed(2)}ms`);
    }

    return renderTime;
  }

  public getAverageRenderTime(componentName: string): number {
    const times = this.renderTimes.get(componentName);
    if (!times || times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  public getP95RenderTime(componentName: string): number {
    const times = this.renderTimes.get(componentName);
    if (!times || times.length === 0) return 0;
    
    const sorted = [...times].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[index];
  }

  public getRenderStats(componentName: string): {
    count: number;
    average: number;
    p95: number;
    min: number;
    max: number;
  } {
    const times = this.renderTimes.get(componentName) || [];
    
    if (times.length === 0) {
      return { count: 0, average: 0, p95: 0, min: 0, max: 0 };
    }

    const sorted = [...times].sort((a, b) => a - b);
    
    return {
      count: times.length,
      average: this.getAverageRenderTime(componentName),
      p95: this.getP95RenderTime(componentName),
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  }
}

// Memory usage tracking
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private measurements: Array<{ timestamp: number; usedJSHeapSize: number; totalJSHeapSize: number }> = [];
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  public startMonitoring(intervalMs: number = 5000): void {
    if (this.intervalId || typeof window === 'undefined') return;

    this.intervalId = setInterval(() => {
      this.recordMemoryUsage();
    }, intervalMs);

    // Record initial measurement
    this.recordMemoryUsage();
  }

  public stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private recordMemoryUsage(): void {
    if (typeof performance === 'undefined' || !performance.memory) return;

    const memory = (performance as any).memory;
    this.measurements.push({
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
    });

    // Keep only last 100 measurements
    if (this.measurements.length > 100) {
      this.measurements = this.measurements.slice(-100);
    }

    // Check for memory budget violations
    if (memory.usedJSHeapSize > PERFORMANCE_BUDGET.totalJSSize) {
      console.warn('Memory usage exceeds budget:', {
        used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
        budget: (PERFORMANCE_BUDGET.totalJSSize / 1024 / 1024).toFixed(2) + 'MB',
      });
    }
  }

  public getMemoryStats(): {
    current: { used: number; total: number } | null;
    peak: { used: number; total: number } | null;
    average: { used: number; total: number } | null;
  } {
    if (this.measurements.length === 0) {
      return { current: null, peak: null, average: null };
    }

    const latest = this.measurements[this.measurements.length - 1];
    const peak = this.measurements.reduce((max, curr) => 
      curr.usedJSHeapSize > max.usedJSHeapSize ? curr : max
    );

    const avgUsed = this.measurements.reduce((sum, m) => sum + m.usedJSHeapSize, 0) / this.measurements.length;
    const avgTotal = this.measurements.reduce((sum, m) => sum + m.totalJSHeapSize, 0) / this.measurements.length;

    return {
      current: { used: latest.usedJSHeapSize, total: latest.totalJSHeapSize },
      peak: { used: peak.usedJSHeapSize, total: peak.totalJSHeapSize },
      average: { used: avgUsed, total: avgTotal },
    };
  }
}

// Export singleton instances
export const performanceMonitor = PerformanceMonitor.getInstance();
export const componentPerformanceTracker = new ComponentPerformanceTracker();
export const memoryMonitor = MemoryMonitor.getInstance();
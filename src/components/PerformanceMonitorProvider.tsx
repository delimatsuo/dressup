'use client';

import React, { useEffect, useState } from 'react';
import { performanceMonitor, memoryMonitor } from '@/utils/performance';

interface PerformanceMonitorProviderProps {
  children: React.ReactNode;
}

export function PerformanceMonitorProvider({ children }: PerformanceMonitorProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize performance monitoring
    performanceMonitor.init();
    memoryMonitor.startMonitoring(10000); // Monitor every 10 seconds
    
    // Register service worker in production
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered: ', registration);
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
    }
    
    setIsInitialized(true);

    return () => {
      memoryMonitor.stopMonitoring();
    };
  }, []);

  // Show performance metrics in development
  const [showPerfDebug, setShowPerfDebug] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
          setShowPerfDebug(prev => !prev);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  return (
    <>
      {children}
      
      {/* Development Performance Debug Panel */}
      {process.env.NODE_ENV === 'development' && showPerfDebug && (
        <PerformanceDebugPanel />
      )}
    </>
  );
}

// Development-only debug panel
function PerformanceDebugPanel() {
  const [metrics, setMetrics] = useState<any>(null);
  const [memoryStats, setMemoryStats] = useState<any>(null);

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getMetrics());
      setMemoryStats(memoryMonitor.getMemoryStats());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-sm"
      style={{ backdropFilter: 'blur(10px)' }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-green-400">Performance Debug</h3>
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { 
            key: 'P', ctrlKey: true, shiftKey: true 
          }))}
          className="text-red-400 hover:text-red-300"
        >
          ×
        </button>
      </div>
      
      {metrics && (
        <div className="space-y-2">
          <div>
            <div className="text-blue-400">Web Vitals</div>
            <div>LCP: {metrics.lcp ? `${metrics.lcp.toFixed(0)}ms` : 'N/A'}</div>
            <div>FID: {metrics.fid ? `${metrics.fid.toFixed(0)}ms` : 'N/A'}</div>
            <div>CLS: {metrics.cls ? metrics.cls.toFixed(3) : 'N/A'}</div>
            <div>TTFB: {metrics.ttfb ? `${metrics.ttfb.toFixed(0)}ms` : 'N/A'}</div>
          </div>
          
          {memoryStats?.current && (
            <div>
              <div className="text-yellow-400">Memory</div>
              <div>Used: {(memoryStats.current.used / 1024 / 1024).toFixed(1)}MB</div>
              <div>Total: {(memoryStats.current.total / 1024 / 1024).toFixed(1)}MB</div>
            </div>
          )}
          
          <div>
            <div className="text-purple-400">Network</div>
            <div>Connection: {metrics.connectionType}</div>
            <div>Device Memory: {metrics.deviceMemory || 'Unknown'}GB</div>
          </div>
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-400">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
}
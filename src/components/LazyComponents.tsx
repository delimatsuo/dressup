import dynamic from 'next/dynamic';
import React, { Suspense } from 'react';

// Lazy loading with custom loading components
export const LazyPhotoUploadInterface = dynamic(
  () => import('./PhotoUploadInterface').then(mod => ({ default: mod.PhotoUploadInterface })),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]" role="status" aria-label="Loading photo upload interface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading photo upload...</p>
        </div>
      </div>
    ),
    ssr: false, // Disable SSR for client-only components
  }
);

export const LazyGarmentGallery = dynamic(
  () => import('./GarmentGallery').then(mod => ({ default: mod.default })),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[300px]" role="status" aria-label="Loading garment gallery">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading gallery...</p>
        </div>
      </div>
    ),
  }
);

export const LazyResultsDisplay = dynamic(
  () => import('./ResultsDisplay').then(mod => ({ default: mod.default })),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]" role="status" aria-label="Loading results display">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading results...</p>
        </div>
      </div>
    ),
  }
);

export const LazyFeedbackSection = dynamic(
  () => import('./FeedbackSection').then(mod => ({ default: mod.default })),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[200px]" role="status" aria-label="Loading feedback section">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-700">Loading feedback...</p>
        </div>
      </div>
    ),
  }
);

export const LazyWelcomeConsentModal = dynamic(
  () => import('./WelcomeConsentModal').then(mod => ({ default: mod.WelcomeConsentModal })),
  {
    loading: () => null, // Modal doesn't need loading state
    ssr: false,
  }
);

// High-order component for lazy loading with error boundaries
export function withLazyLoading<T extends Record<string, any>>(
  WrappedComponent: React.ComponentType<T>,
  fallback?: React.ComponentType
) {
  return React.forwardRef<any, T>((props, ref) => {
    return (
      <Suspense
        fallback={
          fallback ? (
            <fallback />
          ) : (
            <div className="flex items-center justify-center min-h-[200px]" role="status">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-700">Loading...</p>
              </div>
            </div>
          )
        }
      >
        <WrappedComponent {...props} ref={ref} />
      </Suspense>
    );
  });
}

// Preloader component for critical resources
export const ResourcePreloader: React.FC<{
  fonts?: string[];
  images?: string[];
  scripts?: string[];
  styles?: string[];
}> = ({ fonts = [], images = [], scripts = [], styles = [] }) => {
  React.useEffect(() => {
    // Preload fonts
    fonts.forEach(fontUrl => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.href = fontUrl;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    // Preload images
    images.forEach(imageUrl => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = imageUrl;
      document.head.appendChild(link);
    });

    // Preload scripts
    scripts.forEach(scriptUrl => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = scriptUrl;
      document.head.appendChild(link);
    });

    // Preload styles
    styles.forEach(styleUrl => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = styleUrl;
      document.head.appendChild(link);
    });
  }, [fonts, images, scripts, styles]);

  return null;
};

// Intersection Observer based lazy loading for images
export const LazyImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}> = ({ src, alt, className, placeholder, onLoad, onError }) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    onError?.();
  };

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className || ''}`}
      style={{ backgroundColor: '#f0f0f0' }}
    >
      {/* Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse">
          {placeholder ? (
            <img src={placeholder} alt="" className="w-full h-full object-cover opacity-50" />
          ) : (
            <div className="w-12 h-12 bg-gray-300 rounded"></div>
          )}
        </div>
      )}
      
      {/* Actual image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className || ''}`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}
    </div>
  );
};
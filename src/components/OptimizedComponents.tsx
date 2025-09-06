import React, { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { useComponentPerformance } from '@/hooks/usePerformanceMonitor';

// Optimized Image Component with lazy loading and performance tracking
export const OptimizedImage = memo<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  quality?: number;
  priority?: boolean;
  onLoad?: () => void;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}>(({
  src,
  alt,
  width,
  height,
  className,
  quality = 75,
  priority = false,
  onLoad,
  placeholder = 'blur',
  blurDataURL
}) => {
  const { renderStats } = useComponentPerformance('OptimizedImage');
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Optimize image URL with parameters
  const optimizedSrc = useMemo(() => {
    if (src.includes('?')) {
      return `${src}&w=${width}&h=${height}&q=${quality}&auto=format`;
    }
    return `${src}?w=${width}&h=${height}&q=${quality}&auto=format`;
  }, [src, width, height, quality]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setError('Failed to load image');
  }, []);

  // Generate WebP source
  const webpSrc = useMemo(() => {
    return optimizedSrc.replace(/\.(jpg|jpeg|png)/, '.webp');
  }, [optimizedSrc]);

  return (
    <div className={`relative overflow-hidden ${className || ''}`}>
      <picture>
        <source srcSet={webpSrc} type="image/webp" />
        <img
          ref={imgRef}
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      </picture>
      
      {/* Blur placeholder */}
      {!isLoaded && placeholder === 'blur' && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{
            backgroundImage: blurDataURL ? `url(${blurDataURL})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(10px)',
          }}
        />
      )}
      
      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
          <span className="text-sm">Image failed to load</span>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Virtual List component for large data sets
export const VirtualList = memo<{
  items: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}>(({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className
}) => {
  const { renderStats } = useComponentPerformance('VirtualList');
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visible = [];
    for (let i = startIndex; i <= endIndex; i++) {
      visible.push({
        index: i,
        item: items[i],
        top: i * itemHeight,
      });
    }

    return visible;
  }, [items, itemHeight, scrollTop, containerHeight, overscan]);

  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className || ''}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ index, item, top }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
});

VirtualList.displayName = 'VirtualList';

// Optimized Button with performance tracking
export const OptimizedButton = memo<{
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
  'aria-describedby'?: string;
}>(({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...ariaProps
}) => {
  const { renderStats } = useComponentPerformance('OptimizedButton');
  
  const baseClasses = useMemo(() => {
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
      danger: 'bg-red-600 hover:bg-red-700 text-white',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg',
    };

    return `
      inline-flex items-center justify-center font-medium rounded-md
      transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      ${variants[variant]} ${sizes[size]}
    `.replace(/\s+/g, ' ').trim();
  }, [variant, size]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!disabled && onClick) {
      onClick(e);
    }
  }, [disabled, onClick]);

  return (
    <button
      type={type}
      className={`${baseClasses} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      {...ariaProps}
    >
      {children}
    </button>
  );
});

OptimizedButton.displayName = 'OptimizedButton';

// Optimized Form Field with validation
export const OptimizedFormField = memo<{
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}>(({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  required = false,
  placeholder,
  disabled = false,
  className = ''
}) => {
  const { renderStats } = useComponentPerformance('OptimizedFormField');
  
  const inputId = useMemo(() => `field-${name}`, [name]);
  const errorId = useMemo(() => `error-${name}`, [name]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const inputClasses = useMemo(() => {
    return `
      block w-full px-3 py-2 border rounded-md shadow-sm
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
      disabled:bg-gray-50 disabled:cursor-not-allowed
      ${error ? 'border-red-300 text-red-900' : 'border-gray-300'}
    `.replace(/\s+/g, ' ').trim();
  }, [error]);

  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>
      
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={inputClasses}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />
      
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

OptimizedFormField.displayName = 'OptimizedFormField';

// Debounced Search Component
export const DebouncedSearch = memo<{
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}>(({ onSearch, placeholder = 'Search...', debounceMs = 300, className }) => {
  const { renderStats } = useComponentPerformance('DebouncedSearch');
  const [query, setQuery] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedSearch = useCallback(
    (searchQuery: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        onSearch(searchQuery);
      }, debounceMs);
    },
    [onSearch, debounceMs]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    debouncedSearch(newQuery);
  }, [debouncedSearch]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className || ''}`}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  );
});

DebouncedSearch.displayName = 'DebouncedSearch';

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class OptimizedErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error | null }> },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error | null }> }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} />;
      }

      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-red-800 font-medium">Something went wrong</h3>
          <p className="text-red-600 text-sm mt-1">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
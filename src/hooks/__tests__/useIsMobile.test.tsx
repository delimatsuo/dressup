import { renderHook, act } from '@testing-library/react';
import { useIsMobile, useIsTouchDevice, useMobileDetection } from '../useIsMobile';

describe('useIsMobile', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    // Restore original value
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('should return true when screen width is below breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('should return false when screen width is above breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('should update when window is resized', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(true);
  });

  it('should use custom breakpoint when provided', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 900,
    });

    const { result } = renderHook(() => useIsMobile(1024));
    expect(result.current).toBe(true);
  });
});

describe('useIsTouchDevice', () => {
  beforeEach(() => {
    // Mock navigator properties for touch detection
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    });
  });

  afterEach(() => {
    // Clean up
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    });
  });

  it('should detect touch capability', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 1,
    });

    const { result } = renderHook(() => useIsTouchDevice());
    expect(result.current).toBe(true);
  });

  it('should return false for non-touch devices', () => {
    // Ensure all touch properties are reset
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    });
    delete window.ontouchstart;

    const { result } = renderHook(() => useIsTouchDevice());
    expect(result.current).toBe(false);
  });
});

describe('useMobileDetection', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    });
  });

  it('should return correct mobile and touch detection', () => {
    // Ensure touch is disabled
    delete window.ontouchstart;
    
    const { result } = renderHook(() => useMobileDetection());
    
    expect(result.current).toEqual({
      isMobile: false,
      isTouchDevice: false,
      isMobileOrTouch: false,
    });
  });

  it('should detect mobile or touch correctly', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 1,
    });

    const { result } = renderHook(() => useMobileDetection());
    
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTouchDevice).toBe(true);
    expect(result.current.isMobileOrTouch).toBe(true);
  });
});
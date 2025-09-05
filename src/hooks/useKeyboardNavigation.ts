import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardNavigationOptions {
  enabled?: boolean;
  enableArrowKeys?: boolean;
  enableEnterSpace?: boolean;
  enableEscape?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  onSelect?: () => void;
  onEscape?: () => void;
  onKeyDown?: (event: KeyboardEvent) => boolean | void; // Return false to prevent default handling
}

/**
 * Hook for handling keyboard navigation with arrow keys, enter/space, and escape
 * @param options Configuration options for keyboard navigation
 * @returns ref to attach to the target element
 */
export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}) {
  const {
    enabled = true,
    enableArrowKeys = true,
    enableEnterSpace = true,
    enableEscape = true,
    onNext,
    onPrevious,
    onSelect,
    onEscape,
    onKeyDown
  } = options;

  const elementRef = useRef<HTMLElement>(null);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Allow custom handler to override default behavior
    if (onKeyDown) {
      const shouldContinue = onKeyDown(event);
      if (shouldContinue === false) return;
    }

    // Prevent handling if user is typing in an input
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    switch (event.code) {
      case 'ArrowLeft':
        if (enableArrowKeys && onPrevious) {
          event.preventDefault();
          onPrevious();
        }
        break;

      case 'ArrowRight':
        if (enableArrowKeys && onNext) {
          event.preventDefault();
          onNext();
        }
        break;

      case 'ArrowUp':
        if (enableArrowKeys && onPrevious) {
          event.preventDefault();
          onPrevious();
        }
        break;

      case 'ArrowDown':
        if (enableArrowKeys && onNext) {
          event.preventDefault();
          onNext();
        }
        break;

      case 'Enter':
      case 'Space':
        if (enableEnterSpace && onSelect) {
          event.preventDefault();
          onSelect();
        }
        break;

      case 'Escape':
        if (enableEscape && onEscape) {
          event.preventDefault();
          onEscape();
        }
        break;
    }
  }, [enabled, enableArrowKeys, enableEnterSpace, enableEscape, onNext, onPrevious, onSelect, onEscape, onKeyDown]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('keydown', handleKeyDown);
    
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return elementRef;
}
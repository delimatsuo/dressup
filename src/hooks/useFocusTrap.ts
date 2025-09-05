import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook that traps focus within a modal or dialog component
 * @param isActive Whether the focus trap is active
 * @param restoreFocusOnClose Whether to restore focus to the element that was focused before the trap was activated
 * @returns ref to attach to the container element
 */
export function useFocusTrap(isActive: boolean = false, restoreFocusOnClose: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
  }, []);

  // Handle Tab key navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isActive || event.key !== 'Tab') return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab: moving backwards
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: moving forwards
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, [isActive, getFocusableElements]);

  useEffect(() => {
    if (isActive) {
      // Store the currently focused element
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;

      // Focus the first focusable element in the container
      const container = containerRef.current;
      if (container) {
        const focusableElements = getFocusableElements(container);
        if (focusableElements.length > 0) {
          // Small delay to ensure the element is visible
          setTimeout(() => {
            focusableElements[0].focus();
          }, 10);
        }
      }

      // Add global keydown listener
      document.addEventListener('keydown', handleKeyDown);

      // Prevent scrolling of background content
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        
        // Restore focus to the previously focused element
        if (restoreFocusOnClose && previouslyFocusedElementRef.current) {
          previouslyFocusedElementRef.current.focus();
        }
      };
    }
  }, [isActive, handleKeyDown, getFocusableElements, restoreFocusOnClose]);

  return containerRef;
}

/**
 * Hook to detect if the user is navigating with a keyboard
 * This helps determine whether to show keyboard-specific UI hints
 */
export function useKeyboardDetection() {
  const isKeyboardUserRef = useRef(false);

  useEffect(() => {
    // Detect keyboard navigation
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' || event.key.startsWith('Arrow')) {
        isKeyboardUserRef.current = true;
        document.body.classList.add('keyboard-navigation');
      }
    };

    // Detect mouse/touch usage
    const handlePointerDown = () => {
      isKeyboardUserRef.current = false;
      document.body.classList.remove('keyboard-navigation');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.body.classList.remove('keyboard-navigation');
    };
  }, []);

  return isKeyboardUserRef;
}
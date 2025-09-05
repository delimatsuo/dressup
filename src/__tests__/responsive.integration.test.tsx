import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from '@/app/page';
import { SessionProvider } from '@/components/SessionProvider';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  initializeFirebase: jest.fn(() => ({})),
  getGarments: jest.fn(() => Promise.resolve([])),
  processImage: jest.fn(),
  processMultiPhotoOutfit: jest.fn(),
  submitFeedback: jest.fn(() => Promise.resolve(true)),
}));

// Mock hooks
jest.mock('@/hooks/useConsent', () => ({
  useConsent: jest.fn(() => ({
    hasConsented: true,
    isLoading: false,
    shouldShowConsentModal: false,
    grantConsent: jest.fn(),
  })),
}));

// Helper function to render with providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <SessionProvider>
      {component}
    </SessionProvider>
  );
};

describe('Responsive Design Integration Tests', () => {
  let originalInnerWidth: number;
  let originalInnerHeight: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
  });

  describe('Mobile View (375px)', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 812,
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 5,
      });
    });

    it('should render mobile-optimized layout', () => {
      renderWithProviders(<HomePage />);
      
      // Check for mobile-specific classes
      const container = document.querySelector('.mobile-container');
      expect(container).toBeInTheDocument();
    });

    it('should have touch-friendly buttons', () => {
      renderWithProviders(<HomePage />);
      
      // Wait for page to load
      waitFor(() => {
        const buttons = document.querySelectorAll('.touch-button');
        buttons.forEach(button => {
          const styles = window.getComputedStyle(button);
          // Check minimum height for touch targets
          expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
        });
      });
    });

    it('should use responsive typography', () => {
      renderWithProviders(<HomePage />);
      
      const responsiveText = document.querySelector('.text-responsive-2xl');
      expect(responsiveText).toBeInTheDocument();
    });
  });

  describe('Tablet View (768px)', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1024,
      });
    });

    it('should render tablet-optimized layout', () => {
      renderWithProviders(<HomePage />);
      
      // Check for proper grid layouts
      waitFor(() => {
        const howItWorks = screen.getByText('How It Works').parentElement;
        expect(howItWorks?.querySelector('.sm\\:grid-cols-3')).toBeTruthy();
      });
    });

    it('should show desktop navigation on tablet', () => {
      renderWithProviders(<HomePage />);
      
      // Mobile-only elements should be hidden
      const mobileOnly = document.querySelectorAll('.sm\\:hidden');
      mobileOnly.forEach(element => {
        expect(element).toHaveClass('sm:hidden');
      });
    });
  });

  describe('Desktop View (1440px)', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1440,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 900,
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 0,
      });
    });

    it('should render desktop-optimized layout', () => {
      renderWithProviders(<HomePage />);
      
      const container = document.querySelector('.mobile-container');
      expect(container).toBeInTheDocument();
      
      // Check max-width constraint
      const styles = window.getComputedStyle(container!);
      expect(styles.maxWidth).toBeTruthy();
    });

    it('should not show mobile-specific elements', () => {
      renderWithProviders(<HomePage />);
      
      // Touch indicators should be hidden on desktop
      const touchIndicators = document.querySelectorAll('.touch-indicator');
      touchIndicators.forEach(indicator => {
        const afterStyles = window.getComputedStyle(indicator, '::after');
        expect(afterStyles.display).toBe('none');
      });
    });
  });

  describe('Responsive Components', () => {
    it('should handle window resize events', async () => {
      const { rerender } = renderWithProviders(<HomePage />);
      
      // Start at mobile size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      window.dispatchEvent(new Event('resize'));
      
      await waitFor(() => {
        const mobileElements = document.querySelectorAll('.show-mobile');
        expect(mobileElements.length).toBeGreaterThan(0);
      });
      
      // Resize to desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1440,
      });
      window.dispatchEvent(new Event('resize'));
      
      await waitFor(() => {
        const desktopElements = document.querySelectorAll('.hide-mobile');
        expect(desktopElements.length).toBeGreaterThan(0);
      });
    });

    it('should maintain functionality across all viewports', () => {
      const viewports = [375, 768, 1024, 1440];
      
      viewports.forEach(width => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        });
        
        const { unmount } = renderWithProviders(<HomePage />);
        
        // Core functionality should be present at all sizes
        expect(screen.getByText('DressUp')).toBeInTheDocument();
        expect(screen.getByText(/Transform your look/i)).toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('Touch Interactions', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 5,
      });
    });

    it('should support touch events on mobile', () => {
      renderWithProviders(<HomePage />);
      
      // Simulate touch interactions
      const touchTargets = document.querySelectorAll('.touch-button');
      touchTargets.forEach(target => {
        fireEvent.touchStart(target, { touches: [{ clientX: 0, clientY: 0 }] });
        fireEvent.touchEnd(target, { changedTouches: [{ clientX: 0, clientY: 0 }] });
        // No errors should occur
      });
    });
  });

  describe('Accessibility', () => {
    it('should maintain ARIA labels across viewports', () => {
      const viewports = [375, 768, 1440];
      
      viewports.forEach(width => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        });
        
        const { unmount } = renderWithProviders(<HomePage />);
        
        // Check for ARIA labels
        const ariaElements = document.querySelectorAll('[aria-label]');
        expect(ariaElements.length).toBeGreaterThan(0);
        
        unmount();
      });
    });

    it('should have proper focus management', () => {
      renderWithProviders(<HomePage />);
      
      // All interactive elements should be focusable
      const interactiveElements = document.querySelectorAll('button, a, input, textarea');
      interactiveElements.forEach(element => {
        expect(element).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });
});
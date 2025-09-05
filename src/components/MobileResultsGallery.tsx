'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Share2, Maximize2, X } from 'lucide-react';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useFocusTrap, useKeyboardDetection } from '../hooks/useFocusTrap';

interface GalleryImage {
  id: string;
  url: string;
  title: string;
  description?: string;
}

interface MobileResultsGalleryProps {
  images: GalleryImage[];
  onDownload?: (image: GalleryImage) => void;
  onShare?: (image: GalleryImage) => void;
}

export function MobileResultsGallery({ images, onDownload, onShare }: MobileResultsGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Refs for focus management
  const galleryRef = useRef<HTMLDivElement>(null);
  const fullscreenTriggerRef = useRef<HTMLButtonElement>(null);
  const isKeyboardUserRef = useKeyboardDetection();
  
  // Focus trap for fullscreen modal
  const modalRef = useFocusTrap(isFullscreen, true);

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev + 1) % images.length);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
  };

  // Handle initial load state
  useEffect(() => {
    if (isInitialLoad && images.length > 0) {
      setIsInitialLoad(false);
    }
  }, [images.length, isInitialLoad]);

  // Keyboard navigation for main gallery
  const navigationRef = useKeyboardNavigation({
    enabled: !isFullscreen,
    enableArrowKeys: true,
    enableEnterSpace: true,
    enableEscape: true,
    onNext: goToNext,
    onPrevious: goToPrevious,
    onSelect: toggleFullscreen,
    onEscape: closeFullscreen,
    onKeyDown: (event) => {
      // Allow keyboard navigation only when not in input fields
      const target = event.target as HTMLElement;
      return !(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true');
    }
  });

  // Keyboard navigation for fullscreen modal
  const fullscreenNavigationRef = useKeyboardNavigation({
    enabled: isFullscreen,
    enableArrowKeys: true,
    enableEnterSpace: false,
    enableEscape: true,
    onNext: goToNext,
    onPrevious: goToPrevious,
    onEscape: closeFullscreen
  });

  // Handle escape key at document level for fullscreen modal
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (isFullscreen && event.code === 'Escape') {
        event.preventDefault();
        closeFullscreen();
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleGlobalKeyDown);
      return () => {
        document.removeEventListener('keydown', handleGlobalKeyDown);
      };
    }
  }, [isFullscreen]);

  const handleSwipe = (e: React.TouchEvent<HTMLDivElement>) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchStartX = e.currentTarget.dataset.touchStartX;
    
    if (!touchStartX) return;
    
    const diff = Number(touchStartX) - touchEndX;
    if (Math.abs(diff) > 50) { // Minimum swipe distance
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.currentTarget.dataset.touchStartX = String(e.touches[0].clientX);
  };

  if (images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];

  return (
    <>
      <div 
        className="mobile-results-gallery gallery-container focus-trap-container" 
        ref={(el) => {
          if (el) {
            navigationRef.current = el;
            galleryRef.current = el;
          }
        }}
        tabIndex={0}
        role="region"
        aria-label={`Image gallery with ${images.length} images. Currently viewing image ${currentIndex + 1}.`}
        aria-live="polite"
        aria-describedby="gallery-instructions"
      >
        {/* Screen reader instructions */}
        <div id="gallery-instructions" className="sr-only">
          Use arrow keys or left/right keys to navigate between images. 
          Press Enter or Space to view fullscreen. 
          Press Escape to exit fullscreen mode.
          {images.length > 1 && ` Currently showing image ${currentIndex + 1} of ${images.length}.`}
        </div>

        {/* Keyboard navigation hints (visible only for keyboard users) */}
        <div className="keyboard-navigation-only mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 animate-keyboard-hint">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-medium">Keyboard shortcuts:</span>
            {images.length > 1 && <span> Left/Right arrows to navigate •</span>}
            <span> Enter/Space for fullscreen •</span>
            <span> Escape to close</span>
          </p>
        </div>

        {/* Main Image Display */}
        <div className="relative bg-gray-100 rounded-xl overflow-hidden">
          <div
            className="relative aspect-[3/4] overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleSwipe}
          >
            <img
              src={currentImage.url}
              alt={`AI-generated outfit result: ${currentImage.title} ${currentImage.description || ''}`}
              className="w-full h-full object-contain"
            />

            {/* Navigation Arrows (visible on larger screens) */}
            {images.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all hidden sm:block"
                  aria-label="Previous image"
                  tabIndex={isFullscreen ? -1 : 0}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all hidden sm:block"
                  aria-label="Next image"
                  tabIndex={isFullscreen ? -1 : 0}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Action buttons */}
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                ref={fullscreenTriggerRef}
                onClick={toggleFullscreen}
                className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                aria-label={`View fullscreen (Press Enter or Space when gallery is focused)`}
                tabIndex={isFullscreen ? -1 : 0}
              >
                <Maximize2 className="w-5 h-5" />
              </button>
              {onShare && (
                <button
                  onClick={() => onShare(currentImage)}
                  className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                  aria-label="Share image"
                  tabIndex={isFullscreen ? -1 : 0}
                >
                  <Share2 className="w-5 h-5" />
                </button>
              )}
              {onDownload && (
                <button
                  onClick={() => onDownload(currentImage)}
                  className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                  aria-label="Download image"
                  tabIndex={isFullscreen ? -1 : 0}
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-sm rounded-full">
                {currentIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </div>

        {/* Image Info */}
        <div className="mt-4 text-center">
          <h3 className="text-responsive-lg font-semibold text-gray-900">
            {currentImage.title}
          </h3>
          {currentImage.description && (
            <p className="text-responsive-sm text-gray-600 mt-1">
              {currentImage.description}
            </p>
          )}
        </div>

        {/* Thumbnail Gallery */}
        {images.length > 1 && (
          <div className="mt-6">
            <h4 className="sr-only">Gallery thumbnails</h4>
            <div className="swipe-gallery" role="tablist" aria-label="Image gallery thumbnails">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`swipe-gallery-item flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    index === currentIndex
                      ? 'border-purple-500 ring-2 ring-purple-300'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  role="tab"
                  aria-selected={index === currentIndex}
                  aria-controls={`gallery-image-${index}`}
                  aria-label={`View image ${index + 1}: ${image.title}`}
                  tabIndex={isFullscreen ? -1 : 0}
                >
                  <img
                    src={image.url}
                    alt={`Thumbnail ${index + 1}: ${image.title} pose preview`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Swipe Indicator (mobile only) - hidden for keyboard users */}
        {images.length > 1 && (
          <div className="mt-4 text-center sm:hidden touch-only">
            <p className="text-responsive-xs text-gray-500">
              Swipe left or right to navigate
            </p>
            <div className="touch-indicator mt-2"></div>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen image viewer"
          ref={(el) => {
            if (el) {
              modalRef.current = el;
              fullscreenNavigationRef.current = el;
            }
          }}
        >
          <button
            onClick={closeFullscreen}
            className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 focus:bg-white/40 focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black transition-all"
            aria-label="Close fullscreen (Press Escape to close)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Screen reader instructions for fullscreen */}
          <div className="sr-only" aria-live="polite">
            Fullscreen mode active. Use arrow keys to navigate between images. Press Escape to close.
            Currently viewing image {currentIndex + 1} of {images.length}: {currentImage.title}
            {currentImage.description && `. ${currentImage.description}`}
          </div>
          
          <div
            className="w-full h-full flex items-center justify-center p-4"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleSwipe}
          >
            <img
              src={currentImage.url}
              alt={`Fullscreen view of AI-generated outfit result: ${currentImage.title} ${currentImage.description || ''}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Fullscreen navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 focus:bg-white/40 focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black transition-all"
                aria-label="Previous image (Left arrow key)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 focus:bg-white/40 focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black transition-all"
                aria-label="Next image (Right arrow key)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Fullscreen counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 text-white rounded-full">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
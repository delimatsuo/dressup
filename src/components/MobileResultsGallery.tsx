'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Share2, Maximize2, X } from 'lucide-react';

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

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev + 1) % images.length);
  };

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
      <div className="mobile-results-gallery">
        {/* Main Image Display */}
        <div className="relative bg-gray-100 rounded-xl overflow-hidden">
          <div
            className="relative aspect-[3/4] overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleSwipe}
          >
            <img
              src={currentImage.url}
              alt={currentImage.title}
              className="w-full h-full object-contain"
            />

            {/* Navigation Arrows (visible on larger screens) */}
            {images.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all hidden sm:block"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all hidden sm:block"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Action buttons */}
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all"
                aria-label="View fullscreen"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
              {onShare && (
                <button
                  onClick={() => onShare(currentImage)}
                  className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all"
                  aria-label="Share image"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              )}
              {onDownload && (
                <button
                  onClick={() => onDownload(currentImage)}
                  className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all"
                  aria-label="Download image"
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
            <div className="swipe-gallery">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`swipe-gallery-item flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex
                      ? 'border-purple-500 ring-2 ring-purple-300'
                      : 'border-gray-200'
                  }`}
                >
                  <img
                    src={image.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Swipe Indicator (mobile only) */}
        {images.length > 1 && (
          <div className="mt-4 text-center sm:hidden">
            <p className="text-responsive-xs text-gray-500">
              Swipe left or right to navigate
            </p>
            <div className="touch-indicator mt-2"></div>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all"
            aria-label="Close fullscreen"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div
            className="w-full h-full flex items-center justify-center p-4"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleSwipe}
          >
            <img
              src={currentImage.url}
              alt={currentImage.title}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Fullscreen navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all"
                aria-label="Next image"
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
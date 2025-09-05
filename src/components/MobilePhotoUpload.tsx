'use client';

import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Check, RotateCw } from 'lucide-react';

interface MobilePhotoUploadProps {
  views: string[];
  onComplete: (photos: Record<string, string>) => void;
  title: string;
  description?: string;
}

export function MobilePhotoUpload({ 
  views, 
  onComplete, 
  title, 
  description 
}: MobilePhotoUploadProps) {
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [currentView, setCurrentView] = useState(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement>>({});

  const handlePhotoCapture = (view: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPhotos = {
          ...photos,
          [view]: reader.result as string
        };
        setPhotos(newPhotos);
        
        // Auto-advance to next view
        if (currentView < views.length - 1) {
          setTimeout(() => setCurrentView(currentView + 1), 300);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (view: string) => {
    const newPhotos = { ...photos };
    delete newPhotos[view];
    setPhotos(newPhotos);
  };

  const retakePhoto = (view: string) => {
    fileInputRefs.current[view]?.click();
  };

  const allPhotosUploaded = views.every(view => photos[view]);

  return (
    <div className="mobile-container">
      <div className="mobile-card">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-responsive-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          {description && (
            <p className="text-responsive-base text-gray-600 dark:text-gray-400 mt-2">
              {description}
            </p>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          {views.map((view, index) => (
            <div key={view} className="flex items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  transition-all duration-300
                  ${photos[view] 
                    ? 'bg-green-500 text-white' 
                    : index === currentView
                    ? 'bg-purple-500 text-white ring-2 ring-purple-300'
                    : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                {photos[view] ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              {index < views.length - 1 && (
                <div 
                  className={`
                    w-12 sm:w-20 h-0.5 mx-1
                    transition-all duration-300
                    ${photos[view] ? 'bg-green-500' : 'bg-gray-200'}
                  `}
                />
              )}
            </div>
          ))}
        </div>

        {/* Current View Title */}
        <div className="text-center mb-4">
          <h3 className="text-responsive-lg font-semibold capitalize">
            {views[currentView]} View
          </h3>
        </div>

        {/* Photo Capture Area */}
        <div className="space-y-4">
          {views.map((view, index) => (
            <div
              key={view}
              className={`
                transition-all duration-300
                ${index === currentView ? 'block' : 'hidden'}
              `}
            >
              {!photos[view] ? (
                <div className="relative">
                  <input
                    ref={el => {
                      if (el) fileInputRefs.current[view] = el;
                    }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handlePhotoCapture(view, e)}
                    className="hidden"
                    id={`photo-${view}`}
                  />
                  <label
                    htmlFor={`photo-${view}`}
                    className="
                      block w-full aspect-square
                      bg-gray-50 dark:bg-gray-800
                      border-2 border-dashed border-gray-300 dark:border-gray-600
                      rounded-2xl
                      flex flex-col items-center justify-center
                      cursor-pointer
                      hover:bg-gray-100 dark:hover:bg-gray-700
                      active:scale-98
                      transition-all
                    "
                  >
                    <Camera className="w-16 h-16 text-gray-400 mb-4" />
                    <span className="text-responsive-base font-medium text-gray-600 dark:text-gray-400">
                      Tap to take photo
                    </span>
                    <span className="text-responsive-sm text-gray-500 mt-1">
                      or select from gallery
                    </span>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100">
                    <img
                      src={photos[view]}
                      alt={`${view} view`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={() => retakePhoto(view)}
                      className="
                        p-2 bg-white/90 backdrop-blur-sm rounded-full
                        shadow-lg hover:bg-white active:scale-95
                        transition-all
                      "
                      aria-label="Retake photo"
                    >
                      <RotateCw className="w-5 h-5 text-gray-700" />
                    </button>
                    <button
                      onClick={() => removePhoto(view)}
                      className="
                        p-2 bg-white/90 backdrop-blur-sm rounded-full
                        shadow-lg hover:bg-white active:scale-95
                        transition-all
                      "
                      aria-label="Remove photo"
                    >
                      <X className="w-5 h-5 text-red-500" />
                    </button>
                  </div>

                  {/* View label */}
                  <div className="absolute bottom-2 left-2">
                    <span className="
                      px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full
                      text-sm font-medium text-gray-700 shadow-lg
                    ">
                      {view} view
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Thumbnail Gallery */}
        {Object.keys(photos).length > 0 && (
          <div className="mt-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {views.map((view, index) => (
                <button
                  key={view}
                  onClick={() => setCurrentView(index)}
                  className={`
                    flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden
                    border-2 transition-all
                    ${index === currentView 
                      ? 'border-purple-500 ring-2 ring-purple-300' 
                      : 'border-gray-200'
                    }
                    ${!photos[view] ? 'bg-gray-100' : ''}
                  `}
                >
                  {photos[view] ? (
                    <img
                      src={photos[view]}
                      alt={`${view} thumbnail`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-6">
          {currentView > 0 && (
            <button
              onClick={() => setCurrentView(currentView - 1)}
              className="
                touch-button
                bg-gray-100 text-gray-700
                hover:bg-gray-200
                flex-1
              "
            >
              Previous
            </button>
          )}
          
          {currentView < views.length - 1 ? (
            <button
              onClick={() => setCurrentView(currentView + 1)}
              disabled={!photos[views[currentView]]}
              className="
                touch-button
                bg-purple-500 text-white
                hover:bg-purple-600
                disabled:bg-gray-300
                flex-1
              "
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => onComplete(photos)}
              disabled={!allPhotosUploaded}
              className="
                touch-button
                bg-green-500 text-white
                hover:bg-green-600
                disabled:bg-gray-300
                flex-1
              "
            >
              Complete
            </button>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-4 text-center">
          <p className="text-responsive-sm text-gray-500">
            {allPhotosUploaded 
              ? 'All photos captured! Tap Complete to continue.'
              : `${Object.keys(photos).length} of ${views.length} photos captured`
            }
          </p>
        </div>
      </div>
    </div>
  );
}
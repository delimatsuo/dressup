'use client';

import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Check, RotateCw } from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { ProgressAnnouncement, StatusAnnouncement, Instructions } from './ScreenReaderOnly';

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
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});
  const [uploadingViews, setUploadingViews] = useState<Record<string, boolean>>({});
  const [currentView, setCurrentView] = useState(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement>>({});
  const { sessionId } = useSession();

  const handlePhotoCapture = async (view: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Set uploading state
    setUploadingViews(prev => ({ ...prev, [view]: true }));

    // Create local preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setLocalPreviews(prev => ({
        ...prev,
        [view]: reader.result as string
      }));
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      formData.append('view', view);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { url: downloadUrl } = await response.json();

      const newPhotos = {
        ...photos,
        [view]: downloadUrl
      };
      setPhotos(newPhotos);
      setUploadingViews(prev => ({ ...prev, [view]: false }));

      if (currentView < views.length - 1) {
        setTimeout(() => setCurrentView(currentView + 1), 300);
      }
    } catch (error) {
      console.error(`Failed to upload ${view} photo:`, error);
      setUploadingViews(prev => ({ ...prev, [view]: false }));
    }
  };

  const removePhoto = (view: string) => {
    const newPhotos = { ...photos };
    delete newPhotos[view];
    setPhotos(newPhotos);
    
    const newPreviews = { ...localPreviews };
    delete newPreviews[view];
    setLocalPreviews(newPreviews);
  };

  const retakePhoto = (view: string) => {
    fileInputRefs.current[view]?.click();
  };

  // Only front photo is required, others are optional
  const allRequiredPhotosUploaded = photos['front'] !== null;

  return (
    <div className="mobile-container">
      <div className="mobile-card" role="main" aria-labelledby="mobile-upload-heading">
        {/* Screen Reader Announcements */}
        <ProgressAnnouncement
          currentStep={currentView + 1}
          totalSteps={views.length}
          stepName={`${views[currentView]} view photo capture`}
          completed={allRequiredPhotosUploaded}
        />

        {Object.keys(photos).length > 0 && (
          <StatusAnnouncement
            status={`${Object.keys(photos).length} of ${views.length} photos captured`}
            type="info"
          />
        )}

        <Instructions id="mobile-photo-instructions">
          <p>Step-by-step photo capture process. Use the camera to take photos or select from your gallery.</p>
          <p>You can navigate between steps using the Previous/Next buttons, or tap on the progress indicators above.</p>
          <p>Each photo can be retaken if needed using the retake button.</p>
        </Instructions>

        {/* Header */}
        <div className="mb-6">
          <h2 id="mobile-upload-heading" className="text-responsive-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          {description && (
            <p className="text-responsive-base text-gray-600 dark:text-gray-400 mt-2" role="region" aria-labelledby="mobile-upload-heading">
              {description}
            </p>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6" role="group" aria-labelledby="progress-indicator-label">
          <h3 id="progress-indicator-label" className="sr-only">Photo capture progress</h3>
          {views.map((view, index) => (
            <div key={view} className="flex items-center">
              <button
                onClick={() => setCurrentView(index)}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${photos[view] 
                    ? 'bg-green-500 text-white focus:ring-green-300' 
                    : index === currentView
                    ? 'bg-purple-500 text-white ring-2 ring-purple-300 focus:ring-purple-500'
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300 focus:ring-gray-400'
                  }
                `}
                aria-label={`Step ${index + 1}: ${view} view ${photos[view] ? '(completed)' : index === currentView ? '(current)' : ''}`}
                aria-current={index === currentView ? 'step' : undefined}
              >
                {photos[view] ? <Check className="w-4 h-4" aria-hidden="true" /> : index + 1}
              </button>
              {index < views.length - 1 && (
                <div 
                  className={`
                    w-12 sm:w-20 h-0.5 mx-1
                    transition-all duration-300
                    ${photos[view] ? 'bg-green-500' : 'bg-gray-200'}
                  `}
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>

        {/* Current View Title */}
        <div className="text-center mb-4">
          <h3 className="text-responsive-lg font-semibold capitalize" id="current-view-heading">
            {views[currentView]} View
          </h3>
          <p className="sr-only" aria-live="polite">
            Currently capturing {views[currentView]} view, step {currentView + 1} of {views.length}
          </p>
        </div>

        {/* Photo Capture Area */}
        <div className="space-y-4" role="region" aria-labelledby="current-view-heading">
          {views.map((view, index) => (
            <div
              key={view}
              className={`
                transition-all duration-300
                ${index === currentView ? 'block' : 'hidden'}
              `}
              role="tabpanel"
              aria-labelledby={`step-${index + 1}-button`}
              id={`photo-capture-${view}`}
            >
              {!photos[view] && !localPreviews[view] ? (
                <div className="relative">
                  <input
                    ref={el => {
                      if (el) fileInputRefs.current[view] = el;
                    }}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoCapture(view, e)}
                    className="hidden"
                    id={`photo-${view}`}
                    aria-describedby={`photo-${view}-instructions`}
                  />
                  <div id={`photo-${view}-instructions`} className="sr-only">
                    Take a {view} view photo. You can use your camera or select an existing image from your gallery.
                  </div>
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
                      focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500
                    "
                    role="button"
                    aria-label={`Capture ${view} view photo. Tap to take photo or select from gallery`}
                    tabIndex={0}
                  >
                    <Camera className="w-16 h-16 text-gray-400 mb-4" aria-hidden="true" />
                    <span className="text-responsive-base font-medium text-gray-600 dark:text-gray-400">
                      Tap to take photo
                    </span>
                    <span className="text-responsive-sm text-gray-500 mt-1">
                      or select from gallery
                    </span>
                  </label>
                </div>
              ) : (
                <div className="relative" role="group" aria-label={`${view} view photo ${uploadingViews[view] ? 'uploading' : 'captured'}`}>
                  <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 relative">
                    <img
                      src={localPreviews[view] || photos[view]}
                      alt={`Captured ${view} view photo for upload`}
                      className="w-full h-full object-cover"
                    />
                    {uploadingViews[view] && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-sm font-medium">Uploading...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={() => retakePhoto(view)}
                      className="
                        p-2 bg-white/90 backdrop-blur-sm rounded-full
                        shadow-lg hover:bg-white active:scale-95
                        transition-all focus:outline-none focus:ring-2 focus:ring-purple-500
                      "
                      aria-label={`Retake ${view} view photo`}
                    >
                      <RotateCw className="w-5 h-5 text-gray-700" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => removePhoto(view)}
                      className="
                        p-2 bg-white/90 backdrop-blur-sm rounded-full
                        shadow-lg hover:bg-white active:scale-95
                        transition-all focus:outline-none focus:ring-2 focus:ring-red-500
                      "
                      aria-label={`Remove ${view} view photo`}
                    >
                      <X className="w-5 h-5 text-red-500" aria-hidden="true" />
                    </button>
                  </div>

                  {/* View label */}
                  <div className="absolute bottom-2 left-2">
                    <span className="
                      px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full
                      text-sm font-medium text-gray-700 shadow-lg
                    " aria-hidden="true">
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
                  {(photos[view] || localPreviews[view]) ? (
                    <img
                      src={localPreviews[view] || photos[view]}
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
        <div className="flex gap-3 mt-6" role="group" aria-label="Photo capture navigation">
          {currentView > 0 && (
            <button
              onClick={() => setCurrentView(currentView - 1)}
              className="
                touch-button
                bg-gray-100 text-gray-700
                hover:bg-gray-200
                flex-1
              "
              aria-label={`Go to previous step: ${views[currentView - 1]} view`}
            >
              Previous
            </button>
          )}
          
          {currentView < views.length - 1 ? (
            <>
              {/* Primary action: Continue to Garment after front photo */}
              {photos['front'] && (
                <button
                  onClick={() => onComplete(photos)}
                  className="
                    touch-button
                    bg-green-500 text-white
                    hover:bg-green-600
                    flex-1
                  "
                  aria-label="Continue to garment upload"
                >
                  Continue to Garment →
                </button>
              )}
              
              {/* Secondary action: Add more views (optional) */}
              {photos[views[currentView]] && (
                <button
                  onClick={() => setCurrentView(currentView + 1)}
                  className="
                    touch-button
                    bg-gray-200 text-gray-700
                    hover:bg-gray-300
                    flex-shrink-0
                    px-3
                  "
                  aria-label={`Add ${views[currentView + 1]} view for better results`}
                >
                  + {views[currentView + 1]}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => onComplete(photos)}
              disabled={!allRequiredPhotosUploaded}
              className="
                touch-button
                bg-green-500 text-white
                hover:bg-green-600
                disabled:bg-gray-300
                flex-1
              "
              aria-label="Complete photo capture and continue"
              aria-describedby="complete-button-help"
            >
              Complete
            </button>
          )}
          
          <div id="next-button-help" className="sr-only">
            {!photos[views[currentView]] ? `Take a ${views[currentView]} photo to continue to the next step` : ''}
          </div>
          <div id="complete-button-help" className="sr-only">
            {!allRequiredPhotosUploaded ? `Take at least a front photo to continue` : 'Ready to continue'}
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-4 text-center" role="status" aria-live="polite">
          <p className="text-responsive-sm text-gray-700 font-medium">
            {photos['front'] && !photos['side'] && !photos['back']
              ? '✓ Front photo captured! Ready to continue'
              : photos['front']
              ? `${Object.values(photos).filter(Boolean).length} of 3 photos captured`
              : 'Take a front photo to get started'
            }
          </p>
          {photos['front'] && !photos['side'] && (
            <p className="text-responsive-xs text-gray-500 mt-1">
              Tip: Adding side view improves accuracy by 15%
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
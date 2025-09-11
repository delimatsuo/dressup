'use client';

import React from 'react';

interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  live?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  className?: string;
}

/**
 * Component for content that should only be visible to screen readers
 * Uses sr-only class for visual hiding while keeping content accessible
 */
export function ScreenReaderOnly({ 
  children, 
  live, 
  atomic = true, 
  className = '' 
}: ScreenReaderOnlyProps) {
  const props: React.HTMLAttributes<HTMLDivElement> = {
    className: `sr-only ${className}`.trim(),
  };

  if (live) {
    props['aria-live'] = live;
  }

  if (atomic) {
    props['aria-atomic'] = atomic;
  }

  return <div {...props}>{children}</div>;
}

/**
 * Live region for status updates that should be announced immediately
 */
interface LiveRegionProps {
  message: string;
  type?: 'polite' | 'assertive';
  atomic?: boolean;
  id?: string;
}

export function LiveRegion({ 
  message, 
  type = 'polite', 
  atomic = true, 
  id 
}: LiveRegionProps) {
  if (!message) return null;

  return (
    <div
      id={id}
      className="sr-only"
      aria-live={type}
      aria-atomic={atomic}
      role={type === 'assertive' ? 'alert' : 'status'}
    >
      {message}
    </div>
  );
}

/**
 * Instructions component for complex interactions
 */
interface InstructionsProps {
  id: string;
  title?: string;
  children: React.ReactNode;
}

export function Instructions({ id, title, children }: InstructionsProps) {
  return (
    <div id={id} className="sr-only">
      {title && <h4>{title}</h4>}
      {children}
    </div>
  );
}

/**
 * Status announcement component
 */
interface StatusAnnouncementProps {
  status: string;
  details?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export function StatusAnnouncement({ 
  status, 
  details, 
  type = 'info' 
}: StatusAnnouncementProps) {
  const liveType = type === 'error' || type === 'warning' ? 'assertive' : 'polite';
  const role = type === 'error' || type === 'warning' ? 'alert' : 'status';

  return (
    <div
      className="sr-only"
      aria-live={liveType}
      aria-atomic="true"
      role={role}
    >
      {status}
      {details && ` ${details}`}
    </div>
  );
}

/**
 * Progress announcement for multi-step processes
 */
interface ProgressAnnouncementProps {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  completed?: boolean;
}

export function ProgressAnnouncement({ 
  currentStep, 
  totalSteps, 
  stepName, 
  completed = false 
}: ProgressAnnouncementProps) {
  const message = completed 
    ? `${stepName} completed. All ${totalSteps} steps finished.`
    : `Step ${currentStep} of ${totalSteps}: ${stepName}`;

  return (
    <LiveRegion 
      message={message} 
      type="polite" 
    />
  );
}

/**
 * Loading announcement component
 */
interface LoadingAnnouncementProps {
  isLoading: boolean;
  loadingText: string;
  completedText?: string;
  progress?: number;
}

export function LoadingAnnouncement({ 
  isLoading, 
  loadingText, 
  completedText, 
  progress 
}: LoadingAnnouncementProps) {
  let message = '';
  
  if (isLoading) {
    message = progress !== undefined 
      ? `${loadingText} ${Math.round(progress)}% complete`
      : loadingText;
  } else if (completedText) {
    message = completedText;
  }

  if (!message) return null;

  return (
    <LiveRegion 
      message={message} 
      type="polite" 
    />
  );
}

/**
 * Form validation announcement
 */
interface FormValidationProps {
  errors: string[];
  fieldName?: string;
}

export function FormValidationAnnouncement({ errors, fieldName }: FormValidationProps) {
  if (errors.length === 0) return null;

  const message = fieldName
    ? `${fieldName} has ${errors.length} error${errors.length > 1 ? 's' : ''}: ${errors.join(', ')}`
    : `Form has ${errors.length} error${errors.length > 1 ? 's' : ''}: ${errors.join(', ')}`;

  return (
    <LiveRegion 
      message={message} 
      type="assertive" 
    />
  );
}

/**
 * Gallery navigation instructions
 */
export function GalleryInstructions() {
  return (
    <Instructions id="gallery-navigation-instructions" title="Gallery Navigation">
      <p>Use arrow keys to navigate between images. Press Enter or Space to view in fullscreen. Press Escape to close fullscreen view.</p>
      <p>On mobile devices, swipe left or right to navigate between images, or tap the thumbnail buttons below.</p>
    </Instructions>
  );
}

/**
 * Photo upload instructions
 */
export function PhotoUploadInstructions() {
  return (
    <Instructions id="photo-upload-instructions" title="Photo Upload Instructions">
      <p>Upload photos by clicking the upload areas or dragging and dropping files. Supported formats: JPG, PNG, HEIC, HEIF, WebP. Maximum file size: 50MB.</p>
      <p>For best results, use good lighting and a plain background. Ensure the entire subject is visible in the frame.</p>
    </Instructions>
  );
}

/**
 * Star rating instructions
 */
export function StarRatingInstructions() {
  return (
    <Instructions id="star-rating-instructions" title="Star Rating Instructions">
      <p>Use the number keys 1-5 to quickly select a rating, or click/tap the star buttons. Your current rating will be announced as you make selections.</p>
    </Instructions>
  );
}
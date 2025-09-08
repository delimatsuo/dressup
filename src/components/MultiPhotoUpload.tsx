'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Camera, Check, AlertCircle, RefreshCw, Clock, Zap } from 'lucide-react';
import Image from 'next/image';
import { useSessionContext } from './SessionProvider';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeFirebase } from '@/lib/firebase';
import { LoadingAnnouncement, StatusAnnouncement, Instructions } from './ScreenReaderOnly';

type PhotoType = 'front' | 'side' | 'back';
type PhotoCategory = 'user' | 'garment';

interface PhotoUpload {
  type: PhotoType;
  file: File | null;
  url: string | null;
  uploading: boolean;
  progress: number;
  error: string | null;
  uploadAttempts: number;
  lastUploadTime: number | null;
  uploadSpeed: number | null; // bytes per second
  timeRemaining: number | null; // seconds
}

interface MultiPhotoUploadProps {
  category: PhotoCategory;
  onUploadComplete?: (photos: Record<PhotoType, string>) => void;
}

const PHOTO_LABELS = {
  front: 'Front View',
  side: 'Side View',
  back: 'Back View (Optional)'
};

const PHOTO_DESCRIPTIONS = {
  user: {
    front: 'Stand facing the camera',
    side: 'Stand sideways to the camera',
    back: 'Stand with back to camera'
  },
  garment: {
    front: 'Front of the garment',
    side: 'Side view of garment',
    back: 'Back of the garment'
  }
};

// Utility functions for formatting upload info
const formatUploadSpeed = (bytesPerSecond: number | null): string => {
  if (!bytesPerSecond || bytesPerSecond === 0) return '';
  
  const mbps = bytesPerSecond / (1024 * 1024);
  if (mbps >= 1) {
    return `${mbps.toFixed(1)} MB/s`;
  }
  
  const kbps = bytesPerSecond / 1024;
  return `${kbps.toFixed(0)} KB/s`;
};

const formatTimeRemaining = (seconds: number | null): string => {
  if (!seconds || seconds === 0) return '';
  
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s remaining`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.ceil(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} remaining`;
};

export function MultiPhotoUpload({ category, onUploadComplete }: MultiPhotoUploadProps) {
  const { sessionId, addPhotoToSession } = useSessionContext();
  const [isComplete, setIsComplete] = useState(false);
  
  // Initialize photos from localStorage if available
  const [photos, setPhotos] = useState<Record<PhotoType, PhotoUpload>>(() => {
    if (typeof window !== 'undefined') {
      const storageKey = `dressup_photos_${category}_${sessionId}`;
      const savedPhotos = localStorage.getItem(storageKey);
      if (savedPhotos) {
        try {
          const parsed = JSON.parse(savedPhotos);
          // Restore URLs but reset upload states
          return {
            front: {
              type: 'front',
              file: null,
              url: parsed.front?.url || null,
              uploading: false,
              progress: 0,
              error: null,
              uploadAttempts: 0,
              lastUploadTime: null,
              uploadSpeed: null,
              timeRemaining: null
            },
            side: {
              type: 'side',
              file: null,
              url: parsed.side?.url || null,
              uploading: false,
              progress: 0,
              error: null,
              uploadAttempts: 0,
              lastUploadTime: null,
              uploadSpeed: null,
              timeRemaining: null
            },
            back: {
              type: 'back',
              file: null,
              url: parsed.back?.url || null,
              uploading: false,
              progress: 0,
              error: null,
              uploadAttempts: 0,
              lastUploadTime: null,
              uploadSpeed: null,
              timeRemaining: null
            }
          };
        } catch (e) {
          console.error('Error parsing saved photos:', e);
        }
      }
    }
    
    // Default state if no saved photos
    return {
      front: { 
        type: 'front', 
        file: null, 
        url: null, 
        uploading: false, 
        progress: 0, 
        error: null,
        uploadAttempts: 0,
        lastUploadTime: null,
        uploadSpeed: null,
        timeRemaining: null
      },
      side: { 
        type: 'side', 
        file: null, 
        url: null, 
        uploading: false, 
        progress: 0, 
        error: null,
        uploadAttempts: 0,
        lastUploadTime: null,
        uploadSpeed: null,
        timeRemaining: null
      },
      back: { 
        type: 'back', 
        file: null, 
        url: null, 
        uploading: false, 
        progress: 0, 
        error: null,
        uploadAttempts: 0,
        lastUploadTime: null,
        uploadSpeed: null,
        timeRemaining: null
      }
    };
  });

  const fileInputRefs = useRef<Record<PhotoType, HTMLInputElement | null>>({
    front: null,
    side: null,
    back: null
  });

  // Save photos to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionId) {
      const storageKey = `dressup_photos_${category}_${sessionId}`;
      const photosToSave = {
        front: { url: photos.front.url },
        side: { url: photos.side.url },
        back: { url: photos.back.url }
      };
      localStorage.setItem(storageKey, JSON.stringify(photosToSave));
    }
  }, [photos, category, sessionId]);
  
  // Check for upload completion whenever photos state changes
  useEffect(() => {
    const frontUrl = photos.front.url;
    // Only front is required now, side and back are optional
    if (frontUrl && !isComplete) {
      setIsComplete(true);
    }
  }, [photos.front.url, isComplete]);
  
  // Handle continue button click
  const handleContinue = () => {
    if (photos.front.url && onUploadComplete) {
      onUploadComplete({
        front: photos.front.url,
        side: photos.side.url || '',
        back: photos.back.url || ''
      });
    }
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Please upload a JPG, PNG, HEIC, or WebP image';
    }

    // Check file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  const handleFileSelect = async (type: PhotoType, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setPhotos(prev => ({
        ...prev,
        [type]: { ...prev[type], error }
      }));
      return;
    }

    // Clear previous error
    setPhotos(prev => ({
      ...prev,
      [type]: { ...prev[type], file, error: null }
    }));

    // Start upload automatically
    await uploadPhoto(type, file);
  };

  const uploadPhoto = async (type: PhotoType, file: File, retryAttempt = 0) => {
    const MAX_RETRIES = 2;
    
    if (!sessionId) {
      setPhotos(prev => ({
        ...prev,
        [type]: { ...prev[type], error: 'No session found. Please refresh the page.' }
      }));
      return;
    }

    // Update upload state
    const uploadStartTime = Date.now();
    setPhotos(prev => ({
      ...prev,
      [type]: { 
        ...prev[type], 
        uploading: true, 
        progress: 0, 
        error: null,
        uploadAttempts: retryAttempt + 1,
        uploadSpeed: null,
        timeRemaining: null
      }
    }));

    try {
      // Try Firebase upload first
      let uploadURL: string | null = null;
      
      try {
        // Initialize Firebase if needed
        const app = initializeFirebase();
        if (!app) {
          throw new Error('Firebase not initialized');
        }
        const { getStorage } = await import('firebase/storage');
        const storage = getStorage(app);
        
      // Create storage reference matching Firebase security rules
      const timestamp = Date.now();
      const fileName = `uploads/${sessionId}/${timestamp}_${type}/${file.name}`;
      const storageRef = ref(storage, fileName);

      console.log('Starting Firebase upload to:', fileName);
      console.log('Storage reference:', storageRef);
      console.log('File details:', { name: file.name, size: file.size, type: file.type });

      // Upload file with enhanced progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);
      let lastProgressUpdate = uploadStartTime;
      let lastBytesTransferred = 0;

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          const now = Date.now();
          const timeElapsed = (now - lastProgressUpdate) / 1000; // seconds
          
          // Calculate upload speed
          let uploadSpeed = null;
          let timeRemaining = null;
          
          if (timeElapsed >= 1) { // Update speed every second
            const bytesTransferredSinceLastUpdate = snapshot.bytesTransferred - lastBytesTransferred;
            uploadSpeed = bytesTransferredSinceLastUpdate / timeElapsed; // bytes per second
            
            if (uploadSpeed > 0) {
              const bytesRemaining = snapshot.totalBytes - snapshot.bytesTransferred;
              timeRemaining = bytesRemaining / uploadSpeed; // seconds
            }
            
            lastProgressUpdate = now;
            lastBytesTransferred = snapshot.bytesTransferred;
          }
          
          setPhotos(prev => ({
            ...prev,
            [type]: { 
              ...prev[type], 
              progress,
              uploadSpeed: uploadSpeed || prev[type].uploadSpeed,
              timeRemaining: timeRemaining || prev[type].timeRemaining
            }
          }));
        },
        (error) => {
          console.error('Upload error details:', {
            code: error.code,
            message: error.message,
            fileName,
            sessionId,
            category,
            type
          });
          
          // Determine if we should retry
          const shouldRetry = retryAttempt < MAX_RETRIES && 
            (error.code === 'storage/retry-limit-exceeded' || 
             error.code === 'storage/canceled' ||
             error.code === 'storage/unknown');

          if (shouldRetry) {
            console.log(`Retrying upload for ${type}, attempt ${retryAttempt + 1}`);
            // Wait a bit before retrying (exponential backoff)
            setTimeout(() => {
              uploadPhoto(type, file, retryAttempt + 1);
            }, Math.pow(2, retryAttempt) * 1000);
          } else {
            const errorMessage = error.code === 'storage/quota-exceeded' 
              ? 'Upload quota exceeded. Please try again later.'
              : error.code === 'storage/unauthenticated'
              ? 'Authentication error. Please refresh the page.'
              : `Upload failed after ${retryAttempt + 1} attempts. Please try again.`;
              
            setPhotos(prev => ({
              ...prev,
              [type]: { ...prev[type], uploading: false, error: errorMessage }
            }));
          }
        },
        async () => {
          try {
            // Upload completed successfully
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Add photo to session
            const success = await addPhotoToSession(downloadURL, category, type);
            
            if (success) {
              setPhotos(prev => ({
                ...prev,
                [type]: { 
                  ...prev[type], 
                  url: downloadURL, 
                  uploading: false, 
                  progress: 100,
                  lastUploadTime: Date.now(),
                  uploadSpeed: null,
                  timeRemaining: null
                }
              }));

            } else {
              setPhotos(prev => ({
                ...prev,
                [type]: { ...prev[type], uploading: false, error: 'Failed to save photo to session.' }
              }));
            }
          } catch (sessionError) {
            console.error('Session save error:', sessionError);
            setPhotos(prev => ({
              ...prev,
              [type]: { ...prev[type], uploading: false, error: 'Failed to save photo to session.' }
            }));
          }
        }
      );
      
      } catch (firebaseError) {
        console.error('Firebase error:', firebaseError);
        throw firebaseError;
      }
      
    } catch (error) {
      console.error('Upload initialization error:', error);
      setPhotos(prev => ({
        ...prev,
        [type]: { ...prev[type], uploading: false, error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
      }));
    }
  };


  const removePhoto = (type: PhotoType) => {
    setPhotos(prev => ({
      ...prev,
      [type]: { 
        type, 
        file: null, 
        url: null, 
        uploading: false, 
        progress: 0, 
        error: null,
        uploadAttempts: 0,
        lastUploadTime: null,
        uploadSpeed: null,
        timeRemaining: null
      }
    }));
    
    // Reset file input
    if (fileInputRefs.current[type]) {
      fileInputRefs.current[type]!.value = '';
    }
  };

  const retryUpload = async (type: PhotoType) => {
    const photo = photos[type];
    if (photo.file) {
      await uploadPhoto(type, photo.file, 0);
    }
  };

  const [visibleUploads, setVisibleUploads] = useState(1);

  const renderPhotoUpload = (type: PhotoType) => {
    const photo = photos[type];
    const isOptional = type === 'back';
    const description = PHOTO_DESCRIPTIONS[category][type];

    return (
      <div key={type} className="relative" role="group" aria-labelledby={`photo-${type}-label`}>
        <label id={`photo-${type}-label`} className="block text-base font-bold text-gray-800 mb-2">
          {PHOTO_LABELS[type]}
          {isOptional && <span className="text-gray-500 ml-1 font-normal">(Optional)</span>}
        </label>
        
        <div className="relative">
          <input
            ref={el => { fileInputRefs.current[type] = el; }}
            type="file"
            accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
            onChange={(e) => handleFileSelect(type, e)}
            className="hidden"
            id={`photo-${type}`}
            disabled={photo.uploading}
            aria-describedby={`photo-${type}-description`}
            aria-label={`Upload ${type} view photo for ${category}`}
          />
          
          <div id={`photo-${type}-description`} className="sr-only">
            {description}. Supported formats: JPG, PNG, HEIC, WebP. Maximum size: 10MB.
            {photo.uploading && ` Currently uploading: ${Math.round(photo.progress)}% complete.`}
            {photo.error && ` Error: ${photo.error}`}
            {photo.url && ' Upload completed successfully.'}
          </div>
          
          <label
            htmlFor={`photo-${type}`}
            className={`
              relative block w-full aspect-[3/4] border-2 border-dashed rounded-xl
              cursor-pointer transition-all overflow-hidden shadow-lg hover:shadow-xl
              ${photo.url ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50' : 'border-gray-400 hover:border-blue-500 bg-gradient-to-br from-gray-50 to-gray-100'}
              ${photo.uploading ? 'cursor-not-allowed opacity-60' : ''}
              ${photo.error ? 'border-red-500 bg-gradient-to-br from-red-50 to-pink-50' : ''}
            `}
            role="button"
            aria-label={
              photo.url 
                ? `${type} photo uploaded successfully. Click to change photo.`
                : photo.uploading 
                  ? `Uploading ${type} photo, ${Math.round(photo.progress)}% complete`
                  : `Click to upload ${type} view photo`
            }
            tabIndex={photo.uploading ? -1 : 0}
          >
            {photo.url ? (
              <div className="relative w-full h-full">
                <Image
                  src={photo.url}
                  alt={`${category} ${type} view`}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <div className="bg-green-500 text-white p-2 rounded-full" role="img" aria-label="Photo uploaded successfully">
                    <Check className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      removePhoto(type);
                    }}
                    className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors focus:ring-2 focus:ring-red-300 focus:outline-none"
                    aria-label={`Remove ${type} view photo for ${category}`}
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4">
                {photo.uploading ? (
                  <>
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" aria-hidden="true" />
                    
                    <div className="text-center mb-2">
                      <p className="text-sm font-medium text-gray-700" aria-live="polite">
                        Uploading... <span aria-label={`${Math.round(photo.progress)} percent complete`}>{Math.round(photo.progress)}%</span>
                      </p>
                      
                      {photo.uploadAttempts > 1 && (
                        <p className="text-xs text-orange-600" aria-live="polite">
                          Attempt {photo.uploadAttempts}
                        </p>
                      )}
                    </div>
                    
                    {/* Progress bar */}
                    <div 
                      className="w-full max-w-xs bg-gray-200 rounded-full h-2 mb-2"
                      role="progressbar"
                      aria-valuenow={Math.round(photo.progress)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${type} photo upload progress`}
                    >
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${photo.progress}%` }}
                      />
                    </div>
                    
                    {/* Upload speed and time remaining */}
                    <div className="text-center text-xs text-gray-500 space-y-1" aria-live="polite" aria-atomic="false">
                      {photo.uploadSpeed && (
                        <div className="flex items-center justify-center">
                          <Zap className="w-3 h-3 mr-1" aria-hidden="true" />
                          <span aria-label={`Upload speed: ${formatUploadSpeed(photo.uploadSpeed)}`}>
                            {formatUploadSpeed(photo.uploadSpeed)}
                          </span>
                        </div>
                      )}
                      {photo.timeRemaining && (
                        <div className="flex items-center justify-center">
                          <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
                          <span aria-label={formatTimeRemaining(photo.timeRemaining)}>
                            {formatTimeRemaining(photo.timeRemaining)}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <Camera className="w-12 h-12 text-gray-400 mb-3" aria-hidden="true" />
                    <p className="text-sm font-medium text-gray-700">{PHOTO_LABELS[type]}</p>
                    <p className="text-xs text-gray-500 mt-1">{description}</p>
                    <p className="text-xs text-gray-400 mt-2">Click to upload</p>
                  </>
                )}
              </div>
            )}
          </label>
          
          {photo.error && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert" aria-live="assertive">
              <div className="flex items-center text-red-600 text-sm mb-2">
                <AlertCircle className="w-4 h-4 mr-1" aria-hidden="true" />
                {photo.error}
              </div>
              {photo.file && !photo.uploading && (
                <button
                  onClick={() => retryUpload(type)}
                  className="flex items-center text-xs text-blue-600 hover:text-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
                  aria-label={`Retry uploading ${type} view photo`}
                >
                  <RefreshCw className="w-3 h-3 mr-1" aria-hidden="true" />
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const allRequiredPhotosUploaded = photos.front.url; // only front view is required
  const anyPhotoUploading = Object.values(photos).some(p => p.uploading);
  const uploadedCount = Object.values(photos).filter(p => p.url).length;
  const totalPhotos = 3; // front, side, back
  const requiredPhotos = 1; // only front view is required
  const anyPhotoHasError = Object.values(photos).some(p => p.error);
  
  // Calculate overall upload progress
  const overallProgress = Object.values(photos).reduce((total, photo) => {
    if (photo.url) return total + 100;
    if (photo.uploading) return total + photo.progress;
    return total;
  }, 0) / totalPhotos;

  return (
    <div className="space-y-4" role="region" aria-labelledby="multi-photo-upload-heading">
      {/* Screen Reader Announcements */}
      {anyPhotoUploading && (
        <LoadingAnnouncement
          isLoading={anyPhotoUploading}
          loadingText={`Uploading ${category} photos`}
          progress={overallProgress}
        />
      )}
      
      {anyPhotoHasError && (
        <StatusAnnouncement
          status="Upload errors detected"
          details="Please check individual photo upload areas for specific errors"
          type="error"
        />
      )}

      {allRequiredPhotosUploaded && !anyPhotoUploading && (
        <StatusAnnouncement
          status="Required photos uploaded successfully"
          details={`All ${requiredPhotos} required photos are ready`}
          type="success"
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h3 id="multi-photo-upload-heading" className="text-2xl font-bold text-gray-900">
          Upload {category === 'user' ? 'Your Photos' : 'Garment Photos'}
        </h3>
        
        {/* Status indicator */}
        {anyPhotoUploading && (
          <div className="flex items-center text-blue-600 text-sm" aria-live="polite">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true" />
            <span aria-label={`Uploading photos, ${uploadedCount} of ${totalPhotos} completed`}>
              Uploading {uploadedCount}/{totalPhotos} photos...
            </span>
          </div>
        )}
        
        {allRequiredPhotosUploaded && !anyPhotoUploading && (
          <div className="flex items-center text-green-600 text-sm" aria-live="polite">
            <Check className="w-4 h-4 mr-1" aria-hidden="true" />
            <span aria-label={`All required photos uploaded successfully, ${requiredPhotos} out of ${requiredPhotos} completed`}>
              Required photos uploaded ({requiredPhotos}/{requiredPhotos})
            </span>
          </div>
        )}
        
        {anyPhotoHasError && !anyPhotoUploading && (
          <div className="flex items-center text-red-600 text-sm" role="alert">
            <AlertCircle className="w-4 h-4 mr-1" aria-hidden="true" />
            Upload issues detected
          </div>
        )}
      </div>
      
      {/* Overall progress bar */}
      {anyPhotoUploading && (
        <div className="mb-4" role="group" aria-labelledby="overall-progress-label">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span id="overall-progress-label">Overall Progress</span>
            <span aria-label={`${Math.round(overallProgress)} percent complete`}>{Math.round(overallProgress)}%</span>
          </div>
          <div 
            className="w-full bg-gray-200 rounded-full h-2" 
            role="progressbar" 
            aria-valuenow={Math.round(overallProgress)} 
            aria-valuemin={0} 
            aria-valuemax={100}
            aria-labelledby="overall-progress-label"
          >
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderPhotoUpload('front')}
        {visibleUploads > 1 && renderPhotoUpload('side')}
        {visibleUploads > 2 && renderPhotoUpload('back')}
      </div>

      {visibleUploads < 3 && (
        <div className="mt-4 text-center">
          <button 
            onClick={() => setVisibleUploads(v => v + 1)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            {visibleUploads === 1 ? 'Add Side View (Optional)' : 'Add Back View (Optional)'}
          </button>
        </div>
      )}

      <div className="mt-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
        <h4 className="text-base font-bold text-blue-900 mb-3">📸 Photo Guidelines:</h4>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Use good lighting and a plain background</li>
          <li>• {category === 'user' ? 'Wear fitted clothing for best results' : 'Lay garment flat or on a hanger'}</li>
          <li>• Ensure the entire {category === 'user' ? 'body' : 'garment'} is visible</li>
          <li>• File size must be under 10MB</li>
          <li>• Supported formats: JPG, PNG, HEIC, WebP</li>
        </ul>
      </div>

      {anyPhotoUploading && (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            Please wait for all uploads to complete before proceeding...
          </p>
        </div>
      )}
      
      {/* Continue button when uploads are complete */}
      {isComplete && !anyPhotoUploading && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleContinue}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-2xl hover:shadow-purple-500/25"
            aria-label="Continue to next step with uploaded photos"
          >
            Continue to Generation →
          </button>
        </div>
      )}
    </div>
  );
}
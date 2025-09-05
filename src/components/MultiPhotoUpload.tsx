'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Camera, Check, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { useSessionContext } from './SessionProvider';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

type PhotoType = 'front' | 'side' | 'back';
type PhotoCategory = 'user' | 'garment';

interface PhotoUpload {
  type: PhotoType;
  file: File | null;
  url: string | null;
  uploading: boolean;
  progress: number;
  error: string | null;
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

export function MultiPhotoUpload({ category, onUploadComplete }: MultiPhotoUploadProps) {
  const { sessionId, addPhotoToSession } = useSessionContext();
  const [photos, setPhotos] = useState<Record<PhotoType, PhotoUpload>>({
    front: { type: 'front', file: null, url: null, uploading: false, progress: 0, error: null },
    side: { type: 'side', file: null, url: null, uploading: false, progress: 0, error: null },
    back: { type: 'back', file: null, url: null, uploading: false, progress: 0, error: null }
  });

  const fileInputRefs = useRef<Record<PhotoType, HTMLInputElement | null>>({
    front: null,
    side: null,
    back: null
  });

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

  const uploadPhoto = async (type: PhotoType, file: File) => {
    if (!sessionId) {
      setPhotos(prev => ({
        ...prev,
        [type]: { ...prev[type], error: 'No session found. Please refresh the page.' }
      }));
      return;
    }

    // Update upload state
    setPhotos(prev => ({
      ...prev,
      [type]: { ...prev[type], uploading: true, progress: 0, error: null }
    }));

    try {
      // Create storage reference
      const timestamp = Date.now();
      const fileName = `sessions/${sessionId}/${category}/${type}_${timestamp}_${file.name}`;
      const storageRef = ref(storage, fileName);

      // Upload file with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setPhotos(prev => ({
            ...prev,
            [type]: { ...prev[type], progress }
          }));
        },
        (error) => {
          console.error('Upload error:', error);
          setPhotos(prev => ({
            ...prev,
            [type]: { ...prev[type], uploading: false, error: 'Upload failed. Please try again.' }
          }));
        },
        async () => {
          // Upload completed successfully
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Add photo to session
          const success = await addPhotoToSession(downloadURL, category, type);
          
          if (success) {
            setPhotos(prev => ({
              ...prev,
              [type]: { ...prev[type], url: downloadURL, uploading: false, progress: 100 }
            }));

            // Check if all required photos are uploaded
            checkUploadComplete();
          } else {
            setPhotos(prev => ({
              ...prev,
              [type]: { ...prev[type], uploading: false, error: 'Failed to save photo to session.' }
            }));
          }
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      setPhotos(prev => ({
        ...prev,
        [type]: { ...prev[type], uploading: false, error: 'Upload failed. Please try again.' }
      }));
    }
  };

  const checkUploadComplete = () => {
    const frontUrl = photos.front.url;
    const sideUrl = photos.side.url;
    
    // Front and side are required, back is optional
    if (frontUrl && sideUrl && onUploadComplete) {
      onUploadComplete({
        front: frontUrl,
        side: sideUrl,
        back: photos.back.url || ''
      });
    }
  };

  const removePhoto = (type: PhotoType) => {
    setPhotos(prev => ({
      ...prev,
      [type]: { type, file: null, url: null, uploading: false, progress: 0, error: null }
    }));
    
    // Reset file input
    if (fileInputRefs.current[type]) {
      fileInputRefs.current[type]!.value = '';
    }
  };

  const renderPhotoUpload = (type: PhotoType) => {
    const photo = photos[type];
    const isOptional = type === 'back';
    const description = PHOTO_DESCRIPTIONS[category][type];

    return (
      <div key={type} className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {PHOTO_LABELS[type]}
          {isOptional && <span className="text-gray-400 ml-1">(Optional)</span>}
        </label>
        
        <div className="relative">
          <input
            ref={el => fileInputRefs.current[type] = el}
            type="file"
            accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
            onChange={(e) => handleFileSelect(type, e)}
            className="hidden"
            id={`photo-${type}`}
            disabled={photo.uploading}
          />
          
          <label
            htmlFor={`photo-${type}`}
            className={`
              relative block w-full aspect-[3/4] border-2 border-dashed rounded-lg
              cursor-pointer transition-all overflow-hidden
              ${photo.url ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}
              ${photo.uploading ? 'cursor-not-allowed opacity-50' : ''}
              ${photo.error ? 'border-red-500 bg-red-50' : ''}
            `}
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
                  <div className="bg-green-500 text-white p-2 rounded-full">
                    <Check className="w-4 h-4" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      removePhoto(type);
                    }}
                    className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4">
                {photo.uploading ? (
                  <>
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm text-gray-600">Uploading... {Math.round(photo.progress)}%</p>
                    <div className="w-full max-w-xs mt-2 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${photo.progress}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <Camera className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-700">{PHOTO_LABELS[type]}</p>
                    <p className="text-xs text-gray-500 mt-1">{description}</p>
                    <p className="text-xs text-gray-400 mt-2">Click to upload</p>
                  </>
                )}
              </div>
            )}
          </label>
          
          {photo.error && (
            <div className="mt-2 flex items-center text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 mr-1" />
              {photo.error}
            </div>
          )}
        </div>
      </div>
    );
  };

  const allRequiredPhotosUploaded = photos.front.url && photos.side.url;
  const anyPhotoUploading = Object.values(photos).some(p => p.uploading);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Upload {category === 'user' ? 'Your Photos' : 'Garment Photos'}
        </h3>
        {allRequiredPhotosUploaded && (
          <div className="flex items-center text-green-600 text-sm">
            <Check className="w-4 h-4 mr-1" />
            Required photos uploaded
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderPhotoUpload('front')}
        {renderPhotoUpload('side')}
        {renderPhotoUpload('back')}
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Photo Guidelines:</h4>
        <ul className="text-xs text-blue-700 space-y-1">
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
    </div>
  );
}
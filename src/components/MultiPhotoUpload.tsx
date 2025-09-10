'use client';

import React, { useState } from 'react';
import { Upload, X, Camera, Check, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { useSessionContext } from './SessionProvider';
// Firebase imports removed - will be replaced with Vercel Blob storage in Task 1.5
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
  const { sessionId } = useSessionContext();
  const [photos, setPhotos] = useState<Record<PhotoType, PhotoUpload>>({
    front: { type: 'front', file: null, url: null, uploading: false, progress: 0, error: null },
    side: { type: 'side', file: null, url: null, uploading: false, progress: 0, error: null },
    back: { type: 'back', file: null, url: null, uploading: false, progress: 0, error: null }
  });

  const handleFileSelect = async (type: PhotoType, file: File) => {
    // TODO: Implement file upload with Vercel Blob in Task 1.5
    // For now, use data URL as placeholder
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPhotos(prev => ({
        ...prev,
        [type]: { ...prev[type], file, url: dataUrl, uploading: false, progress: 100 }
      }));
      
      // Check if all required photos are uploaded
      const allPhotos = { ...photos, [type]: { ...photos[type], url: dataUrl } };
      if (allPhotos.front.url && allPhotos.side.url && onUploadComplete) {
        onUploadComplete({
          front: allPhotos.front.url,
          side: allPhotos.side.url,
          back: allPhotos.back.url || ''
        });
      }
    };
    
    reader.readAsDataURL(file);
  };

  const removePhoto = (type: PhotoType) => {
    setPhotos(prev => ({
      ...prev,
      [type]: { type, file: null, url: null, uploading: false, progress: 0, error: null }
    }));
  };

  return (
    <div className="space-y-6">
      <Instructions>
        Upload {category === 'user' ? 'your photos' : 'garment photos'} in three views: front, side, and optionally back.
      </Instructions>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['front', 'side', 'back'] as PhotoType[]).map((type) => (
          <div key={type} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {PHOTO_LABELS[type]}
            </label>
            <p className="text-xs text-gray-500">
              {PHOTO_DESCRIPTIONS[category][type]}
            </p>
            
            <div className="relative aspect-[3/4] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
              {photos[type].url ? (
                <>
                  <Image
                    src={photos[type].url!}
                    alt={`${category} ${type} view`}
                    fill
                    className="object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removePhoto(type)}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                    aria-label={`Remove ${type} photo`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-green-500 text-white p-1 rounded-full">
                    <Check className="w-4 h-4" />
                  </div>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center h-full cursor-pointer">
                  <Camera className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Click to upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(type, file);
                    }}
                  />
                </label>
              )}
              
              {photos[type].uploading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-sm text-gray-600">{Math.round(photos[type].progress)}%</p>
                  </div>
                </div>
              )}
              
              {photos[type].error && (
                <div className="absolute bottom-2 left-2 right-2 bg-red-50 text-red-600 p-2 rounded text-xs flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                  {photos[type].error}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <StatusAnnouncement>
        {Object.values(photos).filter(p => p.url).length} of 3 photos uploaded
      </StatusAnnouncement>
    </div>
  );
}
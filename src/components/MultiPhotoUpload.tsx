'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Camera, Check, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { useSessionContext } from './SessionProvider';

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

  const handleFileSelect = (type: PhotoType, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotos(prev => ({
      ...prev,
      [type]: { ...prev[type], file, url: URL.createObjectURL(file), error: null }
    }));
  };

  const removePhoto = (type: PhotoType) => {
    setPhotos(prev => ({
      ...prev,
      [type]: { ...prev[type], file: null, url: null, error: null }
    }));
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
          />
          
          <label
            htmlFor={`photo-${type}`}
            className={`
              relative block w-full aspect-[3/4] border-2 border-dashed rounded-lg
              cursor-pointer transition-all overflow-hidden
              ${photo.url ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}
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
                <Camera className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-700">{PHOTO_LABELS[type]}</p>
                <p className="text-xs text-gray-500 mt-1">{description}</p>
                <p className="text-xs text-gray-400 mt-2">Click to upload</p>
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderPhotoUpload('front')}
        {renderPhotoUpload('side')}
        {renderPhotoUpload('back')}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { MultiPhotoUpload } from './MultiPhotoUpload';
import { ChevronRight, CheckCircle, User, Shirt } from 'lucide-react';

interface PhotoData {
  userPhotos: {
    front: string;
    side: string;
    back: string;
  };
  garmentPhotos: {
    front: string;
    side: string;
    back: string;
  };
}

interface PhotoUploadInterfaceProps {
  onComplete?: (data: PhotoData) => void;
}

export function PhotoUploadInterface({ onComplete }: PhotoUploadInterfaceProps) {
  const [step, setStep] = useState<'user' | 'garment' | 'complete'>('user');
  const [userPhotos, setUserPhotos] = useState<Record<string, string> | null>(null);
  const [garmentPhotos, setGarmentPhotos] = useState<Record<string, string> | null>(null);

  const handleUserPhotosComplete = (photos: Record<string, string>) => {
    setUserPhotos(photos);
    // Automatically move to garment upload step
    setTimeout(() => setStep('garment'), 500);
  };

  const handleGarmentPhotosComplete = (photos: Record<string, string>) => {
    setGarmentPhotos(photos);
    setStep('complete');
    
    // Call the completion callback
    if (onComplete && userPhotos) {
      onComplete({
        userPhotos: userPhotos as any,
        garmentPhotos: photos as any
      });
    }
  };

  const handleReset = () => {
    setStep('user');
    setUserPhotos(null);
    setGarmentPhotos(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full
              ${step === 'user' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}
            `}>
              {userPhotos ? <CheckCircle className="w-6 h-6" /> : <User className="w-6 h-6" />}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Step 1</p>
              <p className="text-xs text-gray-500">Your Photos</p>
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-gray-400" />

          <div className="flex items-center">
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full
              ${step === 'garment' ? 'bg-blue-600 text-white' : 
                step === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}
            `}>
              {garmentPhotos ? <CheckCircle className="w-6 h-6" /> : <Shirt className="w-6 h-6" />}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Step 2</p>
              <p className="text-xs text-gray-500">Garment Photos</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
            style={{ width: step === 'user' ? '50%' : '100%' }}
          />
        </div>
      </div>

      {/* Upload Steps */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {step === 'user' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Photos</h2>
              <p className="text-gray-600">
                Please upload photos of yourself from different angles. This helps our AI create
                more accurate outfit visualizations.
              </p>
            </div>
            
            <MultiPhotoUpload 
              category="user" 
              onUploadComplete={handleUserPhotosComplete}
            />
          </div>
        )}

        {step === 'garment' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Garment Photos</h2>
              <p className="text-gray-600">
                Now upload photos of the garment you want to try on. Multiple angles help
                create better results.
              </p>
            </div>
            
            <MultiPhotoUpload 
              category="garment" 
              onUploadComplete={handleGarmentPhotosComplete}
            />

            <button
              onClick={() => setStep('user')}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to previous step
            </button>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All Photos Uploaded!</h2>
            <p className="text-gray-600 mb-6">
              Your photos have been successfully uploaded. You can now generate your outfit visualization.
            </p>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={handleReset}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Upload Different Photos
              </button>
              
              <button
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Generate Outfit →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { MultiPhotoUpload } from './MultiPhotoUpload';
import { ChevronRight, CheckCircle, User, Shirt, Sparkles, Loader2 } from 'lucide-react';
import { generateOutfitPose } from '@/services/generationService';
import { useSessionContext } from './SessionProvider';

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
  existingUserPhotos?: {
    front: string;
    side: string;
    back: string;
  };
}

export function PhotoUploadInterface({ onComplete, existingUserPhotos }: PhotoUploadInterfaceProps) {
  const { sessionId } = useSessionContext();
  const [step, setStep] = useState<'user' | 'garment' | 'complete'>(
    existingUserPhotos ? 'garment' : 'user'
  );
  const [userPhotos, setUserPhotos] = useState<Record<string, string> | null>(
    existingUserPhotos || null
  );
  const [garmentPhotos, setGarmentPhotos] = useState<Record<string, string> | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  
  // Generation state management
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<{
    imageUrl: string;
    processingTime: number;
    confidence: number;
    description: string;
  } | null>(null);

  const handleUserPhotosComplete = (photos: Record<string, string>) => {
    setUserPhotos(photos);
    // Automatically move to garment upload step
    setTimeout(() => setStep('garment'), 500);
  };

  const handleGarmentPhotosComplete = (photos: Record<string, string>) => {
    setGarmentPhotos(photos);
    setStep('complete');
    setShowSuccessAnimation(true);
    
    // Call the completion callback
    if (onComplete && userPhotos) {
      onComplete({
        userPhotos: userPhotos as any,
        garmentPhotos: photos as any
      });
    }
  };

  // Reset success animation after a delay
  useEffect(() => {
    if (showSuccessAnimation) {
      const timer = setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessAnimation]);

  const handleReset = () => {
    setStep('user');
    setUserPhotos(null);
    setGarmentPhotos(null);
    setGeneratedImageUrl(null);
    setGenerationResult(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!sessionId || !garmentPhotos?.front) {
      setError('Missing required data for generation');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await generateOutfitPose(sessionId, garmentPhotos.front);
      setGenerationResult(result);
      setGeneratedImageUrl(result.imageUrl);
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate outfit. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
              {(userPhotos || existingUserPhotos) ? <CheckCircle className="w-6 h-6" /> : <User className="w-6 h-6" />}
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
            style={{ 
              width: step === 'user' && !existingUserPhotos ? '50%' : '100%' 
            }}
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
          <div className="text-center py-12 relative">
            {/* Success animation */}
            {showSuccessAnimation && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="animate-pulse">
                  <Sparkles className="w-32 h-32 text-yellow-400 animate-spin" />
                </div>
              </div>
            )}
            
            <div className={`transition-all duration-500 ${showSuccessAnimation ? 'scale-110' : 'scale-100'}`}>
              <CheckCircle className={`w-16 h-16 mx-auto mb-4 transition-colors duration-500 ${showSuccessAnimation ? 'text-yellow-500' : 'text-green-600'}`} />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">All Photos Uploaded!</h2>
              <p className="text-gray-600 mb-6">
                Your photos have been successfully uploaded. You can now generate your outfit visualization.
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Generated Result Display */}
            {generatedImageUrl && generationResult && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-green-900">Generated Result</h3>
                <div className="space-y-4">
                  <img
                    src={generatedImageUrl}
                    alt="Generated outfit result"
                    className="max-w-md mx-auto rounded-lg shadow-lg"
                  />
                  <div className="text-sm text-green-700 space-y-1">
                    <p>Processing time: {generationResult.processingTime.toFixed(1)} seconds</p>
                    <p>Confidence: {Math.round(generationResult.confidence * 100)}%</p>
                    <p className="text-xs">{generationResult.description}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-center gap-4">
              <button
                onClick={handleReset}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Upload Different Photos
              </button>
              
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className={`px-6 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Generating...' : 'Generate Outfit →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
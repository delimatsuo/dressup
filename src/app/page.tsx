'use client';

import React, { useState, useEffect } from 'react';
import { PhotoUploadInterface } from '../components/PhotoUploadInterface';
import GarmentGallery, { Garment } from '../components/GarmentGallery';
import ResultsDisplay, { Result } from '../components/ResultsDisplay';
import FeedbackSection from '../components/FeedbackSection';
import { 
  initializeFirebase,
  getGarments, 
  processImage, 
  submitFeedback 
} from '../lib/firebase';

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

export default function HomePage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [photoData, setPhotoData] = useState<PhotoData | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'generate' | 'results'>('upload');

  // Initialize session and Firebase
  useEffect(() => {
    // Initialize Firebase
    try {
      if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        initializeFirebase();
      }
    } catch {
      console.log('Firebase not configured yet');
    }

    // Generate session ID
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    setSessionId(newSessionId);
    
    // Store in sessionStorage for tracking
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('sessionId', newSessionId);
    }
  }, []);

  const handlePhotoUploadComplete = (data: PhotoData) => {
    setPhotoData(data);
    setStep('generate');
  };

  const handleGenerateOutfit = async () => {
    if (!photoData) return;

    setProcessing(true);
    setError(null);
    setStep('results');

    try {
      // Use the front view photos for generation
      const processedResult = await processImage(
        photoData.userPhotos.front,
        'garment-1', // We'll need to pass actual garment ID
        sessionId
      );

      const newResult: Result = {
        id: `result-${Date.now()}`,
        originalImageUrl: photoData.userPhotos.front,
        processedImageUrl: processedResult.processedImageUrl,
        garmentName: 'Selected Garment',
        processingTime: processedResult.processingTime,
        timestamp: new Date().toISOString(),
      };

      setResult(newResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
      setStep('generate');
    } finally {
      setProcessing(false);
    }
  };

  const handleFeedbackSubmit = async (feedback: { rating: number; comment: string }) => {
    try {
      await submitFeedback({
        ...feedback,
        sessionId,
        resultId: result?.id || '',
      });
      return true;
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      return false;
    }
  };

  const handleTryAnother = () => {
    setResult(null);
    setPhotoData(null);
    setError(null);
    setStep('upload');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 text-gray-900">DressUp</h1>
        <p className="text-xl text-gray-600">
          Transform your look with AI-powered virtual outfit try-on
        </p>
      </header>

      <div className="mb-8 bg-blue-50 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
        <ol className="grid md:grid-cols-3 gap-4">
          <li className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
              1
            </span>
            <div>
              <h3 className="font-semibold">Upload Your Photos</h3>
              <p className="text-gray-600">Upload photos of yourself and the garment (front, side views)</p>
            </div>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
              2
            </span>
            <div>
              <h3 className="font-semibold">Generate Poses</h3>
              <p className="text-gray-600">Our AI creates multiple outfit poses for you</p>
            </div>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
              3
            </span>
            <div>
              <h3 className="font-semibold">See Your Results</h3>
              <p className="text-gray-600">View realistic outfit visualizations</p>
            </div>
          </li>
        </ol>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {step === 'upload' && (
        <PhotoUploadInterface onComplete={handlePhotoUploadComplete} />
      )}

      {step === 'generate' && photoData && (
        <div className="max-w-2xl mx-auto text-center py-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Generate!</h2>
          <p className="text-gray-600 mb-8">
            All photos uploaded successfully. Click below to generate your virtual outfit poses.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Your Photo</h3>
              <img 
                src={photoData.userPhotos.front} 
                alt="Your photo"
                className="w-full aspect-[3/4] object-cover rounded-lg border"
              />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Garment</h3>
              <img 
                src={photoData.garmentPhotos.front} 
                alt="Garment"
                className="w-full aspect-[3/4] object-cover rounded-lg border"
              />
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => setStep('upload')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Back to Upload
            </button>
            <button
              onClick={handleGenerateOutfit}
              disabled={processing}
              className="px-8 py-3 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {processing ? 'Generating...' : 'Generate My Poses!'}
            </button>
          </div>
        </div>
      )}

      {step === 'results' && (
        <div className="mb-8">
          <ResultsDisplay
            result={result}
            loading={processing}
            error={error}
            showComparison={true}
            onTryAnother={handleTryAnother}
            onDownload={(result) => {
              // Implement download functionality
              console.log('Download:', result);
            }}
            onShare={(result) => {
              // Implement share functionality
              console.log('Share:', result);
            }}
          />
        </div>
      )}

      <FeedbackSection
        onSubmit={handleFeedbackSubmit}
        onQuickFeedback={(type) => {
          console.log('Quick feedback:', type);
        }}
      />
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { PhotoUploadInterface } from '../components/PhotoUploadInterface';
import GarmentGallery, { Garment } from '../components/GarmentGallery';
import ResultsDisplay, { Result } from '../components/ResultsDisplay';
import FeedbackSection from '../components/FeedbackSection';
import { WelcomeConsentModal } from '../components/WelcomeConsentModal';
import { useConsent } from '../hooks/useConsent';
import { useKeyboardDetection } from '../hooks/useFocusTrap';
import { 
  initializeFirebase,
  getGarments, 
  processImage, 
  processMultiPhotoOutfit,
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
  const { hasConsented, isLoading: consentLoading, shouldShowConsentModal, grantConsent } = useConsent();
  
  // Initialize keyboard detection at the application level
  useKeyboardDetection();
  
  const [sessionId, setSessionId] = useState<string>('');
  const [photoData, setPhotoData] = useState<PhotoData | null>(null);
  const [savedUserPhotos, setSavedUserPhotos] = useState<PhotoData['userPhotos'] | null>(null);
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
    setSavedUserPhotos(data.userPhotos); // Save user photos for "Try Another" functionality
    setStep('generate');
  };

  const handleGenerateOutfit = async () => {
    if (!photoData) return;

    setProcessing(true);
    setError(null);
    setStep('results');

    try {
      // Use the new multi-photo processing function
      const processedResult = await processMultiPhotoOutfit(
        photoData.userPhotos,
        photoData.garmentPhotos,
        sessionId
      );

      const newResult: Result = {
        id: `result-${Date.now()}`,
        poses: processedResult.poses,
        garmentName: 'Your Custom Outfit',
        processingTime: processedResult.processingTime,
        timestamp: new Date().toISOString(),
        description: processedResult.description,
      };

      setResult(newResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process outfit images');
      setStep('generate');
    } finally {
      setProcessing(false);
    }
  };

  const handleFeedbackSubmit = async (feedback: { 
    rating: number; 
    comment: string; 
    realismRating: number; 
    helpfulnessRating: number; 
  }) => {
    try {
      await submitFeedback({
        rating: feedback.rating,
        comment: feedback.comment,
        realismRating: feedback.realismRating,
        helpfulnessRating: feedback.helpfulnessRating,
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
    setError(null);
    
    // Keep user photos and go back to upload step for new garment selection
    setPhotoData(null); // Reset photoData so PhotoUploadInterface starts fresh
    setStep('upload');   // Go back to upload step
  };

  const handleStartOver = () => {
    setResult(null);
    setPhotoData(null);
    setSavedUserPhotos(null);
    setError(null);
    setStep('upload');
  };

  const handleConsent = () => {
    grantConsent();
  };

  // Show loading spinner while checking consent
  if (consentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" role="status" aria-label="Loading"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  // Show consent modal if user hasn't consented
  if (!hasConsented && typeof window !== 'undefined') {
    return (
      <>
        <WelcomeConsentModal
          isOpen={shouldShowConsentModal}
          onConsent={handleConsent}
          onClose={() => {
            // For now, just keep the modal open since consent is required
            // In a production app, you might redirect or show a different message
          }}
        />
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
          <div className="text-center">
            <h1 className="text-responsive-3xl font-bold text-gray-900 mb-4">DressUp AI</h1>
            <p className="text-responsive-base text-gray-700">Please review and accept our terms to continue.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="mobile-container py-4 sm:py-8 max-w-7xl">
      {/* Skip to main content link for keyboard navigation */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        Skip to main content
      </a>
      
      <header className="text-center mb-6 sm:mb-12" role="banner">
        <h1 className="text-responsive-3xl font-bold mb-2 sm:mb-4 text-gray-900">DressUp</h1>
        <p className="text-responsive-lg text-gray-700">
          Transform your look with AI-powered virtual outfit try-on
        </p>
      </header>

      <section className="mb-6 sm:mb-8 bg-blue-50 rounded-lg p-4 sm:p-6" aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="text-responsive-2xl font-semibold mb-4">How It Works</h2>
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="list">
          <li className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3" aria-hidden="true">
              1
            </span>
            <div>
              <h3 className="font-semibold text-responsive-base">Upload Your Photos</h3>
              <p className="text-responsive-sm text-gray-700">Upload photos of yourself and the garment (front, side views)</p>
            </div>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3" aria-hidden="true">
              2
            </span>
            <div>
              <h3 className="font-semibold text-responsive-base">Generate Poses</h3>
              <p className="text-responsive-sm text-gray-700">Our AI creates multiple outfit poses for you</p>
            </div>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3" aria-hidden="true">
              3
            </span>
            <div>
              <h3 className="font-semibold text-responsive-base">See Your Results</h3>
              <p className="text-responsive-sm text-gray-700">View realistic outfit visualizations</p>
            </div>
          </li>
        </ol>
      </section>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg text-red-800" role="alert" aria-live="assertive">
          <h2 className="sr-only">Error</h2>
          <strong className="font-medium">Error:</strong> {error}
        </div>
      )}

      <main id="main-content" role="main">
        {step === 'upload' && (
          <section aria-labelledby="upload-section">
            <h2 id="upload-section" className="sr-only">Photo Upload</h2>
            <PhotoUploadInterface 
              onComplete={handlePhotoUploadComplete}
              existingUserPhotos={savedUserPhotos}
            />
          </section>
        )}

        {step === 'generate' && photoData && (
          <section className="max-w-2xl mx-auto text-center py-6 sm:py-12" aria-labelledby="generate-section">
            <h2 id="generate-section" className="text-responsive-2xl font-bold text-gray-900 mb-2 sm:mb-4">Ready to Generate!</h2>
            <p className="text-responsive-base text-gray-700 mb-6 sm:mb-8">
              All photos uploaded successfully. Click below to generate your virtual outfit poses.
            </p>
            
            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6 sm:mb-8">
              <figure>
                <h3 className="font-medium text-responsive-base text-gray-900 mb-1 sm:mb-2">Your Photo</h3>
                <img 
                  src={photoData.userPhotos.front} 
                  alt="Front view photo of user for outfit try-on"
                  className="w-full aspect-[3/4] object-cover rounded-lg border"
                />
              </figure>
              <figure>
                <h3 className="font-medium text-responsive-base text-gray-900 mb-1 sm:mb-2">Garment</h3>
                <img 
                  src={photoData.garmentPhotos.front} 
                  alt="Front view of garment to be tried on"
                  className="w-full aspect-[3/4] object-cover rounded-lg border"
                />
              </figure>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <button
                onClick={() => setStep('upload')}
                className="touch-button bg-gray-100 text-gray-700 hover:bg-gray-200 w-full sm:w-auto"
                aria-describedby="back-to-upload-description"
              >
                ← Back to Upload
              </button>
              <span id="back-to-upload-description" className="sr-only">Return to photo upload step to select different photos</span>
              
              <button
                onClick={handleGenerateOutfit}
                disabled={processing}
                className="touch-button bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 w-full sm:w-auto"
                aria-describedby="generate-description"
              >
                {processing ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true"></span>
                    Generating...
                  </>
                ) : (
                  'Generate My Poses!'
                )}
              </button>
              <span id="generate-description" className="sr-only">Start AI processing to generate outfit visualization</span>
            </div>
          </section>
        )}

        {step === 'results' && (
          <section className="mb-8" aria-labelledby="results-section">
            <h2 id="results-section" className="sr-only">Generated Results</h2>
            <div aria-live="polite" aria-atomic="true">
              <ResultsDisplay
                result={result}
                loading={processing}
                error={error}
                showComparison={true}
                onTryAnother={handleTryAnother}
                onStartOver={handleStartOver}
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
          </section>
        )}
      </main>
      
      <aside aria-labelledby="feedback-section">
        <h2 id="feedback-section" className="sr-only">User Feedback</h2>
        <FeedbackSection
          onSubmit={handleFeedbackSubmit}
          onQuickFeedback={(type) => {
            console.log('Quick feedback:', type);
          }}
        />
      </aside>
    </div>
  );
}
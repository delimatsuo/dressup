'use client';

import React, { useState, useEffect } from 'react';
import UploadArea from '../components/UploadArea';
import GarmentGallery, { Garment } from '../components/GarmentGallery';
import ResultsDisplay, { Result } from '../components/ResultsDisplay';
import FeedbackSection from '../components/FeedbackSection';
import { 
  initializeFirebase,
  getGarments, 
  processImage, 
  submitFeedback 
} from '../lib/firebase';

export default function HomePage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [garmentsLoading, setGarmentsLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize session and Firebase
  useEffect(() => {
    // Initialize Firebase (will use mock data until credentials are available)
    try {
      // Skip initialization if credentials are not available
      if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        initializeFirebase();
      }
    } catch {
      console.log('Firebase not configured yet - using mock data');
    }

    // Generate session ID
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    setSessionId(newSessionId);
    
    // Store in sessionStorage for tracking
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('sessionId', newSessionId);
    }

    // Load garments
    loadGarments();
  }, []);

  const loadGarments = async () => {
    setGarmentsLoading(true);
    try {
      const loadedGarments = await getGarments();
      setGarments(loadedGarments);
    } catch (error) {
      setError('Failed to load garments');
      console.error(error);
    } finally {
      setGarmentsLoading(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<void> => {
    setError(null);
    try {
      // For now, create a local URL for the image
      // In production, this would upload to Firebase Storage
      const localUrl = URL.createObjectURL(file);
      setUploadedImage(localUrl);
      
      // Uncomment when Firebase is configured:
      // const imageUrl = await uploadImage(file, sessionId);
      // setUploadedImage(imageUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleGenerateLook = async () => {
    if (!uploadedImage || !selectedGarment) return;

    setProcessing(true);
    setError(null);

    try {
      const processedResult = await processImage(
        uploadedImage,
        selectedGarment.id,
        sessionId
      );

      const newResult: Result = {
        id: `result-${Date.now()}`,
        originalImageUrl: uploadedImage,
        processedImageUrl: processedResult.processedImageUrl,
        garmentName: selectedGarment.name,
        processingTime: processedResult.processingTime,
        timestamp: new Date().toISOString(),
      };

      setResult(newResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
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
    setUploadedImage(null);
    setSelectedGarment(null);
    setError(null);
  };

  const canProcess = uploadedImage && selectedGarment && !processing;

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
              <h3 className="font-semibold">Upload Your Photo</h3>
              <p className="text-gray-600">Take or upload a clear photo of yourself</p>
            </div>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
              2
            </span>
            <div>
              <h3 className="font-semibold">Select an Outfit</h3>
              <p className="text-gray-600">Browse and choose from our collection</p>
            </div>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
              3
            </span>
            <div>
              <h3 className="font-semibold">See Your New Look</h3>
              <p className="text-gray-600">AI generates your photo with the outfit</p>
            </div>
          </li>
        </ol>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <UploadArea onUpload={handleImageUpload} />
        
        <GarmentGallery
          garments={garments}
          loading={garmentsLoading}
          selectedId={selectedGarment?.id}
          onSelect={setSelectedGarment}
        />
      </div>

      {canProcess && (
        <div className="text-center mb-8">
          <button
            onClick={handleGenerateLook}
            className="px-8 py-3 bg-green-500 text-white text-lg font-semibold rounded-lg hover:bg-green-600 transition-colors"
          >
            Generate My New Look!
          </button>
        </div>
      )}

      {(processing || result) && (
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
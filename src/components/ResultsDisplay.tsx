'use client';

import React, { useState, useEffect } from 'react';
import { MobileResultsGallery } from './MobileResultsGallery';
import { useMobileDetection } from '@/hooks/useIsMobile';
import { LoadingAnnouncement, StatusAnnouncement, Instructions } from './ScreenReaderOnly';

export interface Pose {
  name: string;
  originalImageUrl: string;
  processedImageUrl: string;
  confidence: number;
}

export interface Result {
  id: string;
  poses: Pose[];
  garmentName: string;
  processingTime: number;
  timestamp: string;
  description?: string;
  // Legacy support for single image results
  originalImageUrl?: string;
  processedImageUrl?: string;
}

interface ResultsDisplayProps {
  result?: Result;
  loading?: boolean;
  error?: string;
  showComparison?: boolean;
  onDownload?: (result: Result) => void;
  onShare?: (result: Result) => void;
  onTryAnother?: () => void;
  onStartOver?: () => void;
  onRegenerateWithInstructions?: (instructions: string) => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  result,
  loading = false,
  error,
  showComparison = false,
  onDownload,
  onShare,
  onTryAnother,
  onStartOver,
  onRegenerateWithInstructions,
}) => {
  const { isMobileOrTouch } = useMobileDetection();
  const [showRegenerateInstructions, setShowRegenerateInstructions] = useState(false);
  const [instructionsText, setInstructionsText] = useState('');

  const onRegenerateWithInstructionsToggle = () => {
    setShowRegenerateInstructions(prev => !prev);
    setInstructionsText(''); // Clear text when toggling
  };

  const handleSubmitInstructions = () => {
    if (onRegenerateWithInstructions) {
      onRegenerateWithInstructions(instructionsText);
      setShowRegenerateInstructions(false);
      setInstructionsText('');
    }
  };

  if (loading) {
    return (
      <div className="results-display mobile-card" role="region" aria-labelledby="loading-heading" aria-live="polite">
        <LoadingAnnouncement
          isLoading={loading}
          loadingText="Processing your new outfit. This may take up to a minute to complete."
        />
        <div className="flex flex-col items-center justify-center h-64">
          <div 
            data-testid="loading-spinner" 
            className="animate-spin rounded-full mobile-spinner border-b-2 border-blue-500 mb-4"
            role="status"
            aria-hidden="true"
          />
          <h3 id="loading-heading" className="text-responsive-base text-gray-700">Processing your new outfit...</h3>
          <p className="text-responsive-sm text-gray-600 mt-2" aria-live="polite">
            Please wait while our AI generates your outfit visualization
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-display mobile-card" role="region" aria-labelledby="error-heading">
        <StatusAnnouncement
          status="Error occurred during outfit generation"
          details={error}
          type="error"
        />
        <div className="text-center">
          <h3 id="error-heading" className="text-responsive-lg font-semibold text-red-700 mb-2">Generation Error</h3>
          <p className="text-responsive-base text-red-700 mb-4" role="alert">{error}</p>
          <button
            onClick={onTryAnother}
            className="touch-button bg-blue-500 text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
            aria-label="Try generating outfit again"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="results-display mobile-card" role="region" aria-labelledby="no-result-heading">
        <div className="text-center text-gray-500">
          <h3 id="no-result-heading" className="text-responsive-lg font-medium text-gray-700 mb-2">No Result Available</h3>
          <p className="text-responsive-base text-gray-700">No result to display</p>
        </div>
      </div>
    );
  }

  // Handle both multi-pose and legacy single image results
  const poses = result.poses && result.poses.length > 0 ? result.poses : 
    (result.originalImageUrl && result.processedImageUrl ? [{
      name: 'Generated Look',
      originalImageUrl: result.originalImageUrl,
      processedImageUrl: result.processedImageUrl,
      confidence: 0.95
    }] : []);

  // Prepare gallery images for mobile view
  const galleryImages = poses.map((pose, index) => ({
    id: `pose-${index}`,
    url: pose.processedImageUrl,
    title: pose.name,
    description: `${Math.round(pose.confidence * 100)}% confidence`
  }));

  return (
    <div className="results-display mobile-card" role="main" aria-labelledby="results-heading">
      {/* Success Announcement */}
      <StatusAnnouncement
        status="Outfit generation completed successfully"
        details={`Generated ${poses.length} pose${poses.length > 1 ? 's' : ''} in ${result.processingTime.toFixed(1)} seconds`}
        type="success"
      />

      <Instructions id="results-instructions">
        <p>Your AI-generated outfit visualization is ready. You can view, download, or share the results.</p>
        <p>Use the gallery controls to view different poses and angles of your outfit.</p>
      </Instructions>

      <h2 id="results-heading" className="text-responsive-2xl font-bold mb-4 text-center sm:text-left">Your New Look!</h2>

      {result.description && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg" role="region" aria-labelledby="description-heading">
          <h3 id="description-heading" className="sr-only">Generation Description</h3>
          <p className="text-blue-900 text-sm">{result.description}</p>
        </div>
      )}

      {poses.length > 0 && (
        <div className="mb-6">
          {isMobileOrTouch ? (
            <>
              <h3 className="text-responsive-lg font-semibold mb-4" id="mobile-gallery-heading">Generated Poses</h3>
              <MobileResultsGallery
                images={galleryImages}
                onDownload={(image) => {
                  const pose = poses.find((p, i) => `pose-${i}` === image.id);
                  if (pose && onDownload && result) {
                    onDownload(result);
                  }
                }}
                onShare={(image) => {
                  const pose = poses.find((p, i) => `pose-${i}` === image.id);
                  if (pose && onShare && result) {
                    onShare(result);
                  }
                }}
              />
              {showComparison && poses.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg" role="region" aria-labelledby="comparison-heading">
                  <h4 id="comparison-heading" className="text-responsive-base font-semibold mb-3">Original Photos</h4>
                  <div className="grid grid-cols-3 gap-2" role="group" aria-label="Original photos before outfit application">
                    {poses.slice(0, 3).map((pose, index) => (
                      <img
                        key={index}
                        src={pose.originalImageUrl}
                        alt={`Original photo ${index + 1}: ${pose.name} pose before outfit application`}
                        className="w-full aspect-square object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-responsive-lg font-semibold mb-4" id="desktop-gallery-heading">Generated Poses</h3>
              <div className="grid md:grid-cols-2 gap-6" role="group" aria-labelledby="desktop-gallery-heading">
                {poses.map((pose, index) => (
                  <div key={index}>
                    <img
                      src={pose.processedImageUrl}
                      alt={`AI-generated ${pose.name} pose`}
                      className="w-full rounded-lg shadow-lg"
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="text-center space-y-4" role="region" aria-labelledby="results-actions-heading">
        <h3 id="results-actions-heading" className="sr-only">Result Actions</h3>
        <p className="text-responsive-sm text-gray-700" role="status">
          Processed in <span aria-label="{result.processingTime.toFixed(1)} seconds">{result.processingTime.toFixed(1)} seconds</span>
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4" role="group" aria-labelledby="results-actions-heading">
          {!isMobileOrTouch && (
            <>
              <button
                onClick={() => onDownload?.(result)}
                className="touch-button bg-green-500 text-white hover:bg-green-600 w-full sm:w-auto focus:ring-2 focus:ring-green-300"
                aria-label="Download all generated images"
              >
                Download All
              </button>
              
              
            </>
          )}

          <button
            onClick={onTryAnother}
            className="touch-button bg-blue-500 text-white hover:bg-blue-600 w-full sm:w-auto focus:ring-2 focus:ring-blue-300"
            aria-label="Try a different outfit with the same photos"
          >
            Try Again
          </button>
          
          <button
            onClick={onRegenerateWithInstructionsToggle}
            className="touch-button bg-purple-500 text-white hover:bg-purple-600 w-full sm:w-auto focus:ring-2 focus:ring-purple-300"
            aria-label="Request modifications and regenerate outfit"
          >
            Regenerate with Instructions
          </button>
          
          {onStartOver && (
            <button
              onClick={onStartOver}
              className="touch-button bg-gray-500 text-white hover:bg-gray-600 w-full sm:w-auto focus:ring-2 focus:ring-gray-300"
              aria-label="Start over with new photos"
            >
              Start Over
            </button>
          )}
        </div>

        {showRegenerateInstructions && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg shadow-inner">
            <label htmlFor="instructions-text" className="block text-sm font-medium text-gray-700 mb-2">
              Enter specific instructions for regeneration:
            </label>
            <textarea
              id="instructions-text"
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white text-gray-900 placeholder-gray-400"
              placeholder="e.g., 'Change my pants to jeans and put me in a cafe.'"
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
            ></textarea>
            <button
              onClick={handleSubmitInstructions}
              disabled={!instructionsText.trim()}
              className="mt-3 touch-button bg-green-600 text-white hover:bg-green-600 disabled:opacity-50"
            >
              Submit Instructions & Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsDisplay;
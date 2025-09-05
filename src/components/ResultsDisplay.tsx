'use client';

import React, { useState, useEffect } from 'react';
import { MobileResultsGallery } from './MobileResultsGallery';
import { useMobileDetection } from '@/hooks/useIsMobile';

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
  onTryAnother?: () => void;
  onStartOver?: () => void;
  onShare?: (result: Result) => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  result,
  loading = false,
  error,
  showComparison = false,
  onDownload,
  onTryAnother,
  onStartOver,
  onShare,
}) => {
  const { isMobileOrTouch } = useMobileDetection();
  if (loading) {
    return (
      <div className="results-display mobile-card">
        <div className="flex flex-col items-center justify-center h-64">
          <div data-testid="loading-spinner" className="animate-spin rounded-full mobile-spinner border-b-2 border-blue-500 mb-4"></div>
          <p className="text-responsive-base text-gray-600">Processing your new outfit...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-display mobile-card">
        <div className="text-center">
          <p className="text-responsive-base text-red-500 mb-4">{error}</p>
          <button
            onClick={onTryAnother}
            className="touch-button bg-blue-500 text-white hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="results-display mobile-card">
        <div className="text-center text-gray-500">
          <p className="text-responsive-base">No result to display</p>
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
    <div className="results-display mobile-card">
      <h2 className="text-responsive-2xl font-bold mb-4 text-center sm:text-left">Your New Look!</h2>

      {result.description && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-blue-800 text-sm">{result.description}</p>
        </div>
      )}

      {poses.length > 0 && (
        <div className="mb-6">
          {isMobileOrTouch ? (
            <>
              <h3 className="text-responsive-lg font-semibold mb-4">Generated Poses</h3>
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
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-responsive-base font-semibold mb-3">Original Photos</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {poses.slice(0, 3).map((pose, index) => (
                      <img
                        key={index}
                        src={pose.originalImageUrl}
                        alt={`Original ${index + 1}`}
                        className="w-full aspect-square object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-responsive-lg font-semibold mb-4">Generated Poses</h3>
              <div className="grid gap-6">
                {poses.map((pose, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="text-md font-medium mb-3 flex items-center justify-between">
                      {pose.name}
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {Math.round(pose.confidence * 100)}% confidence
                      </span>
                    </h4>
                    
                    {showComparison ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-sm font-semibold mb-2 text-gray-700">Before</h5>
                          <img
                            src={pose.originalImageUrl}
                            alt={`Original ${pose.name}`}
                            className="w-full rounded-lg shadow"
                          />
                        </div>
                        <div>
                          <h5 className="text-sm font-semibold mb-2 text-gray-700">After</h5>
                          <img
                            src={pose.processedImageUrl}
                            alt={`Generated ${pose.name}`}
                            className="w-full rounded-lg shadow"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <img
                          src={pose.processedImageUrl}
                          alt={`Generated ${pose.name}`}
                          className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="text-center space-y-4">
        <p className="text-responsive-sm text-gray-600">
          Processed in {result.processingTime.toFixed(1)} seconds
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          {!isMobileOrTouch && (
            <>
              <button
                onClick={() => onDownload?.(result)}
                className="touch-button bg-green-500 text-white hover:bg-green-600 w-full sm:w-auto"
              >
                Download All
              </button>
              
              <button
                onClick={() => onShare?.(result)}
                className="touch-button bg-blue-500 text-white hover:bg-blue-600 w-full sm:w-auto"
              >
                Share
              </button>
            </>
          )}

          <button
            onClick={onTryAnother}
            className="touch-button bg-blue-500 text-white hover:bg-blue-600 w-full sm:w-auto"
          >
            Try Another Outfit
          </button>
          
          {onStartOver && (
            <button
              onClick={onStartOver}
              className="touch-button bg-gray-500 text-white hover:bg-gray-600 w-full sm:w-auto"
            >
              Start Over
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;
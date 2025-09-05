'use client';

import React from 'react';

export interface Result {
  id: string;
  originalImageUrl: string;
  processedImageUrl: string;
  garmentName: string;
  processingTime: number;
  timestamp: string;
}

interface ResultsDisplayProps {
  result?: Result;
  loading?: boolean;
  error?: string;
  showComparison?: boolean;
  onDownload?: (result: Result) => void;
  onTryAnother?: () => void;
  onShare?: (result: Result) => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  result,
  loading = false,
  error,
  showComparison = false,
  onDownload,
  onTryAnother,
  onShare,
}) => {
  if (loading) {
    return (
      <div className="results-display p-6 bg-white rounded-lg shadow-md">
        <div className="flex flex-col items-center justify-center h-64">
          <div data-testid="loading-spinner" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Processing your new outfit...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-display p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={onTryAnother}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="results-display p-6 bg-white rounded-lg shadow-md">
        <div className="text-center text-gray-500">
          <p>No result to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="results-display p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Your New Look!</h2>

      {showComparison ? (
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Before</h3>
            <img
              src={result.originalImageUrl}
              alt="Original"
              className="w-full rounded-lg shadow"
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">After</h3>
            <img
              src={result.processedImageUrl}
              alt="Result"
              className="w-full rounded-lg shadow"
            />
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <img
            src={result.processedImageUrl}
            alt="Result"
            className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
          />
        </div>
      )}

      <div className="text-center space-y-4">
        <p className="text-sm text-gray-600">
          Processed in {result.processingTime} seconds
        </p>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => onDownload?.(result)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Download
          </button>
          
          <button
            onClick={() => onShare?.(result)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Share
          </button>

          <button
            onClick={onTryAnother}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Try Another
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;
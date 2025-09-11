/**
 * Simplified Upload Flow Component
 * Streamlined, user-friendly interface for photo upload and try-on
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, Camera, Sparkles, Check, X, ArrowRight, RefreshCw, Download } from 'lucide-react';
import Image from 'next/image';
import { processImageForUpload } from '../utils/imageConversion';

// ================================
// Types
// ================================

interface UploadedImages {
  user: { url: string | null; isHeic: boolean };
  garment: { url: string | null; isHeic: boolean };
}

interface SimplifiedUploadFlowProps {
  onGenerate: (userPhoto: string, garmentPhoto: string) => Promise<void>;
  isProcessing?: boolean;
  result?: {
    imageUrl: string;
    description?: string;
  } | null;
}

// ================================
// Main Component
// ================================

export function SimplifiedUploadFlow({ 
  onGenerate, 
  isProcessing = false,
  result 
}: SimplifiedUploadFlowProps) {
  const [images, setImages] = useState<UploadedImages>({
    user: { url: null, isHeic: false },
    garment: { url: null, isHeic: false },
  });
  const [dragActive, setDragActive] = useState<'user' | 'garment' | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const userFileInputRef = useRef<HTMLInputElement>(null);
  const garmentFileInputRef = useRef<HTMLInputElement>(null);

  // ================================
  // File Handling
  // ================================

  const handleFile = useCallback(async (file: File, type: 'user' | 'garment') => {
    setError(null);
    
    try {
      // Process image (converts HEIC to JPEG if needed)
      const processedFile = await processImageForUpload(file);
      
      // Validate file size (max 50MB)
      if (processedFile.size > 50 * 1024 * 1024) {
        setError('Image must be less than 50MB');
        return;
      }

      // Read and set image for display
      const reader = new FileReader();
      const isHeic = /heic|heif/i.test(processedFile.type) || /\.hei[c|f]$/i.test(processedFile.name);
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImages(prev => ({
          ...prev,
          [type]: { url: dataUrl, isHeic }
        }));
      };
      reader.readAsDataURL(processedFile);
      
    } catch (error) {
      console.error('Error processing image:', error);
      setError(error instanceof Error ? error.message : 'Failed to process image');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, type: 'user' | 'garment') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file, type);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent, type: 'user' | 'garment') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(type);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'user' | 'garment') => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file, type);
    }
  }, [handleFile]);

  const handleGenerate = useCallback(async () => {
    if (images.user && images.garment) {
      setError(null);
      try {
        await onGenerate(images.user, images.garment);
      } catch (err) {
        setError('Failed to generate. Please try again.');
      }
    }
  }, [images, onGenerate]);

  const handleReset = useCallback(() => {
    setImages({ user: { url: null, isHeic: false }, garment: { url: null, isHeic: false } });
    setError(null);
  }, []);

  const canGenerate = images.user.url && images.garment.url && !isProcessing;

  // ================================
  // Render
  // ================================

  // Show result if available
  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Result Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              Your Virtual Try-On
            </h2>
            <p className="mt-2 opacity-90">Here's how you look in the outfit!</p>
          </div>

          {/* Result Image */}
          <div className="p-6">
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
              <img
                src={result.imageUrl}
                alt="Virtual try-on result"
                className="w-full h-full object-cover"
              />
            </div>
            
            {result.description && (
              <p className="mt-4 text-gray-600 text-center">{result.description}</p>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Try Another
              </button>
              <button
                onClick={() => {
                  // Download logic
                  const link = document.createElement('a');
                  link.href = result.imageUrl;
                  link.download = 'virtual-tryon.jpg';
                  link.click();
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Upload Your Photos
        </h2>
        <p className="text-gray-600">
          Upload a photo of yourself and the garment you want to try on
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <X className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* User Photo Upload */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
            <h3 className="font-semibold text-lg">Your Photo</h3>
            <p className="text-sm opacity-90">Front-facing, clear background preferred</p>
          </div>
          
          <div className="p-6">
            {images.user.url ? (
              <div className="relative">
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
                  {images.user.isHeic ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 p-4 text-center">
                      HEIC preview isn’t supported in this browser.<br/>
                      The image will be processed on the server.
                    </div>
                  ) : (
                    <img
                      src={images.user.url}
                      alt="Your photo"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <button
                  onClick={() => setImages(prev => ({ ...prev, user: { url: null, isHeic: false } }))}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                  aria-label="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Ready
                </div>
              </div>
            ) : (
              <div
                className={`aspect-[3/4] rounded-lg border-2 border-dashed transition-colors cursor-pointer
                  ${dragActive === 'user' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400'}`}
                onDrop={(e) => handleDrop(e, 'user')}
                onDragOver={(e) => handleDragOver(e, 'user')}
                onDragLeave={handleDragLeave}
                onClick={() => userFileInputRef.current?.click()}
              >
                <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Click to upload or drag & drop
                  </p>
                  <p className="text-xs text-gray-500">
                    JPG, PNG, WebP, HEIC up to 50MB
                  </p>
                </div>
              </div>
            )}
            <input
              ref={userFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'user')}
            />
          </div>
        </div>

        {/* Garment Photo Upload */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 text-white">
            <h3 className="font-semibold text-lg">Garment Photo</h3>
            <p className="text-sm opacity-90">Clear photo of the clothing item</p>
          </div>
          
          <div className="p-6">
            {images.garment.url ? (
              <div className="relative">
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
                  {images.garment.isHeic ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 p-4 text-center">
                      HEIC preview isn’t supported in this browser.<br/>
                      The image will be processed on the server.
                    </div>
                  ) : (
                    <img
                      src={images.garment.url}
                      alt="Garment photo"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <button
                  onClick={() => setImages(prev => ({ ...prev, garment: { url: null, isHeic: false } }))}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                  aria-label="Remove garment"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Ready
                </div>
              </div>
            ) : (
              <div
                className={`aspect-[3/4] rounded-lg border-2 border-dashed transition-colors cursor-pointer
                  ${dragActive === 'garment' 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400'}`}
                onDrop={(e) => handleDrop(e, 'garment')}
                onDragOver={(e) => handleDragOver(e, 'garment')}
                onDragLeave={handleDragLeave}
                onClick={() => garmentFileInputRef.current?.click()}
              >
                <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Click to upload or drag & drop
                  </p>
                  <p className="text-xs text-gray-500">
                    JPG, PNG, WebP, HEIC up to 50MB
                  </p>
                </div>
              </div>
            )}
            <input
              ref={garmentFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'garment')}
            />
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all transform
            ${canGenerate
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-xl hover:scale-105'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
        >
          {isProcessing ? (
            <span className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating Your Look...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Generate Virtual Try-On
              <ArrowRight className="w-5 h-5" />
            </span>
          )}
        </button>
      </div>

      {/* Progress Indicator */}
      {isProcessing && (
        <div className="mt-8">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-blue-700 font-medium mb-2">Creating your virtual try-on...</p>
            <div className="w-full bg-blue-100 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-sm text-blue-600 mt-2">This usually takes 15-30 seconds</p>
          </div>
        </div>
      )}
    </div>
  );
}

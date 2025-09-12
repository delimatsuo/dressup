/**
 * Mobile-Optimized Upload Flow
 * Designed specifically for mobile devices with camera integration
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useSessionContext } from './SessionProvider';
import { Camera, Upload, Sparkles, Check, X, ArrowRight, RotateCcw } from 'lucide-react';

// ================================
// Types
// ================================

interface MobileFlowProps {
  onGenerate: (userPhoto: string, garmentPhoto: string) => Promise<void>;
  isProcessing?: boolean;
  result?: {
    imageUrl: string;
    description?: string;
  } | null;
}

type UploadStep = 'instructions' | 'user' | 'garment' | 'review' | 'result';

// ================================
// Main Component
// ================================

export function MobileOptimizedFlow({ 
  onGenerate, 
  isProcessing = false,
  result 
}: MobileFlowProps) {
  const sessionCtx = useSessionContext();
  const [step, setStep] = useState<UploadStep>('instructions');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [garmentPhoto, setGarmentPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const userInputRef = useRef<HTMLInputElement>(null);
  const garmentInputRef = useRef<HTMLInputElement>(null);

  // ================================
  // Handlers
  // ================================

  const handlePhotoCapture = useCallback((file: File, type: 'user' | 'garment') => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('Image must be less than 50MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (type === 'user') {
        setUserPhoto(dataUrl);
        setStep('garment');
      } else {
        setGarmentPhoto(dataUrl);
        setStep('review');
      }
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!userPhoto || !garmentPhoto) return;
    try {
      let sessionId = sessionCtx.sessionId;
      if (!sessionId) {
        const created = await fetch('/api/session/create', { method: 'POST' });
        const j = await created.json();
        sessionId = j?.data?.sessionId || j?.sessionId;
      }
      if (!sessionId) throw new Error('No active session');

      async function uploadDataUrl(dataUrl: string, category: 'user'|'garment', type: 'front'|'side'|'back') {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `${category}-${type}.jpg`, { type: blob.type || 'image/jpeg' });
        const form = new FormData();
        form.append('file', file);
        form.append('sessionId', sessionId!);
        form.append('category', category);
        form.append('type', type);
        const up = await fetch('/api/upload', { method: 'POST', body: form });
        const uj = await up.json();
        if (!up.ok || !uj?.success) throw new Error(uj?.error || 'Upload failed');
        return uj.data.url as string;
      }

      const userUrl = await uploadDataUrl(userPhoto, 'user', 'front');
      try {
        await fetch(`/api/session/${sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userPhotos: [userUrl] })
        });
      } catch {}

      const garmentUrl = await uploadDataUrl(garmentPhoto, 'garment', 'front');

      await onGenerate(userUrl, garmentUrl);
      setStep('result');
    } catch (err) {
      setError('Failed to generate. Please try again.');
    }
  }, [userPhoto, garmentPhoto, onGenerate, sessionCtx.sessionId]);

  const handleReset = useCallback(() => {
    setStep('instructions');
    setUserPhoto(null);
    setGarmentPhoto(null);
    setError(null);
  }, []);

  // ================================
  // Render Steps
  // ================================

  // Result Step
  if (step === 'result' || result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 to-blue-600 text-white">
        <div className="p-4">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Your Virtual Try-On!</h1>
            <p className="text-purple-100">Here's how you look in the outfit</p>
          </div>

          {/* Result Image */}
          {result && (
            <div className="bg-white rounded-2xl p-4 mb-6">
              <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-100">
                <img
                  src={result.imageUrl}
                  alt="Virtual try-on result"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => {
                if (result?.imageUrl) {
                  const link = document.createElement('a');
                  link.href = result.imageUrl;
                  link.download = 'virtual-tryon.jpg';
                  link.click();
                }
              }}
              className="w-full py-4 bg-white text-purple-600 rounded-xl font-semibold text-lg"
            >
              Download Image
            </button>
            <button
              onClick={handleReset}
              className="w-full py-4 bg-purple-700 rounded-xl font-semibold text-lg"
            >
              Try Another Outfit
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Instructions Step
  if (step === 'instructions') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 to-purple-600 text-white p-4">
        <div className="max-w-sm mx-auto pt-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4">
              <Sparkles className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">DressUp AI</h1>
            <p className="text-blue-100">Virtual try-on in 2 easy steps</p>
          </div>

          {/* Steps */}
          <div className="space-y-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl">📸</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">1. Take Your Photo</h3>
                <p className="text-blue-100 text-sm">Front-facing, good lighting</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl">👕</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">2. Photo of Garment</h3>
                <p className="text-blue-100 text-sm">Clear image of clothing item</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep('user')}
            className="w-full py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg mb-4"
          >
            Get Started
          </button>

          <p className="text-center text-xs text-blue-200">
            Your photos are automatically deleted after 30 minutes
          </p>
        </div>
      </div>
    );
  }

  // User Photo Step
  if (step === 'user') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-sm mx-auto pt-4">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 1: Your Photo</h2>
            <p className="text-gray-600">Take or upload a clear photo of yourself</p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <div className="w-12 h-1 bg-gray-300 rounded"></div>
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
            </div>
          </div>

          {userPhoto ? (
            <div className="mb-6">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-gray-200 relative">
                <img
                  src={userPhoto}
                  alt="Your photo"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setUserPhoto(null)}
                  className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <button
                onClick={() => setStep('garment')}
                className="w-full mt-4 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg"
              >
                Next: Garment Photo →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Camera Button */}
              <button
                onClick={() => userInputRef.current?.click()}
                className="w-full aspect-[3/4] border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-white text-gray-600 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Camera className="w-16 h-16 mb-4" />
                <p className="font-semibold text-lg">Take Photo</p>
                <p className="text-sm">Or tap to upload from gallery</p>
              </button>

              <input
                ref={userInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoCapture(file, 'user');
                }}
              />
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Garment Photo Step
  if (step === 'garment') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-sm mx-auto pt-4">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 2: Garment Photo</h2>
            <p className="text-gray-600">Photo of the clothing you want to try on</p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div className="w-12 h-1 bg-blue-600 rounded"></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            </div>
          </div>

          {garmentPhoto ? (
            <div className="mb-6">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-gray-200 relative">
                <img
                  src={garmentPhoto}
                  alt="Garment photo"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setGarmentPhoto(null)}
                  className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <button
                onClick={() => setStep('review')}
                className="w-full mt-4 py-4 bg-purple-600 text-white rounded-xl font-semibold text-lg"
              >
                Review & Generate →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => garmentInputRef.current?.click()}
                className="w-full aspect-[3/4] border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-white text-gray-600 hover:border-purple-400 hover:bg-purple-50 transition-colors"
              >
                <Upload className="w-16 h-16 mb-4" />
                <p className="font-semibold text-lg">Upload Garment</p>
                <p className="text-sm">Clear photo works best</p>
              </button>

              <input
                ref={garmentInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoCapture(file, 'garment');
                }}
              />
              
              <button
                onClick={() => setStep('user')}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-medium"
              >
                ← Back to Your Photo
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Review Step
  if (step === 'review') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-sm mx-auto pt-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Generate!</h2>
            <p className="text-gray-600">Review your photos and generate your try-on</p>
          </div>

          {/* Photos Preview */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Your Photo</p>
              <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-200">
                {userPhoto && (
                  <img src={userPhoto} alt="Your photo" className="w-full h-full object-cover" />
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Garment</p>
              <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-200">
                {garmentPhoto && (
                  <img src={garmentPhoto} alt="Garment" className="w-full h-full object-cover" />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGenerate}
              disabled={isProcessing}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Generate Virtual Try-On
                </span>
              )}
            </button>
            
            <button
              onClick={() => setStep('garment')}
              className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-medium"
            >
              ← Change Garment
            </button>
          </div>

          {isProcessing && (
            <div className="mt-6 text-center">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-blue-700 font-medium mb-2">Creating your virtual try-on...</p>
                <p className="text-sm text-blue-600">Usually takes 15-30 seconds</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

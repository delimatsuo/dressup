'use client';

import React, { useState, useEffect } from 'react';
import { SimplifiedUploadFlow } from '../components/SimplifiedUploadFlow';
import { WelcomeConsentModal } from '../components/WelcomeConsentModal';
import { useConsent } from '../hooks/useConsent';
import { useEnhancedSession } from '../hooks/useEnhancedSession';
import { Sparkles, Info, ChevronDown, ChevronUp } from 'lucide-react';

export default function HomePage() {
  const { hasConsented, isLoading: consentLoading, shouldShowConsentModal, grantConsent } = useConsent();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ imageUrl: string; description?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFAQ, setShowFAQ] = useState(false);
  
  // Session management with enhanced features
  const { 
    session, 
    createSession, 
    trackActivity,
    formattedRemainingTime,
    sessionStatus 
  } = useEnhancedSession({
    autoCreate: true,
    trackActivity: true
  });

  // Track page view
  useEffect(() => {
    if (session && trackActivity) {
      trackActivity('page_view', { page: 'home' });
    }
  }, [session, trackActivity]);

  const handleGenerate = async (userPhoto: string, garmentPhoto: string) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Ensure we have a session
      let currentSession = session;
      if (!currentSession) {
        currentSession = await createSession();
      }

      if (!currentSession) {
        throw new Error('Failed to create session');
      }

      // Track generation start
      if (trackActivity) {
        trackActivity('generation_started', { 
          hasUserPhoto: !!userPhoto,
          hasGarmentPhoto: !!garmentPhoto 
        });
      }

      // Call the try-on API
      const response = await fetch('/api/try-on', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': currentSession.sessionId
        },
        body: JSON.stringify({
          sessionId: currentSession.sessionId,
          userPhotos: { front: userPhoto },
          garmentPhotos: { front: garmentPhoto },
          options: {
            generateMultiplePoses: false,
            enhanceBackground: true
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract result from response
      const resultData = data.data || data;
      const firstResult = resultData.results?.[0] || resultData;
      
      setResult({
        imageUrl: firstResult.imageUrl || firstResult.images?.[0] || '',
        description: resultData.description || 'Your virtual try-on is ready!'
      });

      // Track successful generation
      if (trackActivity) {
        trackActivity('generation_completed', { 
          processingTime: resultData.processingTime,
          success: true 
        });
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate try-on';
      setError(message);
      
      // Track error
      if (trackActivity) {
        trackActivity('generation_failed', { error: message });
      }
      
      // Show error in UI
      setTimeout(() => {
        alert(`Generation failed: ${message}\n\nPlease try again.`);
      }, 100);
      
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConsent = () => {
    grantConsent();
  };

  // Show loading spinner while checking consent
  if (consentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" 
            role="status" 
            aria-label="Loading"
          ></div>
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
          }}
        />
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              DressUp AI
            </h1>
            <p className="text-lg text-gray-800 font-medium">Please review and accept our terms to continue.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  DressUp AI
                </h1>
                <p className="text-xs text-gray-500">Virtual Try-On Made Simple</p>
              </div>
            </div>
            
            {/* Session Timer */}
            {session && sessionStatus?.isActive && (
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
                <span className="font-medium">Session:</span> {formattedRemainingTime}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        {!result && (
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Try On Any Outfit Instantly
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Upload your photo and a garment image to see how you'd look wearing it. 
              Our AI creates realistic virtual try-ons in seconds.
            </p>
          </div>
        )}

        {/* Upload Interface */}
        <SimplifiedUploadFlow
          onGenerate={handleGenerate}
          isProcessing={isProcessing}
          result={result}
        />

        {/* Quick Tips */}
        {!result && !isProcessing && (
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">Tips for Best Results</h3>
                  <ul className="space-y-1 text-sm text-blue-700">
                    <li>• Use a clear, front-facing photo with good lighting</li>
                    <li>• Choose garment images with plain backgrounds</li>
                    <li>• Stand naturally with arms slightly away from your body</li>
                    <li>• Upload high-quality images for better results</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <button
            onClick={() => setShowFAQ(!showFAQ)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h3>
            {showFAQ ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          
          {showFAQ && (
            <div className="mt-4 space-y-4">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-2">How does it work?</h4>
                <p className="text-gray-600 text-sm">
                  Our AI analyzes your photo and the garment image to create a realistic visualization 
                  of how you would look wearing the outfit. The process takes about 15-30 seconds.
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-2">Is my data safe?</h4>
                <p className="text-gray-600 text-sm">
                  Yes! All photos are automatically deleted after 30 minutes. We don't store any 
                  personal information or create user accounts.
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-2">What image formats are supported?</h4>
                <p className="text-gray-600 text-sm">
                  We support JPEG, PNG, WebP, HEIC, and HEIF formats. Files up to 50MB are supported.
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-2">Can I try multiple outfits?</h4>
                <p className="text-gray-600 text-sm">
                  Yes! After generating a try-on, click "Try Another" to upload different garments 
                  without re-uploading your photo.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>© 2025 DressUp AI. All photos are automatically deleted after 30 minutes.</p>
            <p className="mt-2">
              <a href="/privacy" className="text-blue-600 hover:text-blue-700">Privacy Policy</a>
              {' • '}
              <a href="/terms" className="text-blue-600 hover:text-blue-700">Terms of Service</a>
              {' • '}
              <a href="/help" className="text-blue-600 hover:text-blue-700">Help</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
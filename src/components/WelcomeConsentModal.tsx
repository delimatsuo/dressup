'use client';

import React, { useState } from 'react';
import { X, Shield, Eye, Database, Clock } from 'lucide-react';

interface WelcomeConsentModalProps {
  isOpen: boolean;
  onConsent: () => void;
  onClose: () => void;
}

export function WelcomeConsentModal({ isOpen, onConsent, onClose }: WelcomeConsentModalProps) {
  const [hasConsented, setHasConsented] = useState(false);

  if (!isOpen) return null;

  const handleConsentChange = (checked: boolean) => {
    setHasConsented(checked);
  };

  const handleProceed = () => {
    if (hasConsented) {
      onConsent();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Welcome to DressUp AI</h2>
                <p className="text-sm text-gray-600">AI-Powered Virtual Outfit Try-On</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Welcome Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Experience the Future of Fashion
              </h3>
              <p className="text-gray-700 mb-4">
                DressUp AI is a proof-of-concept application that uses advanced artificial intelligence 
                to help you visualize how different outfits would look on you. Upload photos of yourself 
                and any garment, and our AI will generate realistic outfit visualizations from multiple angles.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">✨ What You Can Expect:</h4>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• AI-generated outfit visualizations from multiple poses</li>
                  <li>• Standing front, side, and walking side views</li>
                  <li>• Realistic garment fitting and styling analysis</li>
                  <li>• Instant feedback on style compatibility</li>
                </ul>
              </div>
            </div>

            {/* Privacy Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="w-5 h-5 mr-2 text-green-600" />
                Your Privacy Matters
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Database className="w-5 h-5 mr-3 mt-0.5 text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Session-Based Processing</h4>
                    <p className="text-gray-700 text-sm">
                      Your photos are processed in secure, temporary sessions. No permanent storage 
                      of your personal images on our servers.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Clock className="w-5 h-5 mr-3 mt-0.5 text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Automatic Cleanup</h4>
                    <p className="text-gray-700 text-sm">
                      All uploaded images and generated results are automatically deleted after 
                      your session ends (typically within 24 hours).
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Shield className="w-5 h-5 mr-3 mt-0.5 text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Secure Processing</h4>
                    <p className="text-gray-700 text-sm">
                      All image processing happens in secure cloud environments with enterprise-grade 
                      encryption and privacy protection.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> This is a proof-of-concept demonstration. While we take privacy 
                  seriously, please avoid uploading highly sensitive or personal images. By proceeding, 
                  you acknowledge that this is an experimental AI system designed for fashion visualization.
                </p>
              </div>
            </div>

            {/* Consent Section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-start mb-6">
                <input
                  id="consent-checkbox"
                  type="checkbox"
                  checked={hasConsented}
                  onChange={(e) => handleConsentChange(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="consent-checkbox" className="ml-3 text-sm text-gray-700">
                  <strong>I understand and agree</strong> to the terms outlined above. I acknowledge that:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                    <li>This is a proof-of-concept AI system for fashion visualization</li>
                    <li>My photos will be processed temporarily and then automatically deleted</li>
                    <li>The AI-generated results are for visualization purposes only</li>
                    <li>I should not upload highly sensitive personal images</li>
                  </ul>
                </label>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Not Now
                </button>
                <button
                  onClick={handleProceed}
                  disabled={!hasConsented}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    hasConsented
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Continue to DressUp AI
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
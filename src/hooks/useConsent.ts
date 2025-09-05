'use client';

import { useState, useEffect } from 'react';

const CONSENT_STORAGE_KEY = 'dressup-user-consent';
const CONSENT_VERSION = '1.0.0'; // Version tracking for consent changes

interface ConsentData {
  hasConsented: boolean;
  consentVersion: string;
  timestamp: string;
}

export function useConsent() {
  const [hasConsented, setHasConsented] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load consent state from localStorage on mount
  useEffect(() => {
    const loadConsentState = () => {
      try {
        if (typeof window === 'undefined') {
          setIsLoading(false);
          return;
        }

        const storedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
        
        if (storedConsent) {
          const consentData: ConsentData = JSON.parse(storedConsent);
          
          // Check if consent is still valid (same version)
          const isValidConsent = consentData.consentVersion === CONSENT_VERSION;
          
          if (isValidConsent && consentData.hasConsented) {
            setHasConsented(true);
          } else {
            // Clear outdated consent
            localStorage.removeItem(CONSENT_STORAGE_KEY);
            setHasConsented(false);
          }
        } else {
          setHasConsented(false);
        }
      } catch (error) {
        console.warn('Error loading consent state:', error);
        setHasConsented(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadConsentState();
  }, []);

  // Grant consent and store in localStorage
  const grantConsent = () => {
    try {
      const consentData: ConsentData = {
        hasConsented: true,
        consentVersion: CONSENT_VERSION,
        timestamp: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentData));
      }
      
      setHasConsented(true);
    } catch (error) {
      console.error('Error storing consent:', error);
    }
  };

  // Revoke consent and clear localStorage
  const revokeConsent = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(CONSENT_STORAGE_KEY);
      }
      setHasConsented(false);
    } catch (error) {
      console.error('Error revoking consent:', error);
    }
  };

  // Check if consent modal should be shown
  const shouldShowConsentModal = !isLoading && !hasConsented;

  return {
    hasConsented,
    isLoading,
    shouldShowConsentModal,
    grantConsent,
    revokeConsent,
  };
}
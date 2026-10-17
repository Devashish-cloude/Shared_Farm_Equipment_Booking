/**
 * Google Maps JavaScript API Integration & Singleton Loader
 * Handles dynamic script loading, duplicate avoidance, key validation,
 * and gm_authFailure detection with fallback management.
 */

import { useState, useEffect } from 'react';

// Declare global Google Maps types for window
declare global {
  interface Window {
    google?: any;
    gm_authFailure?: () => void;
    __googleMapsLoadedPromise?: Promise<void>;
  }
}

export const getGoogleMapsApiKey = (): string => {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
};

export const isGoogleMapsConfigured = (): boolean => {
  const key = getGoogleMapsApiKey();
  return Boolean(
    key &&
    key.trim().length > 10 &&
    !key.includes('placeholder') &&
    !key.includes('your-key')
  );
};

export const isPlacesApiAvailable = (): boolean => {
  return Boolean(
    typeof window !== 'undefined' &&
    window.google?.maps?.places &&
    typeof window.google.maps.places.Autocomplete === 'function' &&
    !hasAuthFailureOccurred
  );
};


// Global reactive state for Google Maps authentication failures
let hasAuthFailureOccurred = false;
const authFailureListeners = new Set<(failed: boolean) => void>();

if (typeof window !== 'undefined') {
  const originalGmAuthFailure = window.gm_authFailure;
  window.gm_authFailure = () => {
    hasAuthFailureOccurred = true;
    console.warn(
      '[Google Maps] Authentication failure: The provided API key is either invalid, lacks billing, or is restricted by HTTP referrer.'
    );
    authFailureListeners.forEach((callback) => callback(true));
    if (typeof originalGmAuthFailure === 'function') {
      originalGmAuthFailure();
    }
  };
}

/**
 * Singleton script loader to ensure Google Maps JS API is loaded only once.
 */
export const loadGoogleMapsScript = (libraries: string[] = ['places']): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  // If google.maps is already available on window, resolve immediately
  if (window.google?.maps) {
    return Promise.resolve();
  }

  // Return existing loader promise if load is already in-flight
  if (window.__googleMapsLoadedPromise) {
    return window.__googleMapsLoadedPromise;
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey || !isGoogleMapsConfigured()) {
    return Promise.reject(new Error('Google Maps API key is missing or unconfigured.'));
  }

  window.__googleMapsLoadedPromise = new Promise<void>((resolve, reject) => {
    // Check if script tag was already injected in DOM
    const existingScript = document.getElementById('google-maps-api-script') as HTMLScriptElement | null;
    if (existingScript) {
      if (window.google?.maps) {
        resolve();
      } else {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps script.')));
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-api-script';
    script.type = 'text/javascript';
    script.async = true;
    script.defer = true;

    const libs = libraries.join(',');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=${libs}&loading=async&v=weekly`;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      window.__googleMapsLoadedPromise = undefined;
      reject(new Error('Network error loading Google Maps JavaScript API.'));
    };

    document.head.appendChild(script);
  });

  return window.__googleMapsLoadedPromise;
};

export interface UseGoogleMapsResult {
  isLoaded: boolean;
  isLoading: boolean;
  loadError: string | null;
  authError: boolean;
  isConfigured: boolean;
}

/**
 * React hook for consuming Google Maps API with status tracking and auth error detection.
 */
export const useGoogleMaps = (libraries: string[] = ['places']): UseGoogleMapsResult => {
  const isConfigured = isGoogleMapsConfigured();
  const [isLoaded, setIsLoaded] = useState<boolean>(Boolean(typeof window !== 'undefined' && window.google?.maps));
  const [isLoading, setIsLoading] = useState<boolean>(isConfigured && !window.google?.maps);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<boolean>(hasAuthFailureOccurred);

  useEffect(() => {
    // Subscribe to global auth failure events (e.g. invalid key or unlinked billing)
    const onAuthFailure = (failed: boolean) => setAuthError(failed);
    authFailureListeners.add(onAuthFailure);

    if (!isConfigured) {
      setIsLoading(false);
      return () => {
        authFailureListeners.delete(onAuthFailure);
      };
    }

    if (window.google?.maps) {
      setIsLoaded(true);
      setIsLoading(false);
      return () => {
        authFailureListeners.delete(onAuthFailure);
      };
    }

    setIsLoading(true);
    loadGoogleMapsScript(libraries)
      .then(() => {
        setIsLoaded(true);
        setIsLoading(false);
      })
      .catch((err: any) => {
        setLoadError(err.message || 'Error loading Google Maps.');
        setIsLoading(false);
      });

    return () => {
      authFailureListeners.delete(onAuthFailure);
    };
  }, [isConfigured]);

  return {
    isLoaded: isLoaded && !authError,
    isLoading,
    loadError,
    authError,
    isConfigured,
  };
};

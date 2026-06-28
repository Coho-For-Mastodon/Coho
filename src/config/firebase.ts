/**
 * Firebase Functions Configuration
 *
 * Switch between local emulator and production based on environment.
 * Uses the local emulator when running on localhost in dev mode (not during tests).
 */

// Firebase project configuration
const FIREBASE_PROJECT_ID = 'coho-mastodon';
const FIREBASE_REGION = 'us-central1';

// Base URLs
const PRODUCTION_BASE_URL = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net`;
const LOCAL_BASE_URL = `http://127.0.0.1:5001/${FIREBASE_PROJECT_ID}/${FIREBASE_REGION}`;

const isLocal =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1') &&
  import.meta.env.MODE !== 'test' &&
  // Capacitor's WebView runs on https://localhost or capacitor://localhost but should use production APIs
  window.location.protocol !== 'https:' &&
  window.location.protocol !== 'capacitor:';

// Export the appropriate base URL
export const FIREBASE_FUNCTIONS_BASE_URL = isLocal
  ? LOCAL_BASE_URL
  : PRODUCTION_BASE_URL;

// Helper function to build Firebase Function URLs
export function getFirebaseFunctionUrl(functionName: string): string {
  return `${FIREBASE_FUNCTIONS_BASE_URL}/${functionName}`;
}

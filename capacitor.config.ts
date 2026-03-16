import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'place.coho.app',
  appName: 'Coho',
  webDir: 'dist',
  server: {
    // Use HTTPS scheme so the WebView origin matches typical browser behavior.
    // This affects CORS: requests from the WebView will have origin "https://localhost".
    androidScheme: 'https',
  },
  plugins: {
    App: {
      // Keep default back-button handling so hardware back navigates the router
    },
    PushNotifications: {
      // Show notifications even when the app is in the foreground
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;

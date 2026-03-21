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
      // Disable Capacitor's default back-button handler so our custom
      // OnBackPressedCallback in MainActivity can dynamically enable/disable
      // itself based on WebView.canGoBack(). This is required for the
      // predictive back gesture animation on Android 14+.
      disableBackButtonHandler: true,
    },
    PushNotifications: {
      // Show notifications even when the app is in the foreground
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;

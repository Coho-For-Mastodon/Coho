/**
 * Shared CORS configuration for all Firebase Functions.
 */
export const allowedOrigins = [
  'https://coho.place',
  'https://coho-mastodon.web.app',
  'http://localhost:3000',
  // Capacitor Android WebView origin (androidScheme: 'https' in capacitor.config.ts)
  'https://localhost',
  // Capacitor iOS WebView origin
  'capacitor://localhost',
];

export function applyCors(
  request: { headers: { origin?: string } },
  response: { set: (key: string, value: string) => void },
  methods = 'GET, POST, DELETE, OPTIONS'
) {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    response.set('Access-Control-Allow-Origin', origin);
  }
  response.set('Access-Control-Allow-Methods', methods);
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Get URL parameters from the current window location.
 * Simply wraps URLSearchParams for consistent access across the app.
 */
export function getEffectiveParams(windowLocation: Location): URLSearchParams {
  return new URLSearchParams(windowLocation.search);
}

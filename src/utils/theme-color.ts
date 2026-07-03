/**
 * Theme color utilities for applying and managing app theme colors
 * Used by both app-index.ts and app-theme.ts
 */

/**
 * Adjust color brightness by a given amount
 * @param col Color in hex format
 * @param amt Amount to adjust (-255 to 255)
 */
export function adjustColorBrightness(col: string, amt: number): string {
  let usePound = false;
  if (col[0] === '#') {
    col = col.slice(1);
    usePound = true;
  }

  const num = parseInt(col, 16);

  let r = (num >> 16) + amt;
  if (r > 255) r = 255;
  else if (r < 0) r = 0;

  let b = ((num >> 8) & 0x00ff) + amt;
  if (b > 255) b = 255;
  else if (b < 0) b = 0;

  let g = (num & 0x0000ff) + amt;
  if (g > 255) g = 255;
  else if (g < 0) g = 0;

  return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16);
}

/**
 * Apply theme color to both Shoelace and MD3 design tokens
 * @param color Primary color in hex format
 */
export function applyThemeColor(color: string): void {
  const root = document.documentElement;

  // Shoelace tokens
  root.style.setProperty('--sl-color-primary-600', color);
  root.style.setProperty('--primary-color', color);

  // Generate lighter/darker variants
  const lighterVariant = adjustColorBrightness(color, 40);
  const darkerVariant = adjustColorBrightness(color, -40);

  root.style.setProperty('--sl-color-primary-500', lighterVariant);
  root.style.setProperty('--sl-color-primary-700', darkerVariant);

  // MD3 tokens - primary color (set on :root for highest priority)
  root.style.setProperty('--md-sys-color-primary', color);
  root.style.setProperty('--md-sys-color-outline', color);

  // Also update body for legacy support
  document.body.style.setProperty('--sl-color-primary-600', color);
  document.body.style.setProperty('--md-sys-color-primary', color);
  document.body.style.setProperty('--md-sys-color-outline', color);
}

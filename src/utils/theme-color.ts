/**
 * Theme color utilities for applying and managing app theme colors
 * Used by both app-index.ts and app-theme.ts
 */
import {
  themeFromSourceColor,
  applyTheme,
  argbFromHex,
} from '@material/material-color-utilities';
import {
  DynamicThemePalette,
  M3ColorScheme,
  getAndroidDynamicPalette,
} from './dynamic-theme.js';

/**
 * Parse any color format (hex, rgb, rgba) to RGB components
 */
export function parseColor(color: string): { r: number; g: number; b: number } {
  color = color.trim();

  // Handle rgb/rgba format: rgb(r, g, b) or rgb(r g b)
  const rgbMatch = color.match(/rgba?\s*\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  // Handle hex format
  let hex = color.replace('#', '');
  // Handle shorthand hex (#abc -> #aabbcc)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

/**
 * Mix two colors in sRGB color space
 * @param color1 First color (hex or rgb format)
 * @param color2 Second color (hex or rgb format)
 * @param weight Weight of color1 (0-100)
 */
export function mixColors(
  color1: string,
  color2: string,
  weight: number
): string {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);
  const w = weight / 100;

  const r = Math.round(c1.r * w + c2.r * (1 - w));
  const g = Math.round(c1.g * w + c2.g * (1 - w));
  const b = Math.round(c1.b * w + c2.b * (1 - w));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

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
 * Update the theme-color meta tags with tinted background colors
 * This affects the Window Controls Overlay / titlebar area
 */
export function updateThemeMetaTags(primaryColor: string): void {
  // Calculate tinted backgrounds matching CSS: color-mix(in srgb, primary X%, base)
  // These match --md-sys-color-background from md-tokens.css:
  // Dark: color-mix(in srgb, var(--md-sys-color-primary) 5%, #141314)
  // Light: color-mix(in srgb, var(--md-sys-color-primary) 10%, #ffffff)
  const lightBackground = mixColors(primaryColor, '#ffffff', 10);
  const darkBackground = mixColors(primaryColor, '#141314', 5);

  // Find and update the meta tags
  const darkMeta = document.querySelector(
    'meta[name="theme-color"][media="(prefers-color-scheme: dark)"]'
  );
  const lightMeta = document.querySelector(
    'meta[name="theme-color"][media="(prefers-color-scheme: light)"]'
  );

  if (darkMeta) {
    darkMeta.setAttribute('content', darkBackground);
  }
  if (lightMeta) {
    lightMeta.setAttribute('content', lightBackground);
  }
}

/**
 * Update theme-color meta tags directly from native M3 scheme surfaces
 */
export function updateThemeMetaTagsFromScheme(
  lightScheme: M3ColorScheme,
  darkScheme: M3ColorScheme
): void {
  const darkMeta = document.querySelector(
    'meta[name="theme-color"][media="(prefers-color-scheme: dark)"]'
  );
  const lightMeta = document.querySelector(
    'meta[name="theme-color"][media="(prefers-color-scheme: light)"]'
  );

  if (darkMeta && darkScheme.background) {
    darkMeta.setAttribute('content', darkScheme.background);
  }
  if (lightMeta && lightScheme.background) {
    lightMeta.setAttribute('content', lightScheme.background);
  }
}

let currentColor = '#5171a5';
let activeDynamicPalette: DynamicThemePalette | null = null;
let themeListenerAdded = false;

/**
 * Apply scheme CSS custom properties directly to document root
 */
export function applySchemeTokens(
  scheme: M3ColorScheme,
  root: HTMLElement = document.documentElement
): void {
  for (const [key, value] of Object.entries(scheme)) {
    if (!value) continue;
    const cssKey =
      '--md-sys-color-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(cssKey, value);
  }

  if (scheme.primary) {
    root.style.setProperty('--sl-color-primary-600', scheme.primary);
    root.style.setProperty('--primary-color', scheme.primary);
    document.body.style.setProperty('--sl-color-primary-600', scheme.primary);
  }
  if (scheme.primaryContainer) {
    root.style.setProperty('--sl-color-primary-500', scheme.primaryContainer);
  }
  if (scheme.onPrimaryContainer) {
    root.style.setProperty('--sl-color-primary-700', scheme.onPrimaryContainer);
  }
}

/**
 * Apply a full native Android Material You dynamic palette
 */
export function applyDynamicPalette(
  palette: DynamicThemePalette,
  options: { updateMetaTags?: boolean } = {}
): void {
  if (!palette.supported || !palette.schemes) {
    if (palette.accentColor) {
      applyThemeColor(palette.accentColor, options);
    }
    return;
  }

  activeDynamicPalette = palette;
  currentColor = 'device';
  const { updateMetaTags = true } = options;

  // Persist schemes for instant startup restoration in index.html
  try {
    localStorage.setItem('coho-theme-color', 'device');
    localStorage.setItem(
      'coho-device-scheme-light',
      JSON.stringify(palette.schemes.light)
    );
    localStorage.setItem(
      'coho-device-scheme-dark',
      JSON.stringify(palette.schemes.dark)
    );
    if (palette.accentColor) {
      localStorage.setItem('coho-device-accent-color', palette.accentColor);
    }
  } catch {
    // LocalStorage quota or privacy mode
  }

  // Setup listener for dark mode changes if not already set
  ensureThemeListener();

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const activeScheme = isDark ? palette.schemes.dark : palette.schemes.light;

  applySchemeTokens(activeScheme);

  if (updateMetaTags) {
    updateThemeMetaTagsFromScheme(palette.schemes.light, palette.schemes.dark);
  }
}

function ensureThemeListener(): void {
  if (themeListenerAdded) return;
  themeListenerAdded = true;

  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (currentColor === 'device' && activeDynamicPalette) {
        applyDynamicPalette(activeDynamicPalette, { updateMetaTags: true });
      } else if (currentColor !== 'device') {
        applyThemeColor(currentColor, {
          updateMetaTags: true,
          useIdleCallback: false,
        });
      }
    });
}

/**
 * Apply theme color to both Shoelace and MD3 design tokens
 * @param color Primary color in hex format or 'device'
 * @param options Options for applying the theme
 */
export function applyThemeColor(
  color: string,
  options: { updateMetaTags?: boolean; useIdleCallback?: boolean } = {}
): void {
  if (color === 'device') {
    if (activeDynamicPalette) {
      applyDynamicPalette(activeDynamicPalette, options);
      return;
    }

    getAndroidDynamicPalette().then((palette) => {
      if (palette?.supported && palette.schemes) {
        applyDynamicPalette(palette, options);
      } else {
        // Fallback to default
        applyThemeColor('#5171a5', options);
      }
    });
    return;
  }

  activeDynamicPalette = null;
  currentColor = color;
  const { updateMetaTags = true, useIdleCallback = false } = options;

  const root = document.documentElement;

  // Setup listener for dark mode changes if not already set
  ensureThemeListener();

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  try {
    // Generate and apply M3 Theme
    const theme = themeFromSourceColor(argbFromHex(color));
    applyTheme(theme, { target: root, dark: isDark });
  } catch (e) {
    console.error('Failed to generate M3 theme', e);
  }

  // Shoelace tokens
  root.style.setProperty('--sl-color-primary-600', color);
  root.style.setProperty('--primary-color', color);

  // Generate lighter/darker variants
  const lighterVariant = adjustColorBrightness(color, 40);
  const darkerVariant = adjustColorBrightness(color, -40);

  root.style.setProperty('--sl-color-primary-500', lighterVariant);
  root.style.setProperty('--sl-color-primary-700', darkerVariant);

  // Also update body for legacy support
  document.body.style.setProperty('--sl-color-primary-600', color);

  // Update theme-color meta tags with tinted background
  // Skip on desktop in light mode to keep default white titlebar
  if (updateMetaTags) {
    const isLightMode = !window.matchMedia('(prefers-color-scheme: dark)')
      .matches;
    const isDesktop = window.innerWidth > 820;

    if (!(isLightMode && isDesktop)) {
      if (useIdleCallback) {
        requestIdleCallback(() => updateThemeMetaTags(color), {
          timeout: 8000,
        });
      } else {
        updateThemeMetaTags(color);
      }
    }
  }
}

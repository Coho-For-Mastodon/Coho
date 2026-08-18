import { isNativePlatform, getPlatform } from './platform';

export type TonalStep =
  | '0'
  | '10'
  | '50'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900'
  | '1000';

export type TonalPaletteGroup = Record<TonalStep | string, string>;

export interface RawTonalPalettes {
  accent1: TonalPaletteGroup;
  accent2: TonalPaletteGroup;
  accent3: TonalPaletteGroup;
  neutral1: TonalPaletteGroup;
  neutral2: TonalPaletteGroup;
}

export interface M3ColorScheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  surfaceDim?: string;
  surfaceBright?: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  background: string;
  onBackground: string;
  [key: string]: string | undefined;
}

export interface DynamicThemePalette {
  supported: boolean;
  accentColor: string | null;
  palettes?: RawTonalPalettes;
  schemes?: {
    light: M3ColorScheme;
    dark: M3ColorScheme;
  };
  error?: string;
}

interface DynamicThemePlugin {
  getAccentColor(): Promise<{ color: string | null; supported: boolean }>;
  getPalette(): Promise<DynamicThemePalette>;
}

let cachedPalette: DynamicThemePalette | null = null;

/**
 * Returns the full Android Material You dynamic tonal palettes and resolved M3 schemes,
 * or null when running as a PWA or on unsupported Android versions (< 12).
 */
export async function getAndroidDynamicPalette(): Promise<DynamicThemePalette | null> {
  if (!isNativePlatform() || getPlatform() !== 'android') {
    return null;
  }

  if (cachedPalette) {
    return cachedPalette;
  }

  try {
    const { registerPlugin } = await import('@capacitor/core');
    const DynamicThemeBridge =
      registerPlugin<DynamicThemePlugin>('DynamicThemeBridge');
    const result = await DynamicThemeBridge.getPalette();
    if (result.supported) {
      cachedPalette = result;
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns the Android Material You dynamic accent color as a hex string,
 * or null when running as a PWA or on unsupported Android versions (< 12).
 */
export async function getAndroidDynamicColor(): Promise<string | null> {
  if (!isNativePlatform() || getPlatform() !== 'android') {
    return null;
  }

  try {
    const palette = await getAndroidDynamicPalette();
    if (palette?.supported && palette.accentColor) {
      return palette.accentColor;
    }

    const { registerPlugin } = await import('@capacitor/core');
    const DynamicThemeBridge =
      registerPlugin<DynamicThemePlugin>('DynamicThemeBridge');
    const result = await DynamicThemeBridge.getAccentColor();
    return result.supported ? result.color : null;
  } catch {
    return null;
  }
}

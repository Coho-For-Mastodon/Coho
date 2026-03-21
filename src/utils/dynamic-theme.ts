import { isNativePlatform, getPlatform } from './platform';

interface DynamicThemePlugin {
  getAccentColor(): Promise<{ color: string | null; supported: boolean }>;
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
    const { registerPlugin } = await import('@capacitor/core');
    const DynamicThemeBridge =
      registerPlugin<DynamicThemePlugin>('DynamicThemeBridge');
    const result = await DynamicThemeBridge.getAccentColor();
    return result.supported ? result.color : null;
  } catch {
    return null;
  }
}

import { Capacitor } from '@capacitor/core';

/**
 * Returns true when the app is running inside a Capacitor native shell
 * (Android or iOS), false when running as a regular web page or PWA.
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Returns the current platform: 'android', 'ios', or 'web'.
 */
export function getPlatform(): 'android' | 'ios' | 'web' {
  return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
}

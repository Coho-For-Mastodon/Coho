import { allLocales } from '../generated/locale-codes.js';
export declare const getLocale: (() => string) & {
    _LIT_LOCALIZE_GET_LOCALE_?: never;
  },
  setLocale: ((newLocale: string) => Promise<void>) & {
    _LIT_LOCALIZE_SET_LOCALE_?: never;
  };
type AllLocales = (typeof allLocales)[number];
/**
 * Get the user's preferred locale from settings or browser.
 * Returns the source locale if no preference is found or if the preference is not supported.
 */
export declare function getPreferredLocale(): AllLocales;
/**
 * Save the locale preference to localStorage.
 */
export declare function saveLocalePreference(locale: string): void;
/**
 * Initialize localization with the user's preferred locale.
 * Call this early in app startup.
 */
export declare function initLocalization(): Promise<void>;
declare global {
  interface Window {
    cohoLocale: {
      getLocale: typeof getLocale;
      setLocale: (locale: string) => Promise<void>;
      getPreferredLocale: typeof getPreferredLocale;
      saveLocalePreference: typeof saveLocalePreference;
      availableLocales: readonly string[];
    };
  }
}
export {};

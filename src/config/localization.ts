import { configureLocalization } from '@lit/localize';
import {
  sourceLocale,
  targetLocales,
  allLocales,
} from '../generated/locale-codes.js';

// Type for locale modules
type LocaleModule = typeof import('../generated/locales/es.js');

// Explicit locale imports for Vite compatibility
// (template literal dynamic imports don't work well with Vite's build)
const localeModules: Record<string, () => Promise<LocaleModule>> = {
  es: () => import('../generated/locales/es.js'),
};

export const { getLocale, setLocale } = configureLocalization({
  sourceLocale,
  targetLocales,
  loadLocale: async (locale: string) => {
    const loader = localeModules[locale];
    if (!loader) {
      throw new Error(`Unknown locale: ${locale}`);
    }
    return loader();
  },
});

type AllLocales = (typeof allLocales)[number];

/**
 * Get the user's preferred locale from settings or browser.
 * Returns the source locale if no preference is found or if the preference is not supported.
 */
export function getPreferredLocale(): AllLocales {
  // Check URL parameter first (for testing)
  const urlParams = new URLSearchParams(window.location.search);
  const urlLocale = urlParams.get('locale');
  if (urlLocale && allLocales.includes(urlLocale as AllLocales)) {
    return urlLocale as AllLocales;
  }

  // Check localStorage
  const savedLocale = localStorage.getItem('locale');
  if (savedLocale && allLocales.includes(savedLocale as AllLocales)) {
    return savedLocale as AllLocales;
  }

  // Check browser language
  const browserLang = navigator.language.split('-')[0];
  if (allLocales.includes(browserLang as AllLocales)) {
    return browserLang as AllLocales;
  }

  return sourceLocale;
}

/**
 * Save the locale preference to localStorage.
 */
export function saveLocalePreference(locale: string): void {
  localStorage.setItem('locale', locale);
}

/**
 * Initialize localization with the user's preferred locale.
 * Call this early in app startup.
 */
export async function initLocalization(): Promise<void> {
  const preferred = getPreferredLocale();
  if (preferred !== sourceLocale) {
    try {
      await setLocale(preferred);
    } catch (e) {
      console.warn('[Localization] Failed to set preferred locale:', e);
    }
  }
}

// Auto-initialize on module load
initLocalization();

// Expose helper on window for easy console testing
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

if (typeof window !== 'undefined') {
  window.cohoLocale = {
    getLocale,
    // Wrapper that also saves the preference
    setLocale: async (locale: string) => {
      await setLocale(locale);
      saveLocalePreference(locale);
    },
    getPreferredLocale,
    saveLocalePreference,
    availableLocales: allLocales,
  };
}

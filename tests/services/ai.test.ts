import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isOnDeviceTranslationAvailable,
  translate,
} from '../../src/services/ai';
import { translateStatus } from '../../src/services/posts';
import { getPlatform } from '../../src/utils/platform';
import { nativeDetectLanguage } from '../../src/services/native-ai';

vi.mock('../../src/services/posts', () => ({
  translateStatus: vi.fn(),
}));

vi.mock('../../src/utils/platform', () => ({
  getPlatform: vi.fn(() => 'web'),
  isNativePlatform: vi.fn(() => false),
}));

vi.mock('../../src/services/native-ai', () => ({
  nativeDetectLanguage: vi.fn(),
  getNativeAICapabilities: vi.fn(async () => ({
    translation: false,
    altText: false,
    proofreading: false,
  })),
  nativeTranslate: vi.fn(),
}));

const mockedTranslateStatus = vi.mocked(translateStatus);
const mockedGetPlatform = vi.mocked(getPlatform);
const mockedNativeDetectLanguage = vi.mocked(nativeDetectLanguage);

function setWindowApi(
  name: 'Capacitor' | 'LanguageDetector' | 'Translator',
  value: unknown
) {
  Object.defineProperty(window, name, {
    configurable: true,
    writable: true,
    value,
  });
}

describe('ai translate service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPlatform.mockReturnValue('web');
    mockedNativeDetectLanguage.mockRejectedValue(
      new Error('native unavailable')
    );
    mockedTranslateStatus.mockResolvedValue({
      content: '<p>Hello from Mastodon</p>',
      detected_source_language: 'es',
      provider: 'mock',
    });
    setWindowApi('Capacitor', undefined);
    setWindowApi('LanguageDetector', undefined);
    setWindowApi('Translator', undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('falls back to Mastodon when browser translation APIs are unavailable', async () => {
    const result = await translate('Hola desde Mastodon', 'en-us', 'post-1');

    expect(result).toBe('Hello from Mastodon');
    expect(mockedTranslateStatus).toHaveBeenCalledWith('post-1', 'en');
  });

  it('returns the original text when source detection confidently matches the target', async () => {
    const detector = {
      detect: vi.fn(async () => [
        { detectedLanguage: 'en-US', confidence: 0.99 },
      ]),
      destroy: vi.fn(),
    };
    setWindowApi('LanguageDetector', {
      create: vi.fn(async () => detector),
    });

    const result = await translate('Already in English', 'en-us', 'post-1');

    expect(result).toBe('Already in English');
    expect(detector.destroy).toHaveBeenCalled();
    expect(mockedTranslateStatus).not.toHaveBeenCalled();
  });

  it('uses Chrome Translator when it can translate the detected source language', async () => {
    const detector = {
      detect: vi.fn(async () => [{ detectedLanguage: 'es', confidence: 0.98 }]),
      destroy: vi.fn(),
    };
    const translator = {
      translate: vi.fn(async () => 'Hello from Chrome'),
      destroy: vi.fn(),
    };
    setWindowApi('LanguageDetector', {
      create: vi.fn(async () => detector),
    });
    setWindowApi('Translator', {
      availability: vi.fn(async () => 'available'),
      create: vi.fn(async () => translator),
    });

    const result = await translate('Hola desde Chrome', 'en-us', 'post-1');

    expect(result).toBe('Hello from Chrome');
    expect(translator.destroy).toHaveBeenCalled();
    expect(mockedTranslateStatus).not.toHaveBeenCalled();
  });

  it('requires a status id when falling back to Mastodon', async () => {
    await expect(translate('Hola', 'en-us')).rejects.toThrow(
      'Mastodon translation fallback requires a status ID'
    );
  });

  it('does not mark translation as on-device when web Translator is unavailable outside native Android', () => {
    setWindowApi('Capacitor', {
      isNativePlatform: vi.fn(() => false),
      getPlatform: vi.fn(() => 'web'),
    });
    setWindowApi('Translator', undefined);

    expect(isOnDeviceTranslationAvailable()).toBe(false);
  });

  it('marks translation as on-device when Chrome Translator exists', () => {
    setWindowApi('Translator', {
      availability: vi.fn(),
      create: vi.fn(),
    });

    expect(isOnDeviceTranslationAvailable()).toBe(true);
  });

  it('marks translation as on-device inside Capacitor Android without Chrome Translator', () => {
    setWindowApi('Capacitor', {
      isNativePlatform: vi.fn(() => true),
      getPlatform: vi.fn(() => 'android'),
    });
    setWindowApi('Translator', undefined);

    expect(isOnDeviceTranslationAvailable()).toBe(true);
  });
});

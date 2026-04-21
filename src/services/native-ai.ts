import { registerPlugin } from '@capacitor/core';
import { isNativePlatform, getPlatform } from '../utils/platform.js';

/**
 * TypeScript bridge to the native AiBridge Capacitor plugin.
 * Provides on-device AI via ML Kit Translation and Gemini Nano
 * (alt text generation + proofreading) on Android.
 */

interface AiBridgePlugin {
  translate(opts: {
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<{ translatedText: string }>;

  generateAltText(opts: { imageBase64: string }): Promise<{ altText: string }>;

  proofread(opts: { text: string }): Promise<{
    correctedInput: string;
    corrections: Array<{
      startIndex: number;
      endIndex: number;
      correction: string;
      correctionType?: string;
      explanation?: string;
    }>;
  }>;

  checkAvailability(): Promise<{
    translation: boolean;
    altText: boolean;
    proofreading: boolean;
  }>;

  detectLanguage(opts: { text: string }): Promise<{ language: string }>;
}

interface SpeechBridgePlugin {
  checkSpeechStatus(): Promise<{
    available: boolean;
    mode: 'advanced' | 'basic' | 'unavailable';
  }>;
  startSpeechRecognition(opts: { locale: string }): Promise<{ text: string }>;
  stopSpeechRecognition(): Promise<{ stopped: boolean }>;
  addListener(
    event: 'partialSpeech',
    callback: (data: { text: string }) => void
  ): Promise<{ remove: () => void }>;
}

// Cached capabilities – populated once per session
let cachedCapabilities: {
  translation: boolean;
  altText: boolean;
  proofreading: boolean;
} | null = null;

const bridge = registerPlugin<AiBridgePlugin>('AiBridge');

function getBridge(): AiBridgePlugin {
  return bridge;
}

function isNativeAndroid(): boolean {
  return isNativePlatform() && getPlatform() === 'android';
}

/**
 * Probe which native AI capabilities are available on this device.
 * Result is cached for the session lifetime.
 */
export async function getNativeAICapabilities(): Promise<{
  translation: boolean;
  altText: boolean;
  proofreading: boolean;
}> {
  if (!isNativeAndroid()) {
    return { translation: false, altText: false, proofreading: false };
  }

  if (cachedCapabilities) return cachedCapabilities;

  try {
    cachedCapabilities = await getBridge().checkAvailability();
  } catch {
    cachedCapabilities = {
      translation: false,
      altText: false,
      proofreading: false,
    };
  }

  return cachedCapabilities;
}

/**
 * Translate text using ML Kit on-device translation.
 * Throws if not on native Android or if translation fails.
 */
export async function nativeTranslate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  const result = await getBridge().translate({
    text,
    sourceLanguage,
    targetLanguage,
  });
  return result.translatedText;
}

/**
 * Generate alt text for an image using Gemini Nano.
 * @param imageBase64 - Base64-encoded image data (with or without data URI prefix)
 */
export async function nativeGenerateAltText(
  imageBase64: string
): Promise<string> {
  const result = await getBridge().generateAltText({ imageBase64 });
  return result.altText;
}

/**
 * Proofread text using Gemini Nano.
 * Returns a result matching the ProofreadResult interface shape.
 */
export async function nativeProofread(text: string): Promise<{
  correctedInput: string;
  corrections: Array<{
    startIndex: number;
    endIndex: number;
    correction: string;
    correctionType?: string;
    explanation?: string;
  }>;
}> {
  return await getBridge().proofread({ text });
}

/**
 * Detect the language of text using ML Kit Language Identification.
 * Returns a BCP-47 language code (e.g. 'en', 'ja', 'es').
 */
export async function nativeDetectLanguage(text: string): Promise<string> {
  const result = await getBridge().detectLanguage({ text });
  return result.language;
}

// ── Speech Recognition (ML Kit GenAI) ───────────────────────────────────

const speechBridge = registerPlugin<SpeechBridgePlugin>('SpeechBridge');

let cachedSpeechStatus: {
  available: boolean;
  mode: 'advanced' | 'basic' | 'unavailable';
} | null = null;

/**
 * Check if native on-device speech recognition is available.
 * Result is cached for the session lifetime.
 */
export async function isNativeSpeechRecognitionAvailable(): Promise<boolean> {
  if (!isNativeAndroid()) return false;

  if (cachedSpeechStatus) return cachedSpeechStatus.available;

  try {
    cachedSpeechStatus = await speechBridge.checkSpeechStatus();
  } catch {
    cachedSpeechStatus = { available: false, mode: 'unavailable' };
  }

  return cachedSpeechStatus.available;
}

/**
 * Get the speech recognition mode available on this device.
 */
export async function getNativeSpeechMode(): Promise<
  'advanced' | 'basic' | 'unavailable'
> {
  await isNativeSpeechRecognitionAvailable();
  return cachedSpeechStatus?.mode ?? 'unavailable';
}

/**
 * Start native speech recognition from the microphone.
 * Returns a promise that resolves with the final transcribed text
 * when recognition ends (after calling nativeStopSpeechRecognition).
 */
export function nativeStartSpeechRecognition(
  locale: string = 'en-US'
): Promise<string> {
  return speechBridge
    .startSpeechRecognition({ locale })
    .then((result) => result.text);
}

/**
 * Stop an active native speech recognition session.
 * The promise from nativeStartSpeechRecognition will resolve with the final text.
 */
export async function nativeStopSpeechRecognition(): Promise<void> {
  await speechBridge.stopSpeechRecognition();
}

/**
 * Subscribe to live partial text updates during native speech recognition.
 * Returns a cleanup function to remove the listener.
 */
export async function addNativeSpeechPartialListener(
  callback: (text: string) => void
): Promise<() => void> {
  const handle = await speechBridge.addListener('partialSpeech', ({ text }) =>
    callback(text)
  );
  return () => handle.remove();
}

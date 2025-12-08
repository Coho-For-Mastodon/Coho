export declare const requestMammothBot: (prompt: string, previousMessages: {
    role: string;
    content: string;
}[]) => Promise<any>;
export declare const summarize: (prompt: string) => Promise<any>;
export declare const translate: (prompt: string, language?: string) => Promise<any>;
export declare const createAPost: (prompt: string) => Promise<any>;
export declare const createImage: (prompt: string) => Promise<any>;
/**
 * Check if Chrome's Proofreader API is available on this device
 */
export declare const isProofreaderAvailable: () => Promise<boolean>;
/**
 * Proofread text using Chrome's on-device AI Proofreader API
 * Returns corrections for grammar, spelling, and punctuation errors
 */
export declare const proofread: (text: string) => Promise<ProofreadResult | null>;
/**
 * Check if Chrome's Prompt API (LanguageModel) is available
 */
export declare const isPromptAPIAvailable: () => boolean;
/**
 * Generate alt text for an image using Chrome's on-device Prompt API
 * @param imageSource - URL string or Blob of the image
 * @returns Generated alt text or null if generation fails
 */
export declare const generateAltText: (imageSource: string | Blob) => Promise<string | null>;

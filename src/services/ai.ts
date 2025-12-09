import { FIREBASE_FUNCTIONS_BASE_URL } from '../config/firebase';

// const endpoint = "https://mammoth-ai.cognitiveservices.azure.com/";
// const key = "a38533c238474e93999c8898e8d7419b";

// const visionEndpoint = "https://mammoth-vision.cognitiveservices.azure.com/";
// const visionKey = "8362308c1d174ffca10ca1eb77b1314f";

export const requestMammothBot = async (
  prompt: string,
  previousMessages: { role: string; content: string }[]
) => {
  // This uses Azure Functions - keep as is for now
  const response = await fetch(`/api/mammothBot?prompt=${prompt}`, {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      previousMessages: previousMessages,
    }),
  });
  const data = await response.json();

  return data;
};

export const summarize = async (prompt: string) => {
  // Use Chrome's built-in Summarizer API
  try {
    // Check if the API is available
    if (!('summarizer' in window)) {
      throw new Error('Summarizer API not available');
    }

    const canSummarize = await window.summarizer.capabilities();
    if (canSummarize.available === 'no') {
      throw new Error('Summarizer not available on this device');
    }

    // Create summarizer session
    const summarizer = await window.summarizer.create({
      type: 'tl;dr', // or 'key-points', 'teaser', 'headline'
      format: 'plain-text', // or 'markdown'
      length: 'short', // or 'medium', 'long'
    });

    // Summarize the text
    const summary = await summarizer.summarize(prompt);

    // Clean up
    summarizer.destroy();

    return { summary };
  } catch (error) {
    console.error('Summarizer API error:', error);
    // Fallback to Azure Functions if built-in API fails
    const response = await fetch(`/api/summarizeStatus?prompt=${prompt}`, {
      method: 'GET',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    });
    const data = await response.json();
    return data;
  }
};

export const translate = async (prompt: string, language: string = 'en-us') => {
  // Use Chrome's built-in Translator API
  try {
    // Check if the API is available
    if (!('Translator' in window)) {
      throw new Error('Translator API not available');
    }

    // Detect source language using Language Detector API
    let sourceLanguage = 'en';

    if ('Translator' in window && 'LanguageDetector' in window) {
      try {
        console.log('Attempting language detection for prompt:', prompt);
        const detector = await window.LanguageDetector.create();
        const results = await detector.detect(prompt);
        console.log('Language detection results:', results);
        if (results && results.length > 0 && results[0].confidence > 0.5) {
          sourceLanguage = results[0].detectedLanguage;
        }
        detector.destroy();
      } catch (err) {
        console.warn('Language detection failed, defaulting to English:', err);
      }
    }

    // Normalize language code (e.g., 'en-us' -> 'en')
    const targetLanguage = language.split('-')[0].toLowerCase();

    // Skip translation if source and target are the same
    if (sourceLanguage === targetLanguage) {
      return { translation: prompt };
    }
    console.log(
      'Checking translator capabilities for',
      sourceLanguage,
      'to',
      targetLanguage
    );
    const translatorCapabilities = await window.Translator.availability({
      sourceLanguage,
      targetLanguage,
    });

    const canTranslate = translatorCapabilities;
    console.log('canTranslate', canTranslate);

    if (canTranslate !== 'available' && canTranslate !== 'downloadable') {
      throw new Error(
        `Translation from ${sourceLanguage} to ${targetLanguage} not available`
      );
    }

    // Create translator session
    const translator = await window.Translator.create({
      sourceLanguage,
      targetLanguage,
    });

    // Translate the text
    const translatedText = await translator.translate(prompt);
    console.log('Translated text:', translatedText);

    // Clean up
    translator.destroy();

    return translatedText;
  } catch (error) {
    console.error('Translator API error:', error);

    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE_URL}/translateStatus?content=${encodeURIComponent(
        prompt
      )}&language=${language}`,
      {
        method: 'GET',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      }
    );
    console.log('translate response', response);
    const data = await response.json();
    return data;
  }
};

export const createAPost = async (prompt: string) => {
  // Use Firebase Function
  const response = await fetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/generateStatus?prompt=${prompt}`,
    {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    }
  );
  const data = await response.json();

  return data;
};

export const createImage = async (prompt: string) => {
  // Use Firebase Function
  const response = await fetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/generateImage?prompt=${prompt}`,
    {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    }
  );
  const data = await response.json();

  return data;
};

/**
 * Check if Chrome's Proofreader API is available on this device
 */
export const isProofreaderAvailable = async (): Promise<boolean> => {
  try {
    if (typeof Proofreader === 'undefined') {
      return false;
    }
    const availability = await Proofreader.availability({
      expectedInputLanguages: ['en'],
    });
    return availability === 'available' || availability === 'downloadable';
  } catch (error) {
    console.error('Proofreader availability check failed:', error);
    return false;
  }
};

/**
 * Proofread text using Chrome's on-device AI Proofreader API
 * Returns corrections for grammar, spelling, and punctuation errors
 */
export const proofread = async (
  text: string
): Promise<ProofreadResult | null> => {
  try {
    if (typeof Proofreader === 'undefined') {
      throw new Error('Proofreader API not available');
    }

    const availability = await Proofreader.availability({
      expectedInputLanguages: ['en'],
    });

    if (availability !== 'available' && availability !== 'downloadable') {
      throw new Error('Proofreader not available on this device');
    }

    // Create proofreader session
    const proofreader = await Proofreader.create({
      expectedInputLanguages: ['en'],
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          console.log(`Proofreader model download: ${e.loaded * 100}%`);
        });
      },
    });

    // Proofread the text
    const result = await proofreader.proofread(text);

    // Clean up
    proofreader.destroy();

    return result;
  } catch (error) {
    console.error('Proofreader API error:', error);
    return null;
  }
};

/**
 * Check if Chrome's Prompt API (LanguageModel) is available
 */
export const isPromptAPIAvailable = (): boolean => {
  return 'LanguageModel' in window;
};

/**
 * Generate alt text for an image using Chrome's on-device Prompt API
 * @param imageSource - URL string or Blob of the image
 * @returns Generated alt text or null if generation fails
 */
export const generateAltText = async (
  imageSource: string | Blob
): Promise<string | null> => {
  try {
    if (!isPromptAPIAvailable()) {
      throw new Error('Prompt API (LanguageModel) not available');
    }

    // Convert URL to Blob if needed
    let imageBlob: Blob;
    if (typeof imageSource === 'string') {
      const response = await fetch(imageSource);
      imageBlob = await response.blob();
    } else {
      imageBlob = imageSource;
    }

    const session = await LanguageModel.create({
      expectedInputs: [{ type: 'image' }],
    });

    const prompt =
      'Give me alt text for the following image. Only return the alt text, no other text or markdown:';

    const result = await session.prompt([
      {
        role: 'user',
        content: [
          { type: 'text', value: prompt },
          { type: 'image', value: imageBlob },
        ],
      },
    ]);

    // Clean up
    session.destroy();

    return result;
  } catch (error) {
    console.error('Alt text generation error:', error);
    return null;
  }
};

/**
 * Check if audio transcription via LanguageModel is available
 */
export const isAudioTranscriptionAvailable = (): boolean => {
  return 'LanguageModel' in window;
};

/**
 * Check if on-device translation is available via Chrome's Translator API
 */
export const isOnDeviceTranslationAvailable = (): boolean => {
  return 'Translator' in window;
};

/**
 * Check if on-device summarization is available via Chrome's Summarizer API
 */
export const isOnDeviceSummarizationAvailable = (): boolean => {
  return 'summarizer' in window;
};

/**
 * Transcribe audio using Chrome's on-device Prompt API (LanguageModel)
 * @param audioBlob - Blob containing audio data
 * @returns Transcribed text or null if transcription fails
 */
export const transcribeAudio = async (
  audioBlob: Blob
): Promise<string | null> => {
  try {
    if (!isPromptAPIAvailable()) {
      throw new Error('Prompt API (LanguageModel) not available');
    }

    console.log(
      'Transcribing audio blob:',
      audioBlob.size,
      'bytes, type:',
      audioBlob.type
    );

    const arrayBuffer = await audioBlob.arrayBuffer();
    console.log('ArrayBuffer size:', arrayBuffer.byteLength);

    const params = await LanguageModel.params();
    console.log('LanguageModel params:', params);

    const session = await LanguageModel.create({
      expectedInputs: [{ type: 'audio' }],
      temperature: 0.1,
      topK: params.defaultTopK,
    });

    let result = '';
    const stream = session.promptStreaming([
      {
        role: 'user',
        content: [
          {
            type: 'text',
            value:
              'Please transcribe the following audio recording word for word. Return only the spoken words, nothing else.',
          },
          { type: 'audio', value: arrayBuffer },
        ],
      },
    ]);

    for await (const chunk of stream) {
      console.log('Transcription chunk:', chunk);
      // Chunks are individual tokens, concatenate them
      result += chunk;
    }

    // Clean up
    session.destroy();

    console.log('Final transcription result:', result);
    return result.trim();
  } catch (error) {
    console.error('Audio transcription error:', error);
    return null;
  }
};

// export const analyzeStatusImage = async (image: string) => {
//     const response = await fetch(`${visionEndpoint}/computervision/imageanalysis:analyze?api-version=2022-10-12-preview&features=Read,Description`, {
//         method: "POST",
//         headers: new Headers({
//             "Content-Type": "application/json",
//             "Ocp-Apim-Subscription-Key": visionKey
//         }),
//         body: JSON.stringify({
//             url: image
//         })
//     });

//     const data = await response.json();
//     console.log(data);

//     return data;
// }

// export const analyzeStatusText = async (text: string) => {
//     const response = await fetch(`${endpoint}/language/:analyze-text?api-version=2022-05-01`, {
//         method: "POST",
//         headers: new Headers({
//             "Content-Type": "application/json",
//             "Ocp-Apim-Subscription-Key": key
//         }),
//         body: JSON.stringify(
//             {
//                 "kind": "EntityLinking",
//                 "parameters": {
//                     "modelVersion": "latest"
//                 },
//                 "analysisInput": {
//                     "documents": [
//                         {
//                             "id": "1",
//                             "language": "en",
//                             "text": text
//                         }
//                     ]
//                 }
//             }
//         )
//     })

//     const data = await response.json();
//     console.log(data);

//     return data;
// }

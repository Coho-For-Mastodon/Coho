export {};

declare global {
  interface Window {
    summarizer: {
      capabilities(): Promise<{ available: string }>;
      create(options: unknown): Promise<SummarizerSession>;
    };
    LanguageDetector: {
      create(): Promise<LanguageDetectorSession>;
    };
    Translator: {
      availability(options: {
        sourceLanguage: string;
        targetLanguage: string;
      }): Promise<string>;
      create(options: {
        sourceLanguage: string;
        targetLanguage: string;
      }): Promise<TranslatorSession>;
    };
    EyeDropper: {
      new (): EyeDropper;
    };
  }

  // EyeDropper API
  interface EyeDropper {
    open(): Promise<{ sRGBHex: string }>;
  }

  // Web Share API
  interface ShareData {
    title?: string;
    text?: string;
    url?: string;
    files?: File[];
  }

  interface Navigator {
    share?(data?: ShareData): Promise<void>;
    canShare?(data?: ShareData): boolean;
    setAppBadge?(count?: number): Promise<void>;
    clearAppBadge?(): Promise<void>;
    connection?: NetworkInformation;
  }

  // Scheduler API (Prioritized Task Scheduling)
  interface Scheduler {
    yield(): Promise<void>;
    postTask<T>(
      callback: () => T | Promise<T>,
      options?: SchedulerPostTaskOptions
    ): Promise<T>;
  }

  interface SchedulerPostTaskOptions {
    priority?: 'user-blocking' | 'user-visible' | 'background';
    signal?: AbortSignal;
    delay?: number;
  }

  const scheduler: Scheduler;

  // Network Information API
  interface NetworkInformation extends EventTarget {
    saveData: boolean;
    effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
    downlink: number;
    rtt: number;
    onchange?: EventListener;
  }

  // Chrome Proofreader API
  interface Proofreader {
    availability(options?: ProofreaderOptions): Promise<string>;
    create(options?: ProofreaderCreateOptions): Promise<ProofreaderSession>;
  }

  interface ProofreaderOptions {
    expectedInputLanguages?: string[];
  }

  interface ProofreaderCreateOptions {
    expectedInputLanguages?: string[];
    monitor?: (monitor: ProofreaderDownloadMonitor) => void;
  }

  interface ProofreaderDownloadMonitor {
    addEventListener(
      type: 'downloadprogress',
      listener: (event: { loaded: number }) => void
    ): void;
  }

  interface ProofreaderSession {
    proofread(text: string): Promise<ProofreadResult>;
    destroy(): void;
  }

  interface ProofreadResult {
    correctedInput: string;
    corrections: ProofreadCorrection[];
  }

  interface ProofreadCorrection {
    startIndex: number;
    endIndex: number;
    correction: string;
    correctionType?: string;
    explanation?: string;
  }

  const Proofreader: Proofreader;

  // Chrome LanguageModel API (Prompt API)
  interface LanguageModel {
    availability(): Promise<string>;
    params(): Promise<LanguageModelParams>;
    create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
  }

  interface LanguageModelParams {
    defaultTopK: number;
    maxTopK: number;
    defaultTemperature: number;
  }

  interface LanguageModelCreateOptions {
    expectedInputs?: Array<{ type: 'text' | 'image' | 'audio' }>;
    temperature?: number;
    topK?: number;
    systemPrompt?: string;
  }

  interface LanguageModelSession {
    inputUsage?: number;
    inputQuota?: number;
    measureInputUsage?(messages: LanguageModelMessage[]): Promise<number>;
    prompt(messages: LanguageModelMessage[]): Promise<string>;
    promptStreaming(messages: LanguageModelMessage[]): AsyncIterable<string>;
    destroy(): void;
  }

  interface LanguageModelMessage {
    role: 'user' | 'assistant' | 'system';
    content: LanguageModelContent[] | string;
  }

  type LanguageModelContent =
    | { type: 'text'; value: string }
    | { type: 'image'; value: Blob | ArrayBuffer | HTMLCanvasElement }
    | { type: 'audio'; value: Blob | AudioBuffer | BufferSource };

  const LanguageModel: LanguageModel;

  interface SummarizerSession {
    summarize(text: string): Promise<string>;
    destroy(): void;
  }

  interface LanguageDetectorSession {
    detect(
      text: string
    ): Promise<{ detectedLanguage: string; confidence: number }[]>;
    destroy(): void;
  }

  interface TranslatorSession {
    translate(text: string): Promise<string>;
    destroy(): void;
  }

  interface PeriodicSyncManager {
    register(tag: string, options?: { minInterval: number }): Promise<void>;
    getTags(): Promise<string[]>;
    unregister(tag: string): Promise<void>;
  }

  interface ServiceWorkerRegistration {
    periodicSync: PeriodicSyncManager;
  }

  // Extended NotificationOptions for Service Workers
  interface ServiceWorkerNotificationOptions extends NotificationOptions {
    renotify?: boolean;
    actions?: NotificationAction[];
  }

  interface NotificationAction {
    action: string;
    title: string;
    icon?: string;
  }

  // Extend ServiceWorkerRegistration.showNotification to accept extended options
  interface ServiceWorkerRegistration {
    showNotification(
      title: string,
      options?: ServiceWorkerNotificationOptions
    ): Promise<void>;
  }
}

// Vite environment variables
interface ImportMetaEnv {
  readonly VITE_INSTANCES_SOCIAL_TOKEN?: string;
}

// Augment the global ImportMeta interface
declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INSTANCES_SOCIAL_TOKEN: string | undefined;
  // Add more VITE_ prefixed env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;

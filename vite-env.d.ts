/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_KEY_1: string;
  readonly VITE_GEMINI_KEY_2: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

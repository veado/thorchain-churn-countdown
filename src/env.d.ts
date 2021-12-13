// Vite
// IntelliSense for TypeScript
// https://vitejs.dev/guide/env-and-mode.html#intellisense-for-typescript

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MIDGARD_API_URL: string;
  readonly VITE_THORCHAIN_WS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

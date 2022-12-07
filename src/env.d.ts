/// <reference types="svelte" />
// Vite
// IntelliSense for TypeScript
// https://vitejs.dev/guide/env-and-mode.html#intellisense-for-typescript

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_IDENTIFIER: string;
  readonly VITE_MIDGARD_API_URL: string;
  readonly VITE_THORCHAIN_WS_URL: string;
  readonly VITE_COMMIT_HASH: string;
  readonly VITE_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

// Подставляется Vite на этапе сборки, см. `define` в vite.config.ts.
declare const __APP_VERSION__: string;

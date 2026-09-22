import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Версия деплоя живёт в package.json корня монорепозитория — единственном месте,
// где версионируется проект целиком.
const { version } = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf-8')
);

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Without this, the service worker (and therefore the installability
      // criteria Chrome checks for beforeinstallprompt) only exists in a
      // production build — `npm run dev` would never fire the prompt.
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'PintaGames Captain Panel',
        short_name: 'PintaGames',
        description: 'Интерактивная панель капитанов PintaGames',
        theme_color: '#1a0933',
        background_color: '#1a0933',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/app',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  server: {
    // Lets the dev server accept requests through a Cloudflare Tunnel / ngrok
    // hostname (Vite normally rejects unrecognized Host headers).
    allowedHosts: true,
    proxy: {
      // Forwards relative /api calls to the Express server, so a phone
      // hitting the tunnel URL talks to the same origin it loaded from
      // instead of needing a reachable localhost:5050.
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
      },
    },
  },
});

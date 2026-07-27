import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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

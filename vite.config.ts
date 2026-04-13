import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local game-show server (game state, Spotify, etc.)
const APP_SERVER = 'http://localhost:3001';
const APP_SERVER_WS = 'ws://localhost:3001';

// Judge-controller — override with JUDGE_URL env var to point at Pi.
// e.g. JUDGE_URL=http://judge-controller.local:3001 npm run dev
const JUDGE_HOST = process.env['JUDGE_URL'] ?? APP_SERVER;
const JUDGE_HOST_WS = JUDGE_HOST.replace(/^http/, 'ws');

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4174,
    allowedHosts: ['srv1461086.tail71c584.ts.net'],
    proxy: {
      '/api/buzzer': {
        target: JUDGE_HOST,
        changeOrigin: true,
      },
      '/api': {
        target: APP_SERVER,
        changeOrigin: true,
      },
      '/ws/game-show': {
        target: APP_SERVER_WS,
        ws: true,
        changeOrigin: true,
      },
      '/ws/buzzer': {
        target: JUDGE_HOST_WS,
        ws: true,
        changeOrigin: true,
      },
    },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../public',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500, // face-api.js + TF.js is intentionally large
  },
  // face-api.js / TensorFlow.js need to be pre-bundled for Vite compatibility
  optimizeDeps: {
    exclude: ['@vladmandic/face-api'],
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    basicSsl(),
  ],
  resolve: {
    alias: {
      '@mediapipe/pose': path.resolve(__dirname, 'src/stubs/mediapipe-pose.js'),
    },
  },
  server: {
    host: true, // Expose on LAN so phone can connect via IP
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:8080',
        ws: true,
      },
    },
  },
});

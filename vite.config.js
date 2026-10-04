import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { themeBuildPlugin } from './scripts/theme-build-plugin.mjs';

export default defineConfig({
  plugins: [react(), themeBuildPlugin()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8118' },
  },
});

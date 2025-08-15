import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'electron/renderer/index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'electron/renderer'),
      '@shared': resolve(__dirname, 'electron/shared')
    }
  },
  server: {
    port: 5173
  }
});

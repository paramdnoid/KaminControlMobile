import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'desktop-converter',
  base: './',
  plugins: [react()],
  build: {
    outDir: '../.desktop-build/renderer',
    emptyOutDir: true,
  },
});

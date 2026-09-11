// Vite config for GitHub Pages deployment
// Base path must match your repo name

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/nexus-research/',
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})

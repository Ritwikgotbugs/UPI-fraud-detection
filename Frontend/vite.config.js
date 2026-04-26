import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'set-coop-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Allow popups to close even when site is COOP/COEP-protected during dev
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      // Alias to browser-compatible modules
      '@': path.resolve(__dirname, './src'),
      path: 'path-browserify',
      url: 'url',
      'source-map': 'source-map-js',
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['path-browserify', 'url', 'source-map-js'], // Include the browser-compatible versions for Vite to handle
  },
  build: {
    sourcemap: false, // Optionally disable source maps for production if not needed
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['snowpan-icon.svg'],
      manifest: {
        name: '스노우판',
        short_name: '스노우판',
        description: '스키 장비부터 레슨까지, 한눈에 비교하세요',
        theme_color: '#0ea5e9',
        background_color: '#f3f4f6',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/banners.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'banner-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 300 },
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/products.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'product-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 },
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 300 },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor';
          if (id.includes('node_modules/react/')) return 'vendor';
          if (id.includes('socket.io-client')) return 'socket';
          if (id.includes('hls.js')) return 'hls';
          if (id.includes('data/webcamData')) return 'webcam-data';
        },
      },
    },
  },
})

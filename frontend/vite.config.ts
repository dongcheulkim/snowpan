import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['snowpan-icon.svg', 'icons/og-image.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'icons/favicon-16.png', 'robots.txt'],
      manifest: {
        name: '스노우판',
        short_name: '스노우판',
        description: '스키 장비부터 레슨까지, 한눈에 비교하세요',
        theme_color: '#0ea5e9',
        background_color: '#f3f4f6',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 신규 SW 즉시 활성화 + 모든 탭에서 즉시 제어 (stale 청크 안 남음)
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/banners.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'banner-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 },
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/products.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/home\/hot-deals.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/community.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/(rentals|lessons|accommodations|ski-shops|repair-shops).*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/notifications.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/chat.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/ad-booking.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/admin.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/auth.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/reports.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/reviews.*/i,
            handler: 'NetworkOnly',
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
    target: 'es2020',
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

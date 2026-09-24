import { resolve } from 'path'
import { copyFileSync, existsSync } from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // 오프라인 셸 — index.html 사본을 app-shell.html 로 써 두고 SW 가 precache 한다 (아래 precacheFallback).
    // index.html 자체를 precache 하면 '/' 가 cache-first 가 돼 배포 직후 옛 홈 HTML 이 보이므로 사본을 쓴다.
    {
      name: 'snowpan-app-shell',
      apply: 'build',
      writeBundle(opts) {
        const dir = opts.dir || resolve(__dirname, 'dist');
        const src = resolve(dir, 'index.html');
        if (existsSync(src)) copyFileSync(src, resolve(dir, 'app-shell.html'));
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['snowpan-icon.svg', 'icons/og-image.png', 'icons/og-image-v2.png', 'icons/og-partners.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'icons/favicon-16.png', 'robots.txt'],
      manifest: {
        name: '스노우판',
        short_name: '스노우판',
        description: '리조트별 스키·보드 매장 찾기와 스키·보드 중고거래',
        lang: 'ko',
        dir: 'ltr',
        theme_color: '#0ea5e9',
        background_color: '#f0f9ff',
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
        // HTML 제외 — HTML 을 precache 하면 옛 HTML 이 새 빌드의 사라진 chunk 를
        // 요청해 ERR_FAILED 가 됨. HTML 은 navigation 요청 NetworkFirst 로 매번
        // 새로 받고 오프라인일 때만 fallback.
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}', 'app-shell.html'],
        // navigateFallback 끔 — 켜면 precache 에 없는 /index.html 에 묶인 NavigationRoute 가 먼저 등록돼
        // 아래 NetworkFirst 네비게이션 라우트를 가로채고, 오프라인에선 캐시 미스로 브라우저 오류 화면이 됐다.
        // 이제 네비게이션은 NetworkFirst(navigation-cache) 하나로: 온라인은 항상 새 HTML, 오프라인은 최근 방문 페이지,
        // 그것도 없으면 precache 된 app-shell.html(오프라인 셸)로 앱을 띄운다.
        navigateFallback: null,
        runtimeCaching: [
          // SPA 진입 (네비게이션) — 항상 네트워크 우선, 3초 안에 응답 없으면 캐시 사용, 캐시도 없으면 오프라인 셸
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'navigation-cache',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
              precacheFallback: { fallbackURL: '/app-shell.html' },
            },
          },
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
      // /partners 는 공유 카드(og:*)만 다른 partners.html 로 진입 (vercel.json rewrite)
      input: { main: resolve(__dirname, 'index.html'), partners: resolve(__dirname, 'partners.html') },
      output: {
        manualChunks(id) {
          if (id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor';
          if (id.includes('node_modules/react/')) return 'vendor';
          if (id.includes('socket.io-client')) return 'socket';
          if (id.includes('hls.js')) return 'hls';
          // Sentry (프론트 에러 트래킹) 은 조건부 dynamic import 라 자연 분리되지만
          // 명시적으로 청크 이름 부여 → 캐시 효율 ↑
          if (id.includes('@sentry')) return 'sentry';
        },
      },
    },
  },
})

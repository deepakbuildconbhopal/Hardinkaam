import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'auto',
        includeAssets: [
          'favicon-32x32.png',
          'apple-touch-icon.png',
          'icon.svg',
          'icon-maskable.svg',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'manifest.webmanifest',
        ],
        manifest: {
          id: 'https://hardinkaam.com/',
          name: 'HARDINKAAM: On-Demand Home Services',
          short_name: 'HARDINKAAM',
          description: "Bhopal's #1 verified on-demand home services, electrician, plumber, carpenter, AC repair, and civil construction platform by Deepak Buildcon.",
          start_url: '/?source=pwa_twa',
          scope: '/',
          display: 'standalone',
          display_override: ['standalone', 'window-controls-overlay', 'minimal-ui'],
          orientation: 'portrait',
          theme_color: '#ea580c',
          background_color: '#ffffff',
          lang: 'hi-IN',
          dir: 'ltr',
          categories: ['lifestyle', 'utilities', 'business', 'shopping'],
          prefer_related_applications: false,
          related_applications: [
            {
              platform: 'play',
              id: 'com.hardinkaam.app',
              url: 'https://play.google.com/store/apps/details?id=com.hardinkaam.app',
            },
            {
              platform: 'webapp',
              url: 'https://hardinkaam.com/manifest.webmanifest',
            },
          ],
          shortcuts: [
            {
              name: 'Electrician Service',
              short_name: 'Electrician',
              description: 'Book verified electrician in Bhopal in 60 mins',
              url: '/#electrician',
              icons: [
                {
                  src: '/pwa-192x192.png',
                  sizes: '192x192',
                  type: 'image/png',
                },
              ],
            },
            {
              name: 'Plumber Service',
              short_name: 'Plumber',
              description: 'Book expert plumber for leakages and fittings',
              url: '/#plumber',
              icons: [
                {
                  src: '/pwa-192x192.png',
                  sizes: '192x192',
                  type: 'image/png',
                },
              ],
            },
            {
              name: 'AC Repair & Service',
              short_name: 'AC Repair',
              description: 'AC servicing, gas charging and installation',
              url: '/#ac-repair',
              icons: [
                {
                  src: '/pwa-192x192.png',
                  sizes: '192x192',
                  type: 'image/png',
                },
              ],
            },
            {
              name: 'Franchise Portal',
              short_name: 'Franchise',
              description: 'Deepak Buildcon all-India franchise opportunity',
              url: '/#franchise',
              icons: [
                {
                  src: '/pwa-192x192.png',
                  sizes: '192x192',
                  type: 'image/png',
                },
              ],
            },
          ],
          icons: [
            {
              src: '/favicon-32x32.png',
              sizes: '32x32',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: '/icon-maskable.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,webmanifest,json}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [
            /^\/__/, // Firebase hosting / auth reserved prefix
            /^\/api\/.*/, // Backend APIs
            /^https:\/\/identitytoolkit\.googleapis\.com\/.*/,
            /^https:\/\/securetoken\.googleapis\.com\/.*/,
            /^https:\/\/firestore\.googleapis\.com\/.*/,
            /^https:\/\/.*\.firestore\.googleapis\.com\/.*/,
            /^https:\/\/firebaseinstallations\.googleapis\.com\/.*/,
          ],
          runtimeCaching: [
            // STRICT SECURITY & REAL-TIME ACCURACY:
            // 1. Critical User Data: Active Bookings, Payouts, Wallet, & User profiles must NEVER serve stale cached data
            {
              urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*\/documents\/(bookings|payouts|users|service_men|serviceman_payouts|notifications|wallets|transactions|audit_logs).*/i,
              handler: 'NetworkOnly',
            },
            // 2. All Backend APIs & Cloud Functions (booking mutations, Razorpay checkout, payouts, split calculations)
            {
              urlPattern: /^\/api\/.*/i,
              handler: 'NetworkOnly',
            },
            // 3. Sensitive Firebase Auth & Token services
            {
              urlPattern: /^https:\/\/(identitytoolkit|securetoken|firestore|firebaseinstallations)\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly',
            },
            // 4. Wildcard for any dynamic Firestore domain requests
            {
              urlPattern: /^https:\/\/.*\.firestore\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly',
            },
            // Cache Google Fonts Stylesheets
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Cache Google Fonts Webfonts
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Cache external Unsplash service images
            {
              urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'unsplash-images',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

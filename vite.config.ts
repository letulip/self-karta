/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

// Ответы не должны уходить с устройства: страница может обращаться только к своему же адресу.
// Заголовки на GitHub Pages не настраиваются, поэтому политика — meta-тегом, и только в сборке:
// dev-сервер Vite вставляет стили inline, и строгая политика ему мешает.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

export default defineConfig({
  base: '/self-karta/',
  plugins: [
    vue(),
    {
      name: 'karta-csp',
      apply: 'build',
      transformIndexHtml: (html) =>
        html.replace('<!-- csp -->', `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
    },
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Карта экспертности',
        short_name: 'Карта',
        description: 'Само-интервью о сильных сторонах, энергии, ценностях и направлении. Ответы хранятся только на устройстве.',
        lang: 'ru',
        start_url: '/self-karta/',
        scope: '/self-karta/',
        display: 'standalone',
        background_color: '#f6f3ee',
        theme_color: '#1f4e4a',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'] },
    }),
  ],
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts'],
  },
});

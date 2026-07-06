import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'fox-192.png', 'fox-512.png'],
      manifest: {
        name: 'Pathfinder',
        short_name: 'Pathfinder',
        description: 'Your little guide through the big woods',
        lang: 'de',
        theme_color: '#0c1a12',
        background_color: '#0c1a12',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/fox-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/fox-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/fox-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App-Shell + Assets cachen, damit Ansichten offline aufgehen
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
})

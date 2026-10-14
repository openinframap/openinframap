/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { renderSVG } from 'vite-plugin-render-svg'
import i18nextLoader from 'vite-plugin-i18next-loader'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_BACKEND_BASE_URL || 'https://openinframap.org'

  return {
    build: {
      target: 'es2022',
      outDir: './dist',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules/maplibre-gl')) {
              return 'maplibre'
            }
          }
        }
      }
    },

    server: {
      fs: {
        // Allow serving files from one level up to the project root
        allow: ['..']
      },
      proxy: {
        '/stats': { target: backendUrl, changeOrigin: true },
        '/about': { target: backendUrl, changeOrigin: true },
        '/static': { target: backendUrl, changeOrigin: true },
        '/local-images': { target: backendUrl, changeOrigin: true }
      }
    },

    plugins: [
      renderSVG({
        pattern: 'src/icons/*.svg',
        urlPrefix: 'icons/',
        outputOriginal: true
      }),
      i18nextLoader({ paths: ['./locales'], namespaceResolution: 'relativePath' }),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          navigateFallbackDenylist: [/^\/stats/, /^\/map/, /^\/fonts/, /^\/static/, /^\/about/, /^\/copyright/, /^\/local-images/, /^\/wikidata/, /^\/search/, /^\/api/]
        },
        manifest: {
          name: 'Open Infrastructure Map',
          short_name: 'OpenInfraMap',
          description:
            "Open map of the world's electricity, telecoms, oil, and gas infrastructure, using data from OpenStreetMap.",
          theme_color: '#ffffff',
          icons: [
            {
              src: 'pwa-64x64.png',
              sizes: '64x64',
              type: 'image/png'
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],

    test: {
      environment: 'puppeteer',
      globalSetup: 'vitest-environment-puppeteer/global-init',
      globals: true
    }
  }
})

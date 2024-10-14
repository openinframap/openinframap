import { defineConfig } from 'vite'
import { renderSVG } from 'vite-plugin-render-svg'
import i18nextLoader from 'vite-plugin-i18next-loader'

export default defineConfig({
  build: {
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

  plugins: [
    renderSVG({
      pattern: 'src/icons/*.svg',
      urlPrefix: 'icons/',
      outputOriginal: true
    }),
    i18nextLoader({ paths: ['./locales'], namespaceResolution: 'relativePath' })
  ]
})

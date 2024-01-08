import { defineConfig } from 'vite'
import { renderSVG } from 'vite-plugin-render-svg'

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
          if (id.includes('node_modules')) {
            return 'vendor'
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
    })
  ]
})

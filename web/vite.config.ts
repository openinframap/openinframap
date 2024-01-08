import { defineConfig } from 'vite'
import { renderSVG } from 'vite-plugin-render-svg'

export default defineConfig({
  build: {
    outDir: './dist',
    chunkSizeWarningLimit: 1000
  },

  plugins: [
    renderSVG({
      pattern: 'src/icons/*.svg',
      urlPrefix: 'icons/',
      outputOriginal: true
    })
  ]
})

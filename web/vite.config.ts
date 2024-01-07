import { defineConfig } from "vite";
import { renderSVG } from "vite-plugin-render-svg";

export default defineConfig({
  build: {
    // Relative to the root
    outDir: "./dist",
  },
  
  plugins: [renderSVG({
    pattern: "src/icons/*.svg",
    urlPrefix: "icons/",
    outputOriginal: true,
  })],
});

import { defineConfig } from "vite";

// GitHub Pages serviert unter https://philippkudelka.github.io/pistenatlas/
// — der base-Pfad muss daher exakt "/pistenatlas/" sein.
export default defineConfig({
  base: "/pistenatlas/",
  build: {
    target: "es2022",
    sourcemap: false,
  },
});

import { defineConfig } from "vite";

// GitHub Pages serviert unter https://philippkudelka.github.io/pistenatlas/
// — der base-Pfad muss daher exakt "/pistenatlas/" sein.
export default defineConfig({
  base: "/pistenatlas/",
  server: {
    port: Number(process.env["PORT"]) || 5173,
    strictPort: false,
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});

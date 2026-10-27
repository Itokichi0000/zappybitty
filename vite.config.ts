import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// The Android app (Capacitor) loads the built files from dist/; relative paths keep the
// same build working from any folder, including a plain static web host.
export default defineConfig({
  base: "./",
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    outDir: "dist",
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
  },
});

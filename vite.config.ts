/// <reference types="vitest/config" />
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { compression } from "vite-plugin-compression2";
import { visualizer } from "rollup-plugin-visualizer";

/**
 * Performance/scaling choices, spelled out so they don't get silently
 * reverted later:
 *
 * - Manual vendor chunking: react/react-dom/react-router rarely change
 *   between deploys, so they get their own long-lived-cache chunk instead
 *   of being re-bundled (and re-downloaded by every returning user) with
 *   app code on every release.
 * - Brotli + gzip pre-compression at build time (vite-plugin-compression2):
 *   most static hosts/CDNs serve pre-compressed assets as-is instead of
 *   compressing per-request, which is both faster and cheaper.
 * - Bundle visualizer behind `pnpm analyze` (mode=analyze) rather than
 *   always-on, so normal builds stay fast.
 * - esbuild's target matches tsconfig's ES2022 so it doesn't waste bytes
 *   transpiling syntax every supported browser already has.
 */
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    compression({ algorithms: ["brotliCompress", "gzip"] }),
    mode === "analyze" &&
      visualizer({ filename: "stats.html", gzipSize: true, brotliSize: true, open: false }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router"],
          "vendor-query": ["@tanstack/react-query"],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
}));

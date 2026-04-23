import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    pool: "forks",
    setupFiles: [path.join(dir, "src/test/setup.ts")],
    testTimeout: 45_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.join(dir, "src"),
    },
  },
});

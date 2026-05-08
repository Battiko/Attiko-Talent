import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/index.ts"],
      thresholds: { lines: 70, functions: 70, branches: 70 },
    },
  },
  resolve: {
    alias: {
      "@attiko/shared": resolve(__dirname, "../../packages/shared/src"),
      "@attiko/db": resolve(__dirname, "../../packages/db/src"),
      "@attiko/scrapers": resolve(__dirname, "../../packages/scrapers/src"),
    },
  },
});

import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    passWithNoTests: true,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@attiko/shared": resolve(__dirname, "../../packages/shared/src"),
      "@attiko/db": resolve(__dirname, "../../packages/db/src"),
    },
  },
});

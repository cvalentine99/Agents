import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json", "json-summary", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: [
        "server/**/*.ts",
      ],
      exclude: [
        "server/**/*.test.ts",
        "server/**/*.spec.ts",
        "server/_core/**",
        "server/vite.ts",
        "node_modules/**",
      ],
      thresholds: {
        lines: 20,
        functions: 15,
        branches: 50,
        statements: 20,
      },
    },
  },
});

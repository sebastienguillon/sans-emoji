import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "https://test.atlassian.net/" } },
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "tooling/**/*.ts", "scripts/**/*.ts"],
      reporter: ["text", "html", "lcov", "json-summary"],
      thresholds: {
        perFile: true,
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    silent: true,
    exclude: ["tests/e2e/**", "node_modules/**"],
    environment: "jsdom",
    setupFiles: ["src/test.setup.ts"],
    server: {
      deps: {
        inline: [/@primer/],
      },
    },
    coverage: {
      enabled: true,
      cleanOnRerun: true,
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/**/*.gen.ts",
        "src/index.tsx",
        "src/main.ts",
        "src/preload.ts",
        "src/types.ts",
        "src/contexts/**",
        "src/routes/**",
        "src/backend/menu.ts",
        "src/frontend/components/**",
        "src/frontend/hooks/**",
      ],
    },
  },
});

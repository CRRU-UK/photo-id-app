import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
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
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.gen.ts", "src/backend/menu.ts"],
    },
  },
});

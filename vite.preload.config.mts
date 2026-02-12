import { sentryVitePlugin } from "@sentry/vite-plugin";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    sentryVitePlugin({
      telemetry: false,
    }),
  ],
  build: {
    rollupOptions: {
      external: ["@napi-rs/canvas"],
      output: {
        sourcemap: true,
      },
    },
    sourcemap: true,
  },
});

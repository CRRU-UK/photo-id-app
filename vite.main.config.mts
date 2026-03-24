import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  server: {
    watch: {
      ignored: ["**/coverage/**"],
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
    }),
  ],
  build: {
    rollupOptions: {
      external: ["@napi-rs/canvas"],
    },
    sourcemap: true,
  },
});

import { sentryVitePlugin } from "@sentry/vite-plugin";
/* eslint-disable @typescript-eslint/no-unsafe-call */
// @ts-expect-error Unable to set to bundler
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
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
    }),
  ],
  build: {
    rollupOptions: {
      external: ["sharp"],
    },
    sourcemap: true,
  },
});

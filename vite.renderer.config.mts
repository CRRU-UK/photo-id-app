import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
// @ts-expect-error Unable to set to bundler
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
  ],
  build: {
    rollupOptions: {
      external: ["sharp"],
    },
  },
});

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
      exclude: [
        "src/**/*.gen.ts",
        "src/backend/menu.ts",
        "src/index.tsx",
        "src/main.ts",
        "src/preload.ts",
        "src/types.ts",
        "src/contexts/**",
        "src/routes/**",
        "src/frontend/components/ImageEditor.tsx",
        "src/frontend/components/Stack.tsx",
        "src/frontend/components/Sidebar.tsx",
        "src/frontend/components/Selections.tsx",
        "src/frontend/components/RecentProjects.tsx",
        "src/frontend/components/MainSelection.tsx",
        "src/frontend/components/DiscardedSelection.tsx",
        "src/frontend/hooks/useImageEditor.ts",
        "src/frontend/hooks/imageEditor/useCanvasRenderer.ts",
        "src/frontend/hooks/imageEditor/useImageLoader.ts",
        "src/frontend/hooks/imageEditor/useZoomInteraction.ts",
        "src/frontend/hooks/imageEditor/usePanInteraction.ts",
      ],
    },
  },
});

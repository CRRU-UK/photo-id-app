import "@primer/primitives/dist/css/base/motion/motion.css";
import "@primer/primitives/dist/css/functional/size/border.css";
import "@primer/primitives/dist/css/functional/size/size.css";
import "@primer/primitives/dist/css/functional/themes/dark.css";
import "@primer/primitives/dist/css/functional/themes/light.css";
import "@primer/primitives/dist/css/primitives.css";

import { BaseStyles, ThemeProvider } from "@primer/react";
import { RouterProvider, createHashHistory, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";

import { routeTree } from "./routeTree.gen";

import "./styles.css";

const memoryHistory = createHashHistory();
const router = createRouter({ routeTree, history: memoryHistory });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const AppContent = () => {
  const { colorMode } = useSettings();

  return (
    <ThemeProvider colorMode={colorMode}>
      <BaseStyles>
        <RouterProvider router={router} />
      </BaseStyles>
    </ThemeProvider>
  );
};

const App = () => {
  return (
    <StrictMode>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </StrictMode>
  );
};

const container = document.getElementById("root") as HTMLDivElement;
const root = createRoot(container);

root.render(<App />);

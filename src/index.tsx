import type Project from "./models/Project";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { ThemeProvider, BaseStyles } from "@primer/react";
import { routeTree } from "./routeTree.gen";

import "@primer/primitives/dist/css/functional/size/border.css";
import "@primer/primitives/dist/css/functional/size/size.css";
import "@primer/primitives/dist/css/functional/themes/light.css";
import "@primer/primitives/dist/css/functional/themes/dark.css";

import "./styles.css";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
  interface HistoryState {
    project: Project;
  }
}

const container = document.getElementById("root") as HTMLDivElement;
const root = createRoot(container);

root.render(
  <StrictMode>
    <ThemeProvider colorMode="dark">
      <BaseStyles>
        <RouterProvider router={router} />
      </BaseStyles>
    </ThemeProvider>
  </StrictMode>,
);

import "@primer/primitives/dist/css/base/motion/motion.css";
import "@primer/primitives/dist/css/functional/size/border.css";
import "@primer/primitives/dist/css/functional/size/size.css";
import "@primer/primitives/dist/css/functional/themes/dark.css";
import "@primer/primitives/dist/css/functional/themes/light.css";
import "@primer/primitives/dist/css/primitives.css";

import { BaseStyles, ThemeProvider } from "@primer/react";
import {
  RouterProvider,
  createHashHistory,
  createRouter,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import RouteErrorFallback from "@/frontend/components/RouteErrorFallback";

import { ROUTES } from "./constants";
import { routeTree } from "./routeTree.gen";

import "./styles.css";

type RouteErrorComponentProps = {
  error: Error;
};

const DefaultRouteErrorComponent = ({ error }: RouteErrorComponentProps) => {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  let recovery: { label: string; onClick: () => void };
  if (pathname === ROUTES.PROJECT) {
    recovery = {
      label: "Back to start",
      onClick: () => {
        navigate({ to: ROUTES.INDEX });
      },
    };
  } else if (pathname === ROUTES.EDIT) {
    recovery = { label: "Close window", onClick: () => window.close() };
  } else {
    recovery = { label: "Reload page", onClick: () => window.location.reload() };
  }

  return (
    <div className="error-view">
      <RouteErrorFallback error={error} recovery={recovery} />
    </div>
  );
};

const memoryHistory = createHashHistory();
const router = createRouter({
  routeTree,
  history: memoryHistory,
  defaultErrorComponent: DefaultRouteErrorComponent,
});

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

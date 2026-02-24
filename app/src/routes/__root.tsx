import { createRootRoute, Outlet } from "@tanstack/react-router";

import { ProjectProvider } from "@/contexts/ProjectContext";

export const Route = createRootRoute({
  component: () => (
    <ProjectProvider>
      <Outlet />
    </ProjectProvider>
  ),
});

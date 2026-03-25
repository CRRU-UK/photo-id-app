import { useNavigate } from "@tanstack/react-router";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ROUTES } from "@/constants";
import { isEditWindow } from "@/helpers";
import ProjectModel from "@/models/Project";
import type { ProjectBody } from "@/types";

interface ProjectContextValue {
  project: ProjectModel | null;
  setProject: (project: ProjectModel | null) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider = ({ children }: ProjectProviderProps) => {
  const [project, setProject] = useState<ProjectModel | null>(null);

  /**
   * Defers navigation to the project route until after the project state has settled. Navigation
   * must happen in a separate effect so React can commit the new project state before the route
   * change triggers components that depend on it.
   */
  const pendingNavigateToProjectRef = useRef<boolean>(false);
  const navigate = useNavigate();
  const inEditWindow = isEditWindow(window.location.hash);

  /**
   * Ref shared between the `onLoadProject` listener and the `getCurrentProject` fetch so that if a
   * fresh project arrives via the listener while the initial fetch is still in flight, the fetch
   * result is discarded (the listener's data is more recent).
   */
  const projectLoadedViaListenerRef = useRef<boolean>(false);

  useEffect(() => {
    if (inEditWindow) {
      return;
    }

    const unsubscribeLoadProject = window.electronAPI.onLoadProject((data) => {
      projectLoadedViaListenerRef.current = true;
      setProject(new ProjectModel(data));
      pendingNavigateToProjectRef.current = true;
    });

    return () => {
      unsubscribeLoadProject();
    };
  }, [inEditWindow, setProject]);

  useEffect(() => {
    if (inEditWindow) {
      return;
    }

    let cancelled = false;

    void window.electronAPI.getCurrentProject().then((data: ProjectBody | null) => {
      if (cancelled || data === null || projectLoadedViaListenerRef.current) {
        return;
      }

      setProject(new ProjectModel(data));

      pendingNavigateToProjectRef.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, [inEditWindow]);

  useEffect(() => {
    if (project !== null && pendingNavigateToProjectRef.current) {
      pendingNavigateToProjectRef.current = false;

      void navigate({ to: ROUTES.PROJECT });
    }
  }, [project, navigate]);

  // Flush any pending debounced save before the window closes to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      project?.flushSave();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [project]);

  const value = useMemo<ProjectContextValue>(() => ({ project, setProject }), [project]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = (): ProjectContextValue => {
  const context = useContext(ProjectContext);

  if (context === null) {
    throw new Error("useProject must be used within a ProjectProvider");
  }

  return context;
};

export default ProjectContext;

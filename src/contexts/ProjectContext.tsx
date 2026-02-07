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

import ProjectModel from "@/models/Project";

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
  const pendingNavigateToProjectRef = useRef<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeLoadProject = window.electronAPI.onLoadProject((data) => {
      setProject(new ProjectModel(data));
      pendingNavigateToProjectRef.current = true;
    });

    return () => {
      unsubscribeLoadProject();
    };
  }, [setProject]);

  useEffect(() => {
    if (project !== null && pendingNavigateToProjectRef.current) {
      pendingNavigateToProjectRef.current = false;
      navigate({ to: "/project" });
    }
  }, [project, navigate]);

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

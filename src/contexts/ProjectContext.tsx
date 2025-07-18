import { createContext } from "react";

import ProjectModel from "@/models/Project";

const ProjectContext = createContext<ProjectModel>(new ProjectModel());

export default ProjectContext;

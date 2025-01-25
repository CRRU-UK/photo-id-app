import { useState, useEffect } from "react";
import { SplitPageLayout, Stack, Box, Text, BranchName } from "@primer/react";
import { FileDirectoryOpenFillIcon } from "@primer/octicons-react";

import type { PROJECT_JSON } from "../helpers/types";

import { SIDEBAR_WIDTHS } from "../helpers/constants";

import Project from "../models/Project";

import MainSelection from "./modules/MainSelection";
import Placeholder from "./modules/Placeholder";

// import mockedData from "../../data/mock.json";
// const mockedProject = new Project();

const App = () => {
  const [project, setProject] = useState<Project | null>(null);

  const handleopenProjectFolder = () => window.electronAPI.openProjectFolder();
  const handleopenProjectFile = () => window.electronAPI.openProjectFile();

  useEffect(() => {
    window.electronAPI.onLoadProject((data) => {
      const project = new Project().loadFromJSON(data);
      setProject(project);
    });
  }, []);

  return (
    <SplitPageLayout sx={{ backgroundColor: "var(--bgColor-default)", height: "100vh" }}>
      <SplitPageLayout.Pane
        position="start"
        width={{
          min: `${SIDEBAR_WIDTHS.MIN}px`,
          max: `${SIDEBAR_WIDTHS.MAX}px`,
          default: `${SIDEBAR_WIDTHS.DEFAULT}px`,
        }}
        sx={{ height: "100vh" }}
        resizable
      >
        <Stack
          direction="vertical"
          align="start"
          justify="space-between"
          style={{ height: "100%" }}
        >
          <MainSelection photos={project?.photos || []} />

          {project?.directory && (
            <Box sx={{ marginTop: "auto" }}>
              <Text
                size="small"
                weight="light"
                sx={{ display: "block", color: "var(--fgColor-muted)" }}
              >
                <FileDirectoryOpenFillIcon size="small" />
                Currently viewing:
              </Text>
              <BranchName>{project.directory}</BranchName>
            </Box>
          )}
        </Stack>
      </SplitPageLayout.Pane>

      <SplitPageLayout.Content sx={{ minHeight: "100vh", backgroundColor: "var(--bgColor-inset)" }}>
        {!project && (
          <Placeholder
            openProjectFolderCallback={handleopenProjectFolder}
            openProjectFileCallback={handleopenProjectFile}
          />
        )}
      </SplitPageLayout.Content>
    </SplitPageLayout>
  );
};

export default App;

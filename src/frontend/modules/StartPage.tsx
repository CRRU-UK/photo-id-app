import type { RECENT_PROJECTS } from "src/helpers/types";

import { useState, useEffect } from "react";
import {
  PageLayout,
  Box,
  Heading,
  Text,
  BranchName,
  Stack,
  Button,
  Timeline,
  Link,
  RelativeTime,
} from "@primer/react";
import { FileDirectoryIcon, FileIcon, HistoryIcon } from "@primer/octicons-react";

import { version } from "../../../package.json";

import logo from "../img/logo.png";

import { PROJECT_FILE_NAME } from "../../helpers/constants";

interface RecentProjectsProps {
  projects: RECENT_PROJECTS;
}

const RecentProjects = ({ projects }: RecentProjectsProps) => {
  const handleOpenProjectFile = (path: string) => window.electronAPI.openRecentProject(path);

  return (
    <Timeline clipSidebar style={{ marginTop: "var(--stack-gap-spacious)" }}>
      {projects.map((item) => (
        <Timeline.Item key={item.path}>
          <Timeline.Badge>
            <HistoryIcon />
          </Timeline.Badge>
          <Timeline.Body>
            <Link
              href="#"
              onClick={() => handleOpenProjectFile(item.path)}
              sx={{
                fontWeight: "bold",
              }}
            >
              {item.path}
            </Link>
            <RelativeTime datetime={item.lastOpened} sx={{ ml: 2 }} />
          </Timeline.Body>
        </Timeline.Item>
      ))}
    </Timeline>
  );
};
const StartPage = () => {
  const [recentProjects, setRecentProjects] = useState<RECENT_PROJECTS>([]);

  const handleOpenProjectFolder = () => window.electronAPI.openProjectFolder();
  const handleOpenFilePrompt = () => window.electronAPI.openProjectFile();

  useEffect(() => {
    window.electronAPI.getRecentProjects();
    window.electronAPI.onLoadRecentProjects((data) => setRecentProjects(data));
  }, []);

  return (
    <PageLayout
      sx={{
        backgroundColor: "var(--bgColor-default)",
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <PageLayout.Content>
        <Stack
          gap="spacious"
          direction="horizontal"
          align="center"
          justify="start"
          style={{ marginBottom: "var(--stack-gap-spacious)" }}
        >
          <img
            style={{
              display: "block",
              width: "100px",
              height: "auto",
            }}
            src={logo}
            alt=""
          />

          <Box>
            <Heading variant="large">CRRU Photo ID App</Heading>
            <BranchName as="span">v{version}</BranchName>
          </Box>
        </Stack>

        <Text style={{ marginBottom: "var(--stack-gap-spacious)" }}>
          Open a project folder or a project file (<code>{PROJECT_FILE_NAME}</code>) to get started.
        </Text>

        <Stack direction="horizontal" style={{ marginBottom: "var(--stack-gap-spacious)" }}>
          <Button
            onClick={() => handleOpenProjectFolder()}
            variant="default"
            size="large"
            block
            leadingVisual={FileDirectoryIcon}
            sx={{ mt: 4 }}
          >
            Open Project Folder
          </Button>

          <Button
            onClick={() => handleOpenFilePrompt()}
            variant="default"
            size="large"
            block
            leadingVisual={FileIcon}
            sx={{ mt: 4 }}
          >
            Open Project File
          </Button>
        </Stack>

        {recentProjects.length > 0 && (
          <>
            <Text>Or open a recent project:</Text>
            <RecentProjects projects={recentProjects} />
          </>
        )}
      </PageLayout.Content>
    </PageLayout>
  );
};

export default StartPage;

import type { RecentProject } from "@/types";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  PageLayout,
  Heading,
  Text,
  BranchName,
  Stack as PrimerStack,
  Button,
  Timeline,
  Link,
  RelativeTime,
} from "@primer/react";
import { FileDirectoryIcon, FileIcon, HistoryIcon } from "@primer/octicons-react";

import { version } from "../../package.json";

import Project from "@/models/Project";

import logo from "@/frontend/img/logo.png";

import { PROJECT_FILE_NAME } from "@/constants";

interface RecentProjectsProps {
  projects: RecentProject[];
}

const RecentProjectsList = ({ projects }: RecentProjectsProps) => {
  const handleOpenProjectFile = (path: string) => window.electronAPI.openRecentProject(path);

  return (
    <Timeline style={{ marginTop: "var(--stack-gap-spacious)" }}>
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
              {item.name}
            </Link>
            <RelativeTime datetime={item.lastOpened} sx={{ ml: 2 }} />
            <Text
              weight="semibold"
              size="small"
              style={{ display: "block", fontFamily: "var(--fontStack-monospace)" }}
            >
              {item.path}
            </Text>
          </Timeline.Body>
        </Timeline.Item>
      ))}
    </Timeline>
  );
};

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.electronAPI.onLoadProject((data) => {
      const project = new Project().loadFromJSON(data);

      return navigate({
        to: "/project",
        state: { project },
      });
    });
  });

  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

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
        <PrimerStack
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

          <div>
            <Heading variant="large">Photo ID</Heading>
            <BranchName as="span">v{version}</BranchName>
          </div>
        </PrimerStack>

        <Text style={{ marginBottom: "var(--stack-gap-spacious)" }}>
          Open a project folder or a project file (<code>{PROJECT_FILE_NAME}</code>) to get started.
        </Text>

        <PrimerStack direction="horizontal" style={{ marginBottom: "var(--stack-gap-spacious)" }}>
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
        </PrimerStack>

        {recentProjects.length > 0 && (
          <>
            <Text>Or open a recent project:</Text>
            <RecentProjectsList projects={recentProjects} />
          </>
        )}
      </PageLayout.Content>
    </PageLayout>
  );
};

export const Route = createFileRoute("/")({
  component: Index,
});

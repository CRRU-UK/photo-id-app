import type { LoadingData } from "@/types";

import { FileDirectoryIcon, FileIcon } from "@primer/octicons-react";
import { BranchName, Button, Heading, PageLayout, Stack as PrimerStack, Text } from "@primer/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PROJECT_FILE_NAME, PROJECT_STORAGE_NAME } from "@/constants";
import LoadingOverlay from "@/frontend/components/LoadingOverlay";
import RecentProjects from "@/frontend/components/RecentProjects";
import logo from "@/frontend/img/logo.png";

import { version } from "../../package.json";

const IndexPage = () => {
  const [loading, setLoading] = useState<LoadingData>({ show: false });

  const navigate = useNavigate();

  useEffect(() => {
    window.electronAPI.onLoading((data) => setLoading(data));
    window.electronAPI.onLoadProject((data) => {
      localStorage.setItem(PROJECT_STORAGE_NAME, JSON.stringify(data));
      return navigate({ to: "/project" });
    });
  }, [navigate]);

  const handleOpenProjectFolder = () => window.electronAPI.openProjectFolder();

  const handleOpenFilePrompt = () => window.electronAPI.openProjectFile();

  return (
    <>
      <LoadingOverlay data={loading} />

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
              src={logo as string}
              alt=""
            />

            <div>
              <Heading variant="large">Photo ID</Heading>
              <BranchName as="span">v{version}</BranchName>
            </div>
          </PrimerStack>

          <Text style={{ marginBottom: "var(--stack-gap-spacious)" }}>
            Open a project folder or a project file (<code>{PROJECT_FILE_NAME}</code>) to get
            started.
          </Text>

          <PrimerStack direction="horizontal" style={{ marginBottom: "var(--stack-gap-spacious)" }}>
            <Button
              onClick={() => handleOpenProjectFolder()}
              variant="primary"
              size="large"
              block
              leadingVisual={FileDirectoryIcon}
              sx={{ mt: 4 }}
            >
              Start New Project
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

          <RecentProjects />
        </PageLayout.Content>
      </PageLayout>
    </>
  );
};

export const Route = createFileRoute("/")({
  component: IndexPage,
});

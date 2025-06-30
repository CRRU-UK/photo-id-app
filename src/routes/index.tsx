import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageLayout, Heading, Text, BranchName, Stack as PrimerStack, Button } from "@primer/react";
import { FileDirectoryIcon, FileIcon } from "@primer/octicons-react";

import { version } from "../../package.json";

import LoadingOverlay, { type LoadingOverlayProps } from "@/frontend/modules/LoadingOverlay";
import RecentProjects from "@/frontend/modules/RecentProjects";
import logo from "@/frontend/img/logo.png";

import { PROJECT_FILE_NAME, PROJECT_STORAGE_NAME } from "@/constants";

const IndexPage = () => {
  const [loading, setLoading] = useState<LoadingOverlayProps>({ show: false });

  const navigate = useNavigate();
  useEffect(() => {
    window.electronAPI.onLoading((show, text) => setLoading({ show, text }));

    window.electronAPI.onLoadProject((data) => {
      localStorage.setItem(PROJECT_STORAGE_NAME, JSON.stringify(data));
      return navigate({ to: "/project" });
    });
  });

  const handleOpenProjectFolder = () => {
    window.electronAPI.openProjectFolder();
  };

  const handleOpenFilePrompt = () => {
    window.electronAPI.openProjectFile();
  };

  return (
    <>
      <LoadingOverlay show={loading.show} text={loading?.text} />

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
            Open a project folder or a project file (<code>{PROJECT_FILE_NAME}</code>) to get
            started.
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

          <RecentProjects />
        </PageLayout.Content>
      </PageLayout>
    </>
  );
};

export const Route = createFileRoute("/")({
  component: IndexPage,
});

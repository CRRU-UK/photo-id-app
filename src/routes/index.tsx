import type { LoadingData } from "@/types";

import { BookIcon, FileDirectoryIcon, FileIcon, RepoIcon } from "@primer/octicons-react";
import { BranchName, Button, Heading, Link, Stack as PrimerStack, Text } from "@primer/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PROJECT_FILE_NAME, PROJECT_STORAGE_NAME } from "@/constants";
import LoadingOverlay from "@/frontend/components/LoadingOverlay";
import RecentProjects from "@/frontend/components/RecentProjects";

import icon from "@/frontend/img/icon.svg";
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

      <div className="index">
        <PrimerStack direction="vertical" align="stretch" gap="condensed" className="content">
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
              src={icon}
              alt=""
            />

            <div>
              <PrimerStack direction="horizontal" align="center" justify="start" gap="normal">
                <Heading variant="large">Photo ID</Heading>
                <BranchName as="span">v{version}</BranchName>
              </PrimerStack>

              <PrimerStack direction="horizontal" align="center">
                <Link
                  href="#"
                  onClick={() => window.electronAPI.openExternalLink("user-guide")}
                  inline
                  muted
                  style={{ fontSize: "var(--text-body-size-medium)" }}
                >
                  <BookIcon size={16} /> <Text>User Guide</Text>
                </Link>
                <Link
                  href="#"
                  onClick={() => window.electronAPI.openExternalLink("changelog")}
                  inline
                  muted
                  style={{ fontSize: "var(--text-body-size-medium)" }}
                >
                  <RepoIcon size={16} /> <Text>What&apos;s New</Text>
                </Link>
              </PrimerStack>
            </div>
          </PrimerStack>

          <Text>
            Open a project folder or a project file (<code>{PROJECT_FILE_NAME}</code>) to get
            started.
          </Text>

          <PrimerStack
            direction="horizontal"
            style={{
              marginTop: "var(--stack-gap-spacious)",
              marginBottom: "var(--stack-gap-spacious)",
            }}
          >
            <Button
              onClick={() => handleOpenProjectFolder()}
              variant="primary"
              size="large"
              block
              leadingVisual={FileDirectoryIcon}
            >
              Start New Project
            </Button>

            <Button
              onClick={() => handleOpenFilePrompt()}
              variant="default"
              size="large"
              block
              leadingVisual={FileIcon}
            >
              Open Project File
            </Button>
          </PrimerStack>

          <RecentProjects />
        </PrimerStack>

        <PrimerStack
          className="footer"
          align="center"
          justify="center"
          direction="horizontal"
          padding="spacious"
        >
          <img
            style={{
              display: "block",
              width: "32px",
              height: "32px",
            }}
            src={logo as string}
            alt=""
          />
          <Text size="small">
            By{" "}
            <Link
              href="#"
              onClick={() => window.electronAPI.openExternalLink("website")}
              muted
              style={{ textDecoration: "underline" }}
            >
              Cetacean Research &amp; Rescue Unit
            </Link>
          </Text>
        </PrimerStack>
      </div>
    </>
  );
};

export const Route = createFileRoute("/")({
  component: IndexPage,
});

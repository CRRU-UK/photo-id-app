import type { LoadingData } from "@/types";

import { BookIcon, FileDirectoryIcon, FileIcon, GearIcon, RepoIcon } from "@primer/octicons-react";
import {
  BranchName,
  Button,
  Heading,
  IconButton,
  Link,
  Stack as PrimerStack,
  Text,
} from "@primer/react";
import { KeybindingHint } from "@primer/react/experimental";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import {
  GLOBAL_KEYBOARD_HINTS,
  PROJECT_FILE_NAME,
  PROJECT_KEYBOARD_HINTS,
  ROUTES,
} from "@/constants";
import LoadingOverlay from "@/frontend/components/LoadingOverlay";
import RecentProjects from "@/frontend/components/RecentProjects";
import Settings from "@/frontend/components/Settings";

import iconDark from "@/frontend/img/icon-dark.svg";
import iconLight from "@/frontend/img/icon-light.svg";
import logo from "@/frontend/img/logo.png";

import { version } from "../../package.json";

const IndexPage = () => {
  const [loading, setLoading] = useState<LoadingData>({ show: false });
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const unsubscribeLoading = window.electronAPI.onLoading((data) => setLoading(data));

    return () => {
      unsubscribeLoading();
    };
  }, []);

  const handleOpenProjectFolder = () => window.electronAPI.openProjectFolder();

  const handleOpenFilePrompt = () => window.electronAPI.openProjectFile();

  return (
    <>
      <LoadingOverlay data={loading} />

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenRequest={() => setSettingsOpen(true)}
        returnFocusRef={settingsButtonRef}
      />

      <div className="index">
        <PrimerStack direction="vertical" align="stretch" gap="condensed" className="content">
          <PrimerStack
            gap="spacious"
            direction="horizontal"
            align="center"
            justify="start"
            style={{ marginBottom: "var(--stack-gap-spacious)" }}
          >
            <div>
              <img className="theme-icon theme-icon-light" src={iconLight} alt="" />
              <img className="theme-icon theme-icon-dark" src={iconDark} alt="" />
            </div>

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

            <IconButton
              ref={settingsButtonRef}
              icon={GearIcon}
              size="large"
              aria-label="Settings"
              keybindingHint={GLOBAL_KEYBOARD_HINTS.OPEN_SETTINGS}
              onClick={() => setSettingsOpen(!settingsOpen)}
              style={{ marginLeft: "auto" }}
            />
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
              trailingVisual={<KeybindingHint keys={PROJECT_KEYBOARD_HINTS.OPEN_PROJECT_FOLDER} />}
            >
              Start New Project
            </Button>

            <Button
              onClick={() => handleOpenFilePrompt()}
              variant="default"
              size="large"
              block
              leadingVisual={FileIcon}
              trailingVisual={<KeybindingHint keys={PROJECT_KEYBOARD_HINTS.OPEN_PROJECT_FILE} />}
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

export const Route = createFileRoute(ROUTES.INDEX)({
  component: IndexPage,
});

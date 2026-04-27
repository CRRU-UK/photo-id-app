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
import { useCallback, useEffect, useRef, useState } from "react";
import { GLOBAL_KEYBOARD_HINTS, PROJECT_FILE_NAME, PROJECT_KEYBOARD_HINTS } from "@/constants";
import LoadingOverlay from "@/frontend/components/LoadingOverlay";
import RecentProjects from "@/frontend/components/RecentProjects";
import SettingsOverlay from "@/frontend/components/SettingsOverlay";
import iconDark from "@/frontend/img/icon-dark.svg";
import iconLight from "@/frontend/img/icon-light.svg";
import logo from "@/frontend/img/logo.png";
import type { LoadingData } from "@/types";

import { version } from "../../package.json";

const IndexPage = () => {
  const [loading, setLoading] = useState<LoadingData>({ show: false });
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const handleCloseShortcut = useCallback(
    (event: KeyboardEvent) => {
      const modifierKey = event.ctrlKey || event.metaKey;
      if (!modifierKey || event.key !== "w") {
        return;
      }

      if (settingsOpen) {
        event.preventDefault();
        setSettingsOpen(false);
      }
    },
    [settingsOpen],
  );

  useEffect(() => {
    const unsubscribeLoading = window.electronAPI.onLoading((data) => setLoading(data));

    document.addEventListener("keydown", handleCloseShortcut);

    return () => {
      unsubscribeLoading();
      document.removeEventListener("keydown", handleCloseShortcut);
    };
  }, [handleCloseShortcut]);

  const handleOpenProjectFolder = () => window.electronAPI.openProjectFolder();

  const handleOpenFilePrompt = () => window.electronAPI.openProjectFile();

  return (
    <>
      <LoadingOverlay data={loading} />

      <SettingsOverlay
        onClose={() => setSettingsOpen(false)}
        onOpenRequest={() => setSettingsOpen(true)}
        open={settingsOpen}
        returnFocusRef={settingsButtonRef}
      />

      <div className="index">
        <PrimerStack align="stretch" className="content" direction="vertical" gap="condensed">
          <PrimerStack
            align="center"
            direction="horizontal"
            gap="spacious"
            justify="start"
            style={{ marginBottom: "var(--stack-gap-spacious)" }}
          >
            <div>
              <img alt="" className="theme-icon theme-icon-light" src={iconLight} />
              <img alt="" className="theme-icon theme-icon-dark" src={iconDark} />
            </div>

            <div>
              <PrimerStack align="center" direction="horizontal" gap="normal" justify="start">
                <Heading variant="large">Photo ID</Heading>
                <BranchName as="span">v{version}</BranchName>
              </PrimerStack>

              <PrimerStack align="center" direction="horizontal">
                <Link
                  href="#"
                  inline
                  muted
                  onClick={() => window.electronAPI.openExternalLink("user-guide")}
                  style={{ fontSize: "var(--text-body-size-medium)" }}
                >
                  <BookIcon size={16} /> <Text>User Guide</Text>
                </Link>
                <Link
                  href="#"
                  inline
                  muted
                  onClick={() => window.electronAPI.openExternalLink("changelog")}
                  style={{ fontSize: "var(--text-body-size-medium)" }}
                >
                  <RepoIcon size={16} /> <Text>What&apos;s New</Text>
                </Link>
              </PrimerStack>
            </div>

            <IconButton
              aria-label="Settings"
              icon={GearIcon}
              keybindingHint={GLOBAL_KEYBOARD_HINTS.OPEN_SETTINGS}
              onClick={() => setSettingsOpen(!settingsOpen)}
              ref={settingsButtonRef}
              size="large"
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
              block
              leadingVisual={FileDirectoryIcon}
              onClick={() => handleOpenProjectFolder()}
              size="large"
              trailingVisual={<KeybindingHint keys={PROJECT_KEYBOARD_HINTS.OPEN_PROJECT_FOLDER} />}
              variant="primary"
            >
              Start New Project
            </Button>

            <Button
              block
              leadingVisual={FileIcon}
              onClick={() => handleOpenFilePrompt()}
              size="large"
              trailingVisual={<KeybindingHint keys={PROJECT_KEYBOARD_HINTS.OPEN_PROJECT_FILE} />}
              variant="default"
            >
              Open Project File
            </Button>
          </PrimerStack>

          <RecentProjects />
        </PrimerStack>

        <PrimerStack
          align="center"
          className="footer"
          direction="horizontal"
          justify="center"
          padding="spacious"
        >
          <img
            alt=""
            src={logo as string}
            style={{
              display: "block",
              width: "32px",
              height: "32px",
            }}
          />
          <Text size="small">
            By{" "}
            <Link
              href="#"
              muted
              onClick={() => window.electronAPI.openExternalLink("website")}
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

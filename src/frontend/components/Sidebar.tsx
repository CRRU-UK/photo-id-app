import { AiModelIcon, FileMovedIcon, ReplyIcon, ThreeBarsIcon } from "@primer/octicons-react";
import {
  ActionList,
  ActionMenu,
  IconButton,
  Stack as PrimerStack,
  Text,
  Truncate,
} from "@primer/react";
import { useNavigate } from "@tanstack/react-router";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";

import { PROJECT_KEYBOARD_HINTS, ROUTES } from "@/constants";
import { useProject } from "@/contexts/ProjectContext";
import { useSettings } from "@/contexts/SettingsContext";
import DiscardedSelection from "@/frontend/components/DiscardedSelection";
import MainSelection from "@/frontend/components/MainSelection";

const Sidebar = observer(() => {
  const { project, setProject } = useProject();
  const { settings } = useSettings();

  const [actionsOpen, setActionsOpen] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  const navigate = useNavigate();

  const handleCloseProject = useCallback(() => {
    setProject(null);
    window.electronAPI.closeProject();
    navigate({ to: ROUTES.INDEX });
  }, [navigate, setProject]);

  if (project === null) {
    return null;
  }

  const handleExport = async () => {
    setExporting(true);

    await project.exportMatches();

    setActionsOpen(false);
    setExporting(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifierKey = event.ctrlKey || event.metaKey;
      if (modifierKey && event.key === "w") {
        event.preventDefault();
        handleCloseProject();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleCloseProject]);

  return (
    <div className="sidebar">
      <PrimerStack
        direction="vertical"
        align="start"
        justify="space-between"
        padding="normal"
        style={{ minHeight: "100%" }}
      >
        <MainSelection collection={project.unassigned} total={project.allPhotos.size} />
        <DiscardedSelection collection={project.discarded} />

        <PrimerStack
          direction="horizontal"
          align="center"
          justify="space-between"
          gap="condensed"
          style={{ marginTop: "auto", width: "100%" }}
        >
          <IconButton
            icon={ReplyIcon}
            variant="invisible"
            size="large"
            aria-label="Close project"
            onClick={() => handleCloseProject()}
            keybindingHint={PROJECT_KEYBOARD_HINTS.CLOSE_PROJECT}
          />

          {settings?.ml?.name && (
            <PrimerStack
              direction="horizontal"
              align="center"
              justify="start"
              gap="condensed"
              className="model-selected"
            >
              <AiModelIcon size={12} />
              <Text size="small" weight="semibold">
                <Truncate title={settings.ml.name} maxWidth="120px" inline>
                  {settings.ml.name}
                </Truncate>
              </Text>
            </PrimerStack>
          )}

          <ActionMenu open={actionsOpen} onOpenChange={setActionsOpen}>
            <ActionMenu.Button leadingVisual={ThreeBarsIcon} size="large">
              Actions
            </ActionMenu.Button>
            <ActionMenu.Overlay>
              <ActionList>
                <ActionList.Item
                  disabled={exporting}
                  loading={exporting}
                  onClick={() => handleExport()}
                >
                  <ActionList.LeadingVisual>
                    <FileMovedIcon />
                  </ActionList.LeadingVisual>
                  {exporting ? "Exporting..." : "Export matches"}
                </ActionList.Item>
              </ActionList>
            </ActionMenu.Overlay>
          </ActionMenu>
        </PrimerStack>
      </PrimerStack>
    </div>
  );
});

export default Sidebar;

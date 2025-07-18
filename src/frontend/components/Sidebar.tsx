import { FileMovedIcon, ReplyIcon, ThreeBarsIcon } from "@primer/octicons-react";
import { ActionList, ActionMenu, IconButton, Stack as PrimerStack } from "@primer/react";
import { useNavigate } from "@tanstack/react-router";
import { useContext, useState } from "react";

import ProjectContext from "@/contexts/ProjectContext";
import DiscardedSelection from "@/frontend/components/DiscardedSelection";
import MainSelection from "@/frontend/components/MainSelection";

const Sidebar = () => {
  const project = useContext(ProjectContext);

  const [actionsOpen, setActionsOpen] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  const navigate = useNavigate();

  const handleClose = () => navigate({ to: "/" });

  const handleExport = async () => {
    setExporting(true);

    await project.exportMatches();

    setActionsOpen(false);
    setExporting(false);
  };

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
          align="start"
          justify="space-between"
          style={{ marginTop: "auto", width: "100%" }}
        >
          <IconButton
            icon={ReplyIcon}
            variant="invisible"
            aria-label="Close project"
            onClick={() => handleClose()}
          />

          <ActionMenu open={actionsOpen} onOpenChange={setActionsOpen}>
            <ActionMenu.Button leadingVisual={ThreeBarsIcon}>Actions</ActionMenu.Button>
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
};

export default Sidebar;

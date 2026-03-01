import {
  AiModelIcon,
  FileMovedIcon,
  ReplyIcon,
  ThreeBarsIcon,
  TriangleDownIcon,
} from "@primer/octicons-react";
import type { SelectPanelItemInput as ItemInput } from "@primer/react";
import {
  ActionList,
  ActionMenu,
  Button,
  FormControl,
  IconButton,
  Stack as PrimerStack,
  SelectPanel,
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
  const { settings: contextSettings, updateSettings } = useSettings();

  const [actionsOpen, setActionsOpen] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [modelPanelOpen, setModelPanelOpen] = useState<boolean>(false);
  const [modelFilter, setModelFilter] = useState<string>("");

  const navigate = useNavigate();

  const handleCloseProject = useCallback(() => {
    setProject(null);
    window.electronAPI.closeProject();
    navigate({ to: ROUTES.INDEX });
  }, [navigate, setProject]);

  if (project === null) {
    return null;
  }

  const mlModels = contextSettings?.mlModels ?? [];
  const selectedModelId = contextSettings?.selectedModelId ?? null;
  const selectedModel = mlModels.find((m) => m.id === selectedModelId) ?? null;

  type ModelItem = ItemInput & { id: string; text: string };

  const modelItems: ModelItem[] = mlModels.map((model) => ({
    id: model.id,
    text: model.name,
    description: model.endpoint,
    descriptionVariant: "block" as const,
  }));

  const filteredItems = modelItems.filter((item) =>
    item.text.toLowerCase().includes(modelFilter.toLowerCase()),
  );

  const selectedItem = modelItems.find((item) => item.id === selectedModelId) ?? undefined;

  const handleModelChange = async (item: ItemInput | undefined) => {
    if (!contextSettings) {
      return;
    }

    const itemId = item !== undefined ? (item as ModelItem).id : undefined;

    try {
      await updateSettings({ ...contextSettings, selectedModelId: itemId ?? null });
    } catch (error) {
      console.error("Error updating selected model:", error);
    }
  };

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

        <FormControl style={{ marginLeft: "auto", marginTop: "auto" }}>
          <SelectPanel
            title="Analysis ML Model"
            subtitle="Select which ML model to use for stack analysis."
            placeholderText="Filter models"
            open={modelPanelOpen}
            onOpenChange={setModelPanelOpen}
            items={filteredItems}
            selected={selectedItem}
            onSelectedChange={(item: ItemInput | undefined) => void handleModelChange(item)}
            onFilterChange={setModelFilter}
            message={
              modelItems.length === 0
                ? {
                    title: "No models configured",
                    variant: "empty",
                    body: "Add a model in settings.",
                  }
                : undefined
            }
            renderAnchor={(anchorProps) => (
              <Button
                {...anchorProps}
                variant={selectedModel ? "primary" : "default"}
                leadingVisual={AiModelIcon}
                trailingAction={TriangleDownIcon}
              >
                {selectedModel?.name ?? "Select ML model"}
              </Button>
            )}
          />
        </FormControl>

        <PrimerStack
          direction="horizontal"
          align="center"
          justify="space-between"
          gap="condensed"
          style={{ width: "100%" }}
        >
          <IconButton
            icon={ReplyIcon}
            variant="invisible"
            size="large"
            aria-label="Close project"
            onClick={() => handleCloseProject()}
            keybindingHint={PROJECT_KEYBOARD_HINTS.CLOSE_PROJECT}
          />

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

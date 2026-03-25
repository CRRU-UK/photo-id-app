import {
  AiModelIcon,
  DatabaseIcon,
  FileDiffIcon,
  FileIcon,
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
import { useCallback, useEffect, useMemo, useState } from "react";

import { PROJECT_KEYBOARD_HINTS, ROUTES } from "@/constants";
import { useProject } from "@/contexts/ProjectContext";
import { useSettings } from "@/contexts/SettingsContext";
import DiscardedSelection from "@/frontend/components/DiscardedSelection";
import MainSelection from "@/frontend/components/MainSelection";
import type { ExportTypes } from "@/types";

const Sidebar = observer(() => {
  const { project, setProject } = useProject();
  const { settings: contextSettings, updateSettings } = useSettings();

  const [actionsOpen, setActionsOpen] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [modelPanelOpen, setModelPanelOpen] = useState<boolean>(false);
  const [modelFilter, setModelFilter] = useState<string>("");

  const navigate = useNavigate();

  const handleCloseProject = useCallback(() => {
    project?.flushSave();
    setProject(null);

    window.electronAPI.closeProject();

    void navigate({ to: ROUTES.INDEX });
  }, [project, navigate, setProject]);

  type ModelItem = ItemInput & { id: string; text: string };

  const mlModels = useMemo(() => contextSettings?.mlModels ?? [], [contextSettings?.mlModels]);
  const selectedModelId = contextSettings?.selectedModelId ?? null;
  const selectedModel = mlModels.find(({ id }) => id === selectedModelId) ?? null;

  const modelItems = useMemo<ModelItem[]>(
    () =>
      mlModels.map((model) => ({
        id: model.id,
        text: model.name,
        description: model.endpoint,
        descriptionVariant: "block" as const,
      })),
    [mlModels],
  );

  const filteredItems = useMemo(
    () =>
      modelItems.filter(
        (item) =>
          item.id === selectedModelId ||
          item.text.toLowerCase().includes(modelFilter.toLowerCase()),
      ),
    [modelItems, modelFilter, selectedModelId],
  );

  const selectedItem = modelItems.find(({ id }) => id === selectedModelId) ?? undefined;

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

  if (project === null) {
    return null;
  }

  const handleModelChange = async (item: ItemInput | undefined) => {
    if (!contextSettings) {
      return;
    }

    const itemId = item ? (item as ModelItem).id : null;

    try {
      await updateSettings({ ...contextSettings, selectedModelId: itemId });
    } catch (error) {
      console.error("Error updating selected model:", error);
    }
  };

  const handleExport = async (type: ExportTypes) => {
    setExporting(true);

    try {
      await project.exportMatches(type);
    } catch (error) {
      console.error("Failed to export matches:", error);
    } finally {
      setActionsOpen(false);
      setExporting(false);
    }
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

        <FormControl style={{ marginLeft: "auto", marginTop: "auto" }}>
          <FormControl.Label visuallyHidden>Select analysis ML model</FormControl.Label>
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
                {selectedModel?.name ?? "ML Model"}
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
                <ActionList.Group>
                  <ActionList.GroupHeading>Photos</ActionList.GroupHeading>

                  <ActionList.Item
                    disabled={exporting}
                    loading={exporting}
                    onClick={() => handleExport("edited")}
                  >
                    <ActionList.LeadingVisual>
                      <FileDiffIcon />
                    </ActionList.LeadingVisual>
                    Export matches
                    <ActionList.Description variant="block">(with edits)</ActionList.Description>
                  </ActionList.Item>
                  <ActionList.Item
                    disabled={exporting}
                    loading={exporting}
                    onClick={() => handleExport("unedited")}
                  >
                    <ActionList.LeadingVisual>
                      <FileIcon />
                    </ActionList.LeadingVisual>
                    Export matches
                    <ActionList.Description variant="block">(without edits)</ActionList.Description>
                  </ActionList.Item>
                </ActionList.Group>

                <ActionList.Group>
                  <ActionList.GroupHeading>Data</ActionList.GroupHeading>

                  <ActionList.Item
                    disabled={exporting}
                    loading={exporting}
                    onClick={() => handleExport("csv")}
                  >
                    <ActionList.LeadingVisual>
                      <DatabaseIcon />
                    </ActionList.LeadingVisual>
                    Export CSV
                  </ActionList.Item>
                </ActionList.Group>
              </ActionList>
            </ActionMenu.Overlay>
          </ActionMenu>
        </PrimerStack>
      </PrimerStack>
    </div>
  );
});

export default Sidebar;

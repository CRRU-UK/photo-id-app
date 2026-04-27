import {
  AiModelIcon,
  DatabaseIcon,
  FileDiffIcon,
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
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";

import { PROJECT_KEYBOARD_HINTS } from "@/constants";
import { useProject } from "@/contexts/ProjectContext";
import { useSettings } from "@/contexts/SettingsContext";
import DiscardedSelection from "@/frontend/components/DiscardedSelection";
import MainSelection from "@/frontend/components/MainSelection";
import type { ExportTypes } from "@/types";

interface SidebarProps {
  onCloseProject: () => void;
}

const Sidebar = observer(({ onCloseProject }: SidebarProps) => {
  const { project } = useProject();
  const { settings: contextSettings, updateSettings } = useSettings();

  const [actionsOpen, setActionsOpen] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [modelPanelOpen, setModelPanelOpen] = useState<boolean>(false);
  const [modelFilter, setModelFilter] = useState<string>("");

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
    <div className="sidebar" data-testid="sidebar">
      <PrimerStack
        align="start"
        direction="vertical"
        justify="space-between"
        style={{
          gap: "var(--app-spacing)",
          padding: "var(--app-spacing)",
          minHeight: "100%",
        }}
      >
        <MainSelection collection={project.unassigned} total={project.photoCount} />
        <DiscardedSelection collection={project.discarded} />

        <FormControl style={{ marginLeft: "auto", marginTop: "auto" }}>
          <FormControl.Label visuallyHidden>Select analysis ML model</FormControl.Label>
          <SelectPanel
            items={filteredItems}
            message={
              modelItems.length === 0
                ? {
                    title: "No models configured",
                    variant: "empty",
                    body: "Add a model in settings.",
                  }
                : undefined
            }
            onFilterChange={setModelFilter}
            onOpenChange={setModelPanelOpen}
            onSelectedChange={(item: ItemInput | undefined) => void handleModelChange(item)}
            open={modelPanelOpen}
            placeholderText="Filter models"
            renderAnchor={(anchorProps) => (
              <Button
                {...anchorProps}
                leadingVisual={AiModelIcon}
                trailingAction={TriangleDownIcon}
                variant={selectedModel ? "primary" : "default"}
              >
                {selectedModel?.name ?? "ML Model"}
              </Button>
            )}
            selected={selectedItem}
            subtitle="Select which ML model to use for stack analysis."
            title="Analysis ML Model"
          />
        </FormControl>

        <PrimerStack
          align="center"
          direction="horizontal"
          gap="condensed"
          justify="space-between"
          style={{ width: "100%" }}
        >
          <IconButton
            aria-label="Close project"
            icon={ReplyIcon}
            keybindingHint={PROJECT_KEYBOARD_HINTS.CLOSE_PROJECT}
            onClick={() => onCloseProject()}
            size="large"
            variant="invisible"
          />

          <ActionMenu onOpenChange={setActionsOpen} open={actionsOpen}>
            <ActionMenu.Button leadingVisual={ThreeBarsIcon}>Actions</ActionMenu.Button>
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
                    Export Matches
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

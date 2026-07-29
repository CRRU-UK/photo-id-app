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
  Heading,
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
import {
  getAnalysisProvidersLabel,
  getProjectDirectoryName,
  getSelectedAnalysisProviders,
} from "@/helpers";
import type { ExportTypes } from "@/types";

interface SidebarProps {
  onCloseProject: () => Promise<void>;
}

const Sidebar = observer(({ onCloseProject }: SidebarProps) => {
  const { project } = useProject();
  const { settings: contextSettings, updateSettings } = useSettings();

  const [actionsOpen, setActionsOpen] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [providerPanelOpen, setProviderPanelOpen] = useState<boolean>(false);
  const [providerFilter, setProviderFilter] = useState<string>("");

  type ProviderItem = ItemInput & { id: string; text: string };

  const analysisProviders = useMemo(
    () => contextSettings?.analysisProviders ?? [],
    [contextSettings?.analysisProviders],
  );
  const selectedProviderIds = useMemo(
    () => contextSettings?.selectedAnalysisProviderIds ?? [],
    [contextSettings?.selectedAnalysisProviderIds],
  );
  const selectedProviders = getSelectedAnalysisProviders(contextSettings);

  const providerItems = useMemo<ProviderItem[]>(
    () =>
      analysisProviders.map((provider) => ({
        id: provider.id,
        text: provider.name,
        description: provider.endpoint,
        descriptionVariant: "block" as const,
      })),
    [analysisProviders],
  );

  const filteredItems = useMemo(
    () =>
      providerItems.filter(
        (item) =>
          selectedProviderIds.includes(item.id) ||
          item.text.toLowerCase().includes(providerFilter.toLowerCase()),
      ),
    [providerItems, providerFilter, selectedProviderIds],
  );

  const selectedItems = useMemo(
    () => providerItems.filter(({ id }) => selectedProviderIds.includes(id)),
    [providerItems, selectedProviderIds],
  );

  if (project === null) {
    return null;
  }

  const handleProviderChange = async (items: ItemInput[]) => {
    if (!contextSettings) {
      return;
    }

    const itemIds = items.map((item) => (item as ProviderItem).id);

    try {
      await updateSettings({ ...contextSettings, selectedAnalysisProviderIds: itemIds });
    } catch (error) {
      console.error("Error updating selected analysis providers:", error);
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

  const projectName = getProjectDirectoryName(project.directory);

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
        <Heading
          as="h2"
          data-testid="sidebar-project-name"
          style={{
            fontSize: "var(--text-title-size-small)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
          }}
          title={project.directory}
        >
          {projectName}
        </Heading>

        <MainSelection collection={project.unassigned} total={project.photoCount} />
        <DiscardedSelection collection={project.discarded} />

        <FormControl style={{ marginLeft: "auto", marginTop: "auto" }}>
          <FormControl.Label visuallyHidden>Select analysis providers</FormControl.Label>
          <SelectPanel
            items={filteredItems}
            message={
              providerItems.length === 0
                ? {
                    title: "No providers configured",
                    variant: "empty",
                    body: "Add a provider in settings.",
                  }
                : undefined
            }
            onFilterChange={setProviderFilter}
            onOpenChange={setProviderPanelOpen}
            onSelectedChange={(items: ItemInput[]) => void handleProviderChange(items)}
            open={providerPanelOpen}
            placeholderText="Filter providers"
            renderAnchor={(anchorProps) => (
              <Button
                {...anchorProps}
                leadingVisual={AiModelIcon}
                trailingAction={TriangleDownIcon}
                variant={selectedProviders.length > 0 ? "primary" : "default"}
              >
                {getAnalysisProvidersLabel(selectedProviders)}
              </Button>
            )}
            selected={selectedItems}
            subtitle="Select which analysis providers to use."
            title="Analysis Providers"
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

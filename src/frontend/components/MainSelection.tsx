import { useDroppable } from "@dnd-kit/core";
import { Stack as PrimerStack, ProgressBar, Text } from "@primer/react";
import { observer } from "mobx-react-lite";

import { BOX_HOVER_STYLES, DragAreas } from "@/constants";
import Stack from "@/frontend/components/Stack";
import type Collection from "@/models/Collection";

interface ProgressElementsProps {
  progress: number;
  total: number;
}

const ProgressElements = ({ progress, total }: ProgressElementsProps) => (
  <PrimerStack
    align="center"
    direction="horizontal"
    gap="condensed"
    style={{ marginTop: "var(--project-spacing)" }}
  >
    <Text
      size="small"
      style={{ color: "var(--fgColor-muted)", whiteSpace: "nowrap" }}
      weight="light"
    >
      {progress} of {total} assigned
    </Text>
    <ProgressBar
      bg={progress >= total ? "success.emphasis" : "accent.emphasis"}
      inline
      progress={Math.floor((progress / total) * 100)}
      style={{ width: "100%" }}
    />
  </PrimerStack>
);

export interface MainSelectionProps {
  collection: Collection;
  total: number;
}

const MainSelection = observer(({ collection, total }: MainSelectionProps) => {
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: DragAreas.MainSelection,
    data: { collection },
  });

  return (
    <div
      data-testid="unassigned-section"
      ref={setDroppableNodeRef}
      style={{
        width: "100%",
        padding: "var(--project-spacing)",
        borderColor: "var(--borderColor-default)",
        borderWidth: "var(--borderWidth-default)",
        borderStyle: "solid",
        borderRadius: "var(--borderRadius-default)",
        backgroundColor: "var(--bgColor-muted)",
        ...(isOver ? BOX_HOVER_STYLES : undefined),
      }}
    >
      <Text
        size="medium"
        style={{
          display: "block",
          color: "var(--fgColor-muted)",
          marginBottom: "var(--stack-gap-condensed)",
        }}
        weight="semibold"
      >
        Unassigned Photos
      </Text>

      <Stack collection={collection} showAnalysisButton={false} />

      {collection.photos && (
        <ProgressElements progress={total - collection.photos.length} total={total} />
      )}
    </div>
  );
});

export default MainSelection;

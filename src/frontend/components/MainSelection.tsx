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
    direction="horizontal"
    align="center"
    gap="condensed"
    style={{ marginTop: "var(--stack-gap-normal)" }}
  >
    <Text
      size="small"
      weight="light"
      style={{ color: "var(--fgColor-muted)", whiteSpace: "nowrap" }}
    >
      {progress} of {total} assigned
    </Text>
    <ProgressBar
      progress={Math.floor((progress / total) * 100)}
      inline
      bg={progress >= total ? "success.emphasis" : "accent.emphasis"}
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
      ref={setDroppableNodeRef}
      style={{
        width: "100%",
        padding: "var(--stack-gap-normal)",
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
        weight="semibold"
        style={{
          display: "block",
          color: "var(--fgColor-muted)",
          marginBottom: "var(--stack-gap-condensed)",
        }}
      >
        Unassigned Photos
      </Text>

      <Stack collection={collection} showAnalysisButton={false} />

      {collection.photos && (
        <ProgressElements progress={total - collection.photos.size} total={total} />
      )}
    </div>
  );
});

export default MainSelection;

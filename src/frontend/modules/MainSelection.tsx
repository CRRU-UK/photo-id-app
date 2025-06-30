import { useDroppable } from "@dnd-kit/core";
import { Stack as PrimerStack, Text, ProgressBar } from "@primer/react";

import { DragAreas, BOX_HOVER_STYLES } from "@/constants";
import Stack from "@/frontend/components/Stack";
import type { PhotoStack } from "@/types";

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
    <Text size="small" weight="light" sx={{ color: "var(--fgColor-muted)", whiteSpace: "nowrap" }}>
      {progress} of {total} assigned
    </Text>
    <ProgressBar
      progress={Math.floor((progress / total) * 100)}
      width="100%"
      inline
      bg={progress >= total ? "success.emphasis" : "accent.emphasis"}
      style={{ width: "100%" }}
    />
  </PrimerStack>
);

export interface MainSelectionProps {
  photos: PhotoStack;
  total: number;
}

const MainSelection = ({ photos, total }: MainSelectionProps) => {
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: DragAreas.MainSelection,
    data: { photos },
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
        sx={{
          display: "block",
          color: "var(--fgColor-muted)",
          mb: 2,
        }}
      >
        Unassigned Photos
      </Text>

      <Stack photos={photos} />

      {photos && <ProgressElements progress={total - photos.size} total={total} />}
    </div>
  );
};

export default MainSelection;

import type { PhotoStack } from "@/types";

import { useDroppable } from "@dnd-kit/core";
import { Box, Text } from "@primer/react";

import { DragAreas, BOX_HOVER_STYLES } from "@/constants";

import Stack from "@/frontend/components/Stack";

export interface DiscardedSelectionProps {
  photos: PhotoStack;
}

const DiscardedSelection = ({ photos }: DiscardedSelectionProps) => {
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: DragAreas.DiscardedSelection,
  });

  return (
    <Box
      ref={setDroppableNodeRef}
      sx={{
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
        Discarded Photos
      </Text>

      <Stack photos={photos} />
    </Box>
  );
};

export default DiscardedSelection;

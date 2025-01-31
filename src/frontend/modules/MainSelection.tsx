import type { PhotoStack } from "../../helpers/types";

import { useDroppable } from "@dnd-kit/core";
import { Box, Stack as PrimerStack, Text, ProgressBar } from "@primer/react";

import { DragAreas, BOX_HOVER_STYLES } from "../../helpers/constants";

import Stack from "../components/Stack";

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
    <Text size="small" weight="light" whiteSpace="nowrap" sx={{ color: "var(--fgColor-muted)" }}>
      {progress} of {total}
    </Text>
    <ProgressBar
      progress={Math.floor((progress / total) * 100)}
      width="100%"
      inline
      bg={progress >= total ? "success.emphasis" : "accent.emphasis"}
    />
  </PrimerStack>
);

export interface MainSelectionProps {
  photos: PhotoStack;
  total: number;
}

const MainSelection = ({ photos, total }: MainSelectionProps) => {
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id: DragAreas.MainSelection });

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
        Unassigned Photos
      </Text>

      <Stack photos={photos} />

      {photos && <ProgressElements progress={total - photos.size} total={total} />}
    </Box>
  );
};

export default MainSelection;

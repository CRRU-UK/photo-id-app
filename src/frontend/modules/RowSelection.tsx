import type { Match, PhotoStack } from "@/types";

import { useDroppable } from "@dnd-kit/core";
import { Stack as PrimerStack, Text, Label } from "@primer/react";

import { BOX_HOVER_STYLES } from "@/constants";

import Stack from "@/frontend/components/Stack";

interface SelectionProps {
  id: string;
  photos: PhotoStack;
  text: string;
}

const Selection = ({ id, photos, text }: SelectionProps) => {
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id, data: { photos } });

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
        <Label>{id}</Label> {text}
      </Text>
      <Stack photos={photos} />
    </div>
  );
};

interface RowSelectionProps {
  match: Match;
}

const RowSelection = ({ match }: RowSelectionProps) => (
  <div style={{ marginBottom: "var(--stack-gap-spacious)" }}>
    <PrimerStack direction="horizontal">
      <Selection id={`${match.id}-left`} photos={match.left} text="Left" />
      <Selection id={`${match.id}-right`} photos={match.right} text="Right" />
    </PrimerStack>
  </div>
);

export default RowSelection;

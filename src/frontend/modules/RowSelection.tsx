import type { Match, PhotoStack } from "@/types";

import { useDroppable } from "@dnd-kit/core";
import { Stack as PrimerStack } from "@primer/react";

import { BOX_HOVER_STYLES } from "@/constants";

import Stack from "@/frontend/components/Stack";

interface SelectionProps {
  id: string;
  photos: PhotoStack;
}

const Selection = ({ id, photos }: SelectionProps) => {
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
      <Stack photos={photos} />
    </div>
  );
};

interface RowSelectionProps {
  match: Match;
}

const RowSelection = ({ match }: RowSelectionProps) => {
  return (
    <PrimerStack direction="horizontal" style={{ marginBottom: "var(--stack-gap-spacious)" }}>
      <Selection id={`${match.id}-left`} photos={match.left} />
      <Selection id={`${match.id}-right`} photos={match.right} />
    </PrimerStack>
  );
};

export default RowSelection;

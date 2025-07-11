import { useDroppable } from "@dnd-kit/core";
import { Label, Stack as PrimerStack, Text, TextInput } from "@primer/react";

import { BOX_HOVER_STYLES } from "@/constants";
import Stack from "@/frontend/components/Stack";
import { getAlphabetLetter } from "@/helpers";
import type { Match } from "@/types";

import type Collection from "@/models/Collection";

interface SelectionProps {
  id: number;
  side: string;
  collection: Collection;
}

const Selection = ({ id, side, collection }: SelectionProps) => {
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: `${id}-${side}`,
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
      <PrimerStack
        direction="horizontal"
        align="center"
        justify="space-between"
        gap="condensed"
        sx={{ mb: 2 }}
      >
        <Text
          size="medium"
          weight="semibold"
          sx={{
            display: "block",
            color: "var(--fgColor-default)",
          }}
        >
          {getAlphabetLetter(id)} <Label>{side}</Label>
        </Text>
        <TextInput value="" onChange={() => {}} size="small" style={{ maxWidth: "80px" }} />
      </PrimerStack>
      <Stack collection={collection} />
    </div>
  );
};

interface RowSelectionProps {
  match: Match;
}

// TODO: Save project on name changes
const RowSelection = ({ match }: RowSelectionProps) => {
  return (
    <div style={{ marginBottom: "var(--stack-gap-spacious)" }}>
      <PrimerStack direction="horizontal">
        <Selection id={match.id} side="Left" collection={match.left} />
        <Selection id={match.id} side="Right" collection={match.right} />
      </PrimerStack>
    </div>
  );
};

export default RowSelection;

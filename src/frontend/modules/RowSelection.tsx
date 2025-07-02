import { useDroppable } from "@dnd-kit/core";
import { Label, Stack as PrimerStack, Text, TextInput } from "@primer/react";
import { useEffect, useState } from "react";

import { BOX_HOVER_STYLES } from "@/constants";
import Stack from "@/frontend/components/Stack";
import { getAlphabetLetter } from "@/helpers";
import type { Match, PhotoStack } from "@/types";

interface SelectionProps {
  id: number;
  side: string;
  photos: PhotoStack;
  name: string;
  onNameChange: React.Dispatch<React.SetStateAction<string>>;
}

const Selection = ({ id, photos, side, name, onNameChange }: SelectionProps) => {
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: `${id}-${side}`,
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
        <TextInput
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          size="small"
          style={{ maxWidth: "80px" }}
        />
      </PrimerStack>
      <Stack photos={photos} />
    </div>
  );
};

interface RowSelectionProps {
  match: Match;
}

// TODO: Save project on name changes
const RowSelection = ({ match }: RowSelectionProps) => {
  const [leftName, setLeftName] = useState<string>(match.left.name);
  const [rightName, setRightName] = useState<string>(match.right.name);

  useEffect(() => {
    match.left.name = leftName;
  }, [match.left, leftName]);

  useEffect(() => {
    match.right.name = rightName;
  }, [match.right, rightName]);

  return (
    <div style={{ marginBottom: "var(--stack-gap-spacious)" }}>
      <PrimerStack direction="horizontal">
        <Selection
          id={match.id}
          side="Left"
          photos={match.left.photos}
          name={leftName}
          onNameChange={setLeftName}
        />
        <Selection
          id={match.id}
          side="Right"
          photos={match.right.photos}
          name={rightName}
          onNameChange={setRightName}
        />
      </PrimerStack>
    </div>
  );
};

export default RowSelection;

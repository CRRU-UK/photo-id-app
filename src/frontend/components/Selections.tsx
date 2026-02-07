import { useDroppable } from "@dnd-kit/core";
import { Label, Stack as PrimerStack, Text, TextInput } from "@primer/react";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import type Collection from "@/models/Collection";
import type { Match } from "@/types";

import { BOX_HOVER_STYLES } from "@/constants";
import Stack from "@/frontend/components/Stack";
import { getAlphabetLetter } from "@/helpers";

interface SelectionStackProps {
  id: number;
  side: string;
  collection: Collection;
}

const SelectionStack = observer(({ id, side, collection }: SelectionStackProps) => {
  const [selectionName, setSelectionName] = useState<string>(collection.name || "");

  useEffect(() => {
    collection.setName(selectionName);
  }, [collection, selectionName]);

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
        style={{ marginBottom: "var(--stack-gap-condensed)" }}
      >
        <Text
          size="medium"
          weight="semibold"
          style={{
            display: "block",
            color: "var(--fgColor-default)",
          }}
        >
          {getAlphabetLetter(id)} <Label>{side}</Label>
        </Text>
        <TextInput
          defaultValue={selectionName}
          onBlur={(event) => setSelectionName(event.target.value)}
          size="small"
          style={{ maxWidth: "80px" }}
        />
      </PrimerStack>
      <Stack collection={collection} />
    </div>
  );
});

interface SelectionsProps {
  matches: Match[];
}

const Selections = observer(({ matches }: SelectionsProps) =>
  matches.map((match) => (
    <PrimerStack
      direction="horizontal"
      style={{ marginBottom: "var(--stack-gap-normal)" }}
      key={match.id}
    >
      <SelectionStack id={match.id} side="Left" collection={match.left} />
      <SelectionStack id={match.id} side="Right" collection={match.right} />
    </PrimerStack>
  )),
);

export default Selections;

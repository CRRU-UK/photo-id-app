import { useDroppable } from "@dnd-kit/core";
import { Label, Stack as PrimerStack, Text, TextInput } from "@primer/react";
import { observer } from "mobx-react-lite";
import { BOX_HOVER_STYLES } from "@/constants";
import Stack from "@/frontend/components/Stack";
import { getAlphabetLetter } from "@/helpers";
import type Collection from "@/models/Collection";
import type { Match } from "@/types";

interface SelectionStackProps {
  collection: Collection;
  id: number;
  side: string;
}

const SelectionStack = observer(({ id, side, collection }: SelectionStackProps) => {
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: `${id}-${side}`,
    data: { collection },
  });

  const stackLabel = collection.name
    ? `${collection.name} (${side})`
    : `${getAlphabetLetter(id)} (${side})`;

  return (
    <div
      data-testid={`match-${id}-${side.toLowerCase()}`}
      ref={setDroppableNodeRef}
      style={{
        flex: 1,
        minWidth: 0,
        padding: "var(--app-spacing)",
        borderColor: "var(--borderColor-default)",
        borderWidth: "var(--borderWidth-default)",
        borderStyle: "solid",
        borderRadius: "var(--borderRadius-default)",
        backgroundColor: "var(--bgColor-muted)",
        ...(isOver ? BOX_HOVER_STYLES : undefined),
      }}
    >
      <PrimerStack
        align="center"
        direction="horizontal"
        gap="condensed"
        justify="space-between"
        style={{ marginBottom: "var(--stack-gap-condensed)" }}
      >
        <Text
          size="medium"
          style={{
            display: "block",
            flexShrink: 0,
            whiteSpace: "nowrap",
            color: "var(--fgColor-default)",
          }}
          weight="semibold"
        >
          {getAlphabetLetter(id)} <Label>{side}</Label>
        </Text>
        <TextInput
          defaultValue={collection.name || ""}
          onBlur={(event) => collection.setName(event.target.value)}
          size="small"
          style={{ flex: 1, minWidth: 0, maxWidth: "160px" }}
        />
      </PrimerStack>
      <Stack collection={collection} stackLabel={stackLabel} />
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
      key={match.id}
      style={{
        gap: "var(--app-spacing)",
        marginBottom: "var(--app-spacing)",
      }}
    >
      <SelectionStack collection={match.left} id={match.id} side="Left" />
      <SelectionStack collection={match.right} id={match.id} side="Right" />
    </PrimerStack>
  )),
);

export default Selections;

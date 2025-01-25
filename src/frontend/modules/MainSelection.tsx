import { Box, Stack as PrimerStack, Text, ProgressBar } from "@primer/react";

import type { PHOTO_STACK } from "../../helpers/types";

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
    <ProgressBar progress={Math.floor((progress / total) * 100)} width="100%" inline />
  </PrimerStack>
);

export interface MainSelectionProps {
  photos: PHOTO_STACK;
}

const MainSelection = ({ photos }: MainSelectionProps) => {
  const progress = 0; // Temp

  return (
    <Box
      sx={{
        width: "100%",
        padding: "var(--stack-gap-normal)",
        borderColor: "var(--borderColor-default)",
        borderWidth: "var(--borderWidth-default)",
        borderStyle: "solid",
        borderRadius: "var(--borderRadius-default)",
        backgroundColor: "var(--bgColor-muted)",
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

      {photos && <ProgressElements progress={progress} total={photos.length} />}
    </Box>
  );
};

export default MainSelection;

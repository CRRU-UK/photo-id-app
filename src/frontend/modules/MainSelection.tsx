import type { PHOTO_DATA } from '../../helpers/types';

import { Box, Stack as PrimerStack, Text, ProgressBar, ButtonGroup, IconButton } from '@primer/react';

import Stack from '../components/Stack';

interface ProgressElementsProps {
  progress: number,
  total: number,
}

const ProgressElements = ({
  progress,
  total,
}: ProgressElementsProps) => (
  <PrimerStack
    direction="horizontal"
    align="center"
    gap="condensed"
    style={{ marginTop: '10px' }}
  >
    <Text
      size="small"
      weight="light"
      whiteSpace="nowrap"
      sx={{ color: "fg.muted" }}
    >
      {progress} of {total}
    </Text>
    <ProgressBar
      progress={Math.floor((progress / total) * 100)}
      width="100%"
      inline
    />
  </PrimerStack>
);

export interface MainSelectionProps {
  data: PHOTO_DATA,
}

const MainSelection = ({
  data,
}: MainSelectionProps) => {
  const progress = 0; // Temp

  return (
    <Box>
      <Stack data={data} />
      {data && <ProgressElements progress={progress} total={data.files.length} />}
    </Box>
  );
};

export default MainSelection;

import type { PHOTO_DATA } from '../../helpers/types';

import { useState } from 'react';

import { Box, ButtonGroup, IconButton } from '@primer/react';
import { SkeletonBox } from '@primer/react/experimental';
import { ChevronLeftIcon, ChevronRightIcon } from '@primer/octicons-react';

export interface StackProps {
  data: PHOTO_DATA,
}

const Stack = ({
  data,
}: StackProps): JSX.Element => {
  if (!data) {
    return (
      <SkeletonBox
        width={"100%"}
        height={"auto"}
        sx={{ aspectRatio: "4/3", objectFit: "cover" }}
      />
    );
  }

  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const { files, directory } = data;

  const handlePrev = () => {
    let newIndex = currentIndex - 1;
    if (newIndex < 0) {
      newIndex = files.length - 1;
    }

    return setCurrentIndex(newIndex);
  };

  const handleNext = () => {
    let newIndex = currentIndex + 1;
    if (newIndex >= files.length) {
      newIndex = 0;
    }

    return setCurrentIndex(newIndex);
  };

  const currentFile = files[currentIndex % files.length];
  const filePath = `file://${directory}/${currentFile}`;

  return (
    <Box sx={{ position: "relative" }}>
      {files.length > 1 && (<div style={{
        position: "absolute",
        right: "10px",
        bottom: "10px",
      }}>
        <ButtonGroup sx={{ opacity: 0.8 }}>
          <IconButton icon={ChevronLeftIcon} aria-label="" onClick={() => handlePrev()} />
          <IconButton icon={ChevronRightIcon} aria-label="" onClick={() => handleNext()} />
        </ButtonGroup>
      </div>)}

      <img
        src={filePath}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          aspectRatio: "4/3",
          objectFit: "cover",
        }}
      />
    </Box>
  );
};

export default Stack;

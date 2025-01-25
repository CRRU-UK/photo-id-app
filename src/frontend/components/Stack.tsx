import type { PHOTO_STACK } from "../../helpers/types";

import { useState } from "react";

import { Box, ButtonGroup, IconButton } from "@primer/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@primer/octicons-react";

export interface StackProps {
  photos: PHOTO_STACK;
}

const Stack = ({ photos }: StackProps) => {
  console.log("photos", photos);

  if (!photos || photos.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: "auto",
          aspectRatio: "4/3",
          objectFit: "cover",
          background: "var(--bgColor-emphasis)",
        }}
      />
    );
  }

  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const handlePrev = () => {
    let newIndex = currentIndex - 1;
    if (newIndex < 0) {
      newIndex = photos.length - 1;
    }

    return setCurrentIndex(newIndex);
  };

  const handleNext = () => {
    let newIndex = currentIndex + 1;
    if (newIndex >= photos.length) {
      newIndex = 0;
    }

    return setCurrentIndex(newIndex);
  };

  const currentFile = photos[currentIndex % photos.length];

  return (
    <Box sx={{ position: "relative" }}>
      {photos.length > 1 && (
        <div
          style={{
            position: "absolute",
            right: "10px",
            bottom: "10px",
          }}
        >
          <ButtonGroup>
            <IconButton
              icon={ChevronLeftIcon}
              size="small"
              aria-label=""
              onClick={() => handlePrev()}
            />
            <IconButton
              icon={ChevronRightIcon}
              size="small"
              aria-label=""
              onClick={() => handleNext()}
            />
          </ButtonGroup>
        </div>
      )}

      <img
        src={currentFile.getFullPath()}
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

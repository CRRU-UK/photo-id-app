import type { PHOTO_STACK } from "../../helpers/types";

import { useState, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";

import { Box, ButtonGroup, IconButton } from "@primer/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@primer/octicons-react";

export interface StackProps {
  photos: PHOTO_STACK;
}

const Stack = ({ photos }: StackProps) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const currentFile = Array.from(photos)[currentIndex % photos.size];

  const {
    setNodeRef: setDraggableNodeRef,
    attributes,
    listeners,
  } = useDraggable({
    id: currentFile?.getFileName() || null,
    data: currentFile,
    disabled: photos.size <= 0,
  });

  const handlePrev = () => {
    let newIndex = currentIndex - 1;
    if (newIndex < 0) {
      newIndex = photos.size - 1;
    }

    return setCurrentIndex(newIndex);
  };

  const handleNext = () => {
    let newIndex = currentIndex + 1;
    if (newIndex >= photos.size) {
      newIndex = 0;
    }

    return setCurrentIndex(newIndex);
  };

  return (
    <Box
      style={{
        position: "relative",
        width: "100%",
        height: "auto",
        aspectRatio: "4/3",
        objectFit: "cover",
        background: "var(--bgColor-emphasis)",
      }}
    >
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
            disabled={photos.size <= 1}
          />
          <IconButton
            icon={ChevronRightIcon}
            size="small"
            aria-label=""
            onClick={() => handleNext()}
            disabled={photos.size <= 1}
          />
        </ButtonGroup>
      </div>

      <div ref={setDraggableNodeRef} {...listeners} {...attributes}>
        {currentFile && (
          <img
            src={currentFile.getFullPath()}
            style={{
              cursor: "pointer",
              display: "block",
              width: "100%",
              height: "auto",
              aspectRatio: "4/3",
              objectFit: "cover",
            }}
            alt=""
          />
        )}
      </div>
    </Box>
  );
};

export default Stack;

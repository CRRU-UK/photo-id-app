import type { PHOTO_STACK } from "../../helpers/types";

import { useState, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";

import { Box, ButtonGroup, IconButton } from "@primer/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@primer/octicons-react";

export interface StackProps {
  photos: PHOTO_STACK;
}

const StackArea = ({ photos }: StackProps) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const currentFile = Array.from(photos)[currentIndex % photos.size];

  // Show latest photo when dragged onto
  useEffect(() => {
    console.log("photos", photos);
    setCurrentIndex(photos.size);
  }, [photos]);

  const {
    setNodeRef: setDraggableNodeRef,
    attributes,
    listeners,
  } = useDraggable({
    id: currentFile.id,
    data: currentFile,
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
    <>
      {photos.size > 1 && (
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
        ref={setDraggableNodeRef}
        {...listeners}
        {...attributes}
        src={currentFile.getFullPath()}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          aspectRatio: "4/3",
          objectFit: "cover",
        }}
        alt=""
      />
    </>
  );
};

/**
 * Wrap the draggable area in a condition to prevent issues with hooks.
 */
const Stack = ({ photos }: StackProps) => (
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
    {photos.size > 0 && <StackArea photos={photos} />}
  </Box>
);

export default Stack;

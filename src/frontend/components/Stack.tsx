import type { PhotoStack, EditWindowData } from "@/types";

import { useState, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";

import { Stack as PrimerStack, CounterLabel, ButtonGroup, IconButton } from "@primer/react";
import { PencilIcon, ChevronLeftIcon, ChevronRightIcon } from "@primer/octicons-react";

export interface StackProps {
  photos: PhotoStack;
}

const Stack = ({ photos }: StackProps) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(new Date().getTime());

  const currentFile = Array.from(photos)[currentIndex % photos.size];

  const {
    setNodeRef: setDraggableNodeRef,
    attributes,
    listeners,
  } = useDraggable({
    id: currentFile?.getFileName() ?? null,
    data: {
      stack: photos,
      currentFile,
    },
    disabled: photos.size <= 0,
  });

  useEffect(() => {
    // This does not work?
    setCurrentIndex(0);
  }, [photos]);

  useEffect(() => {
    window.electronAPI.onRefreshStackImages((name) => {
      console.log(currentFile?.getFileName(), name);
      if (currentFile?.getFileName() === name) {
        console.log("refreshing image!");
        setCurrentTime(new Date().getTime());
      }
    });
  });

  const handleOpenEdit = () => {
    const data: EditWindowData = { name: currentFile.name, path: currentFile.getFullPath() };
    window.electronAPI.openEditWindow(btoa(JSON.stringify(data)));
  };

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
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "auto",
        aspectRatio: "4/3",
        objectFit: "cover",
        background: "var(--bgColor-emphasis)",
      }}
    >
      <PrimerStack
        direction="horizontal"
        align="center"
        justify="space-between"
        padding="condensed"
        style={{
          width: "100%",
          position: "absolute",
          left: "0",
          bottom: "0",
        }}
      >
        {photos.size > 0 && (
          <CounterLabel scheme="primary">
            {currentIndex + 1} / {photos.size}
          </CounterLabel>
        )}

        <IconButton
          icon={PencilIcon}
          size="small"
          aria-label="Edit photo"
          onClick={(event) => {
            event.preventDefault();
            return handleOpenEdit();
          }}
          disabled={photos.size <= 0}
          style={{ marginLeft: "auto" }}
        />

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
      </PrimerStack>

      <div ref={setDraggableNodeRef} {...listeners} {...attributes}>
        {currentFile && (
          <img
            src={`file://${currentFile.getThumbnailFullPath()}?${currentTime}`}
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
    </div>
  );
};

export default Stack;

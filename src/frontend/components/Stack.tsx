import { useDraggable } from "@dnd-kit/core";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  TriangleDownIcon,
  UndoIcon,
} from "@primer/octicons-react";
import {
  ActionList,
  ActionMenu,
  ButtonGroup,
  CounterLabel,
  IconButton,
  Stack as PrimerStack,
} from "@primer/react";
import { useEffect, useRef, useState } from "react";

import type { PhotoBody, PhotoStack } from "@/types";

export interface StackProps {
  photos: PhotoStack;
}

const Stack = ({ photos }: StackProps) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(new Date().getTime());
  const [actionsOpen, setActionsOpen] = useState<boolean>(false);
  const [revertingPhoto, setRevertingPhoto] = useState<boolean>(false);

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

  const firstUpdate = useRef<number>(photos.size);
  useEffect(() => {
    if (firstUpdate.current === photos.size) {
      return;
    }

    // Move stack to latest photo when adding
    if (firstUpdate.current < photos.size) {
      setCurrentIndex(photos.size - 1);
    }

    firstUpdate.current = photos.size;
  }, [photos.size, currentIndex]);

  useEffect(() => {
    window.electronAPI.onRefreshStackImages((name) => {
      if (currentFile?.getFileName() === name) {
        setCurrentTime(new Date().getTime());
      }
    });
  });

  const handleOpenEdit = () => {
    const data: PhotoBody = {
      directory: currentFile.directory,
      name: currentFile.getFileName(),
      edited: currentFile.getEditedFileName(),
      thumbnail: currentFile.getThumbnailFileName(),
    };

    window.electronAPI.openEditWindow(data);
  };

  const handleRevertPhoto = async () => {
    setRevertingPhoto(true);

    const data: PhotoBody = {
      directory: currentFile.directory,
      name: currentFile.getFileName(),
      edited: currentFile.getEditedFileName(),
      thumbnail: currentFile.getThumbnailFileName(),
    };

    await window.electronAPI.revertPhotoFile(data);

    setActionsOpen(false);
    setRevertingPhoto(false);
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
    <>
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

      <PrimerStack
        direction="horizontal"
        align="center"
        justify="space-between"
        style={{ marginTop: "var(--stack-gap-normal)" }}
      >
        <PrimerStack direction="horizontal" align="center" justify="space-between">
          {photos.size > 0 && (
            <CounterLabel scheme="secondary">
              {currentIndex + 1} / {photos.size}
            </CounterLabel>
          )}
        </PrimerStack>

        <ButtonGroup style={{ marginLeft: "auto" }}>
          <IconButton
            icon={PencilIcon}
            size="small"
            aria-label="Edit photo"
            onClick={(event) => {
              event.preventDefault();
              return handleOpenEdit();
            }}
            disabled={photos.size <= 0}
          >
            Edit
          </IconButton>
          <ActionMenu open={actionsOpen} onOpenChange={setActionsOpen}>
            <ActionMenu.Button
              aria-label="More options"
              icon={TriangleDownIcon}
              size="small"
              disabled={photos.size <= 0}
            />
            <ActionMenu.Overlay>
              <ActionList>
                <ActionList.Item
                  variant="danger"
                  disabled={photos.size <= 0 || revertingPhoto}
                  loading={revertingPhoto}
                  onClick={() => handleRevertPhoto()}
                >
                  <ActionList.LeadingVisual>
                    <UndoIcon />
                  </ActionList.LeadingVisual>
                  {revertingPhoto ? "Reverting..." : "Revert to original"}
                </ActionList.Item>
              </ActionList>
            </ActionMenu.Overlay>
          </ActionMenu>
        </ButtonGroup>

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
    </>
  );
};

export default Stack;

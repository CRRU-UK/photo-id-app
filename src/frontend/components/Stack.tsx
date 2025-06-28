import type { PhotoStack, EditWindowData, RevertPhotoData } from "@/types";

import { useState, useEffect, memo } from "react";
import { useDraggable } from "@dnd-kit/core";

import {
  Stack as PrimerStack,
  CounterLabel,
  ButtonGroup,
  IconButton,
  ActionMenu,
  ActionList,
} from "@primer/react";
import {
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TriangleDownIcon,
  UndoIcon,
} from "@primer/octicons-react";

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

  useEffect(() => {
    // This does not work?
    setCurrentIndex(0);
  }, [photos]);

  useEffect(() => {
    window.electronAPI.onRefreshStackImages((name) => {
      if (currentFile?.getFileName() === name) {
        setCurrentTime(new Date().getTime());
      }

      setActionsOpen(false);
      setRevertingPhoto(false);
    });
  });

  const handleOpenEdit = () => {
    const data: EditWindowData = {
      directory: currentFile.directory,
      name: currentFile.getFileName(),
      edited: currentFile.getEditedFileName(),
      thumbnail: currentFile.getThumbnailFileName(),
    };
    window.electronAPI.openEditWindow(btoa(JSON.stringify(data)));
  };

  const handleRevertPhoto = () => {
    setRevertingPhoto(true);

    const data: RevertPhotoData = {
      directory: currentFile.directory,
      name: currentFile.getFileName(),
      edited: currentFile.getEditedFileName(),
    };

    window.electronAPI.revertPhotoFile(data);
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

export default memo(Stack);

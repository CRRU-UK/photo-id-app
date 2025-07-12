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
import { useEffect, useState } from "react";

import type Collection from "@/models/Collection";
import type Photo from "@/models/Photo";
import type { PhotoBody } from "@/types";

interface StackProps {
  collection: Collection;
}

const Stack = ({ collection }: StackProps) => {
  const [currentPhoto, setCurrentPhoto] = useState<Photo | null>(collection.getCurrentPhoto());
  const [currentTime, setCurrentTime] = useState<number>(new Date().getTime());
  const [actionsOpen, setActionsOpen] = useState<boolean>(false);
  const [revertingPhoto, setRevertingPhoto] = useState<boolean>(false);

  const {
    setNodeRef: setDraggableNodeRef,
    attributes,
    listeners,
  } = useDraggable({
    id: currentPhoto?.getFileName() ?? "",
    data: { collection, currentPhoto },
    disabled: collection.photos.size <= 0,
  });

  useEffect(() => {
    setCurrentPhoto(collection.getCurrentPhoto());
  }, [collection, collection.photos.size]);

  useEffect(() => {
    window.electronAPI.onRefreshStackImages((name) => {
      if (currentPhoto?.getFileName() === name) {
        setCurrentTime(new Date().getTime());
      }
    });
  });

  const handleOpenEdit = () => {
    const data: PhotoBody = {
      directory: currentPhoto!.directory,
      name: currentPhoto!.getFileName(),
      edited: currentPhoto!.getEditedFileName(),
      thumbnail: currentPhoto!.getThumbnailFileName(),
    };

    window.electronAPI.openEditWindow(data);
  };

  const handleRevertPhoto = async () => {
    setRevertingPhoto(true);

    const data: PhotoBody = {
      directory: currentPhoto.directory,
      name: currentPhoto.getFileName(),
      edited: currentPhoto.getEditedFileName(),
      thumbnail: currentPhoto.getThumbnailFileName(),
    };

    await window.electronAPI.revertPhotoFile(data);

    setActionsOpen(false);
    setRevertingPhoto(false);
  };

  const handlePrev = () => {
    collection.setPreviousPhoto();
    setCurrentPhoto(collection.getCurrentPhoto());
  };

  const handleNext = () => {
    collection.setNextPhoto();
    setCurrentPhoto(collection.getCurrentPhoto());
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
        <div
          ref={setDraggableNodeRef}
          {...listeners}
          {...attributes}
          onDoubleClick={handleOpenEdit}
        >
          {currentPhoto && (
            <img
              src={`file://${currentPhoto.getThumbnailFullPath()}?${currentTime}`}
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
          {collection.photos.size > 0 && (
            <CounterLabel scheme="secondary">
              {collection.index + 1} / {collection.photos.size}
            </CounterLabel>
          )}
          index: {collection.index}
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
            disabled={collection.photos.size <= 0}
          >
            Edit
          </IconButton>
          <ActionMenu open={actionsOpen} onOpenChange={handleOpenEdit}>
            <ActionMenu.Button
              aria-label="More options"
              icon={TriangleDownIcon}
              size="small"
              disabled={collection.photos.size <= 0}
            />
            <ActionMenu.Overlay>
              <ActionList>
                <ActionList.Item
                  variant="danger"
                  disabled={collection.photos.size <= 0 || revertingPhoto}
                  loading={revertingPhoto}
                  onClick={handleRevertPhoto}
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
            onClick={handlePrev}
            disabled={collection.photos.size <= 1}
          />
          <IconButton
            icon={ChevronRightIcon}
            size="small"
            aria-label=""
            onClick={handleNext}
            disabled={collection.photos.size <= 1}
          />
        </ButtonGroup>
      </PrimerStack>
    </>
  );
};

export default Stack;

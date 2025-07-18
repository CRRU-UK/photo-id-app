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
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import type Collection from "@/models/Collection";
import type Photo from "@/models/Photo";
import type { PhotoBody } from "@/types";

interface StackImageProps {
  photo: Photo;
}

const StackImage = observer(({ photo }: StackImageProps) => (
  <img
    src={`file://${photo.thumbnailFullPath}`}
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
));

interface StackProps {
  collection: Collection;
}

const Stack = ({ collection }: StackProps) => {
  const [currentPhoto, setCurrentPhoto] = useState<Photo | null>(null);
  const [actionsOpen, setActionsOpen] = useState<boolean>(false);
  const [revertingPhoto, setRevertingPhoto] = useState<boolean>(false);

  const {
    setNodeRef: setDraggableNodeRef,
    attributes,
    listeners,
  } = useDraggable({
    id: currentPhoto?.fileName ?? "",
    data: { collection, currentPhoto },
    disabled: collection.photos.size <= 0,
  });

  useEffect(() => {
    setCurrentPhoto(collection.currentPhoto);
  }, [collection, collection.photos.size]);

  const handleOpenEdit = () => {
    const data: PhotoBody = {
      directory: currentPhoto!.directory,
      name: currentPhoto!.fileName,
      edited: currentPhoto!.editedFileName,
      thumbnail: currentPhoto!.thumbnailFileName,
    };

    window.electronAPI.openEditWindow(data);
  };

  const handleRevertPhoto = async () => {
    setRevertingPhoto(true);

    const data: PhotoBody = {
      directory: currentPhoto!.directory,
      name: currentPhoto!.fileName,
      edited: currentPhoto!.editedFileName,
      thumbnail: currentPhoto!.thumbnailFileName,
    };

    await window.electronAPI.revertPhotoFile(data);

    setActionsOpen(false);
    setRevertingPhoto(false);
  };

  const handlePrev = () => {
    collection.setPreviousPhoto();
    setCurrentPhoto(collection.currentPhoto);
  };

  const handleNext = () => {
    collection.setNextPhoto();
    setCurrentPhoto(collection.currentPhoto);
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
          {currentPhoto && <StackImage photo={currentPhoto} />}
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
          <ActionMenu open={actionsOpen} onOpenChange={setActionsOpen}>
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

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
import { useState } from "react";

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

const Stack = observer(({ collection }: StackProps) => {
  const [actionsOpen, setActionsOpen] = useState<boolean>(false);
  const [revertingPhoto, setRevertingPhoto] = useState<boolean>(false);

  const currentPhoto = collection.currentPhoto;

  const {
    setNodeRef: setDraggableNodeRef,
    attributes,
    listeners,
  } = useDraggable({
    id: currentPhoto?.fileName ?? "",
    data: { collection, currentPhoto: currentPhoto },
    disabled: collection.photos.size <= 0,
  });

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
    if (revertingPhoto) {
      return;
    }

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

  const handlePrev = () => collection.setPreviousPhoto();
  const handleNext = () => collection.setNextPhoto();

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
          {collection?.currentPhoto && <StackImage photo={currentPhoto!} />}
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
            disabled={collection.photos.size <= 0 || revertingPhoto}
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
                  disabled={
                    collection.photos.size <= 0 || revertingPhoto || !currentPhoto?.editedFileName
                  }
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
});

export default Stack;

import { useDraggable } from "@dnd-kit/core";
import {
  AiModelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoIcon,
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

import { ASPECT_RATIO, PROJECT_TOOLTIPS } from "@/constants";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useSettings } from "@/contexts/SettingsContext";
import type Collection from "@/models/Collection";
import type Photo from "@/models/Photo";

interface StackImageProps {
  photo: Photo;
}

const StackImage = observer(({ photo }: StackImageProps) => (
  <img
    alt={photo.fileName}
    loading="lazy"
    src={photo.thumbnailFullPath}
    style={{
      cursor: "pointer",
      display: "block",
      width: "100%",
      height: "auto",
      aspectRatio: ASPECT_RATIO,
      objectFit: "contain",
    }}
  />
));

interface StackProps {
  collection: Collection;
  showAnalysisButton?: boolean;
  stackLabel?: string;
}

const Stack = observer(({ collection, showAnalysisButton = true, stackLabel }: StackProps) => {
  const { settings } = useSettings();
  const { isAnalysing, handleAnalyse } = useAnalysis();
  const [actionsOpen, setActionsOpen] = useState<boolean>(false);
  const [revertingPhoto, setRevertingPhoto] = useState<boolean>(false);

  const selectedModel = settings?.mlModels?.find(({ id }) => id === settings?.selectedModelId);

  const handleAnalyseClick = () => {
    if (collection.photos.length === 0) {
      return;
    }

    void handleAnalyse(
      collection.photos.map((photo) => photo.toBody()),
      stackLabel ?? "",
    );
  };

  const currentPhoto = collection.currentPhoto;

  const {
    setNodeRef: setDraggableNodeRef,
    attributes,
    listeners,
  } = useDraggable({
    id: currentPhoto?.fileName ?? "",
    data: { collection, currentPhoto: currentPhoto },
    disabled: collection.photos.length <= 0,
  });

  const { onKeyDown: draggableOnKeyDown, ...draggableListeners } = listeners ?? {};

  const handleOpenEdit = () => {
    if (!currentPhoto) {
      return;
    }

    window.electronAPI.openEditWindow(currentPhoto.toBody());
  };

  const handleRevertPhoto = async () => {
    if (revertingPhoto || !currentPhoto) {
      return;
    }

    setRevertingPhoto(true);

    const newData = await window.electronAPI.revertPhotoFile(currentPhoto.toBody());
    currentPhoto.updatePhoto(newData);

    setActionsOpen(false);
    setRevertingPhoto(false);
  };

  const handlePrev = () => collection.setPreviousPhoto();
  const handleNext = () => collection.setNextPhoto();

  return (
    <>
      <div className="photo-stack" style={{ aspectRatio: ASPECT_RATIO }}>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: needed for drag-and-drop */}
        <div
          ref={setDraggableNodeRef}
          {...draggableListeners}
          {...attributes}
          data-testid="photo-draggable"
          onDoubleClick={handleOpenEdit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleOpenEdit();
            }

            // dnd-kit types SyntheticListenerMap handlers as Function
            draggableOnKeyDown?.(event);
          }}
        >
          {currentPhoto && (
            <IconButton
              aria-label={currentPhoto.fileName}
              className="photo-info"
              icon={InfoIcon}
              size="small"
            />
          )}
          {currentPhoto && <StackImage photo={currentPhoto} />}
        </div>
      </div>

      <PrimerStack
        align="center"
        direction="horizontal"
        justify="end"
        style={{ marginTop: "var(--stack-gap-normal)" }}
      >
        <PrimerStack
          align="center"
          direction="horizontal"
          justify="space-between"
          style={{ marginRight: "auto" }}
        >
          <ButtonGroup>
            <IconButton
              aria-label={PROJECT_TOOLTIPS.PREVIOUS_PHOTO}
              disabled={collection.photos.length <= 1}
              icon={ChevronLeftIcon}
              onClick={handlePrev}
              size="small"
            />
            <IconButton
              aria-label={PROJECT_TOOLTIPS.NEXT_PHOTO}
              disabled={collection.photos.length <= 1}
              icon={ChevronRightIcon}
              onClick={handleNext}
              size="small"
            />
          </ButtonGroup>

          {collection.photos.length > 0 && (
            <CounterLabel variant="secondary">
              {collection.index + 1} / {collection.photos.length}
            </CounterLabel>
          )}
        </PrimerStack>

        {showAnalysisButton && !!selectedModel && (
          <IconButton
            aria-label={PROJECT_TOOLTIPS.ANALYSE_PHOTOS}
            disabled={collection.photos.length === 0 || isAnalysing}
            icon={AiModelIcon}
            onClick={handleAnalyseClick}
            size="small"
          />
        )}

        <ButtonGroup>
          <IconButton
            aria-label={PROJECT_TOOLTIPS.EDIT_PHOTO}
            disabled={collection.photos.length <= 0 || revertingPhoto}
            icon={PencilIcon}
            onClick={(event) => {
              event.preventDefault();
              return handleOpenEdit();
            }}
            size="small"
          >
            Edit
          </IconButton>
          <ActionMenu onOpenChange={setActionsOpen} open={actionsOpen}>
            <ActionMenu.Button
              aria-label={PROJECT_TOOLTIPS.MORE_OPTIONS}
              disabled={collection.photos.length <= 0}
              icon={TriangleDownIcon}
              size="small"
            />
            <ActionMenu.Overlay>
              <ActionList>
                <ActionList.Item
                  disabled={
                    collection.photos.length <= 0 || revertingPhoto || !currentPhoto?.isEdited
                  }
                  loading={revertingPhoto}
                  onSelect={handleRevertPhoto}
                  variant="danger"
                >
                  <ActionList.LeadingVisual>
                    <UndoIcon />
                  </ActionList.LeadingVisual>
                  {revertingPhoto
                    ? PROJECT_TOOLTIPS.REVERTING_PHOTO
                    : PROJECT_TOOLTIPS.REVERT_PHOTO}
                </ActionList.Item>
              </ActionList>
            </ActionMenu.Overlay>
          </ActionMenu>
        </ButtonGroup>
      </PrimerStack>
    </>
  );
});

export default Stack;

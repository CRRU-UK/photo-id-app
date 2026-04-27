import { useDraggable } from "@dnd-kit/core";
import {
  AiModelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoIcon,
  KebabHorizontalIcon,
  PencilIcon,
  UndoIcon,
} from "@primer/octicons-react";
import {
  ActionBar,
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
  const { isAnalysing, handleAnalyseMatches } = useAnalysis();
  const [revertingPhoto, setRevertingPhoto] = useState<boolean>(false);

  const selectedProvider = settings?.analysisProviders?.find(
    ({ id }) => id === settings?.selectedAnalysisProviderId,
  );

  const handleAnalyseClick = () => {
    if (collection.photos.length === 0) {
      return;
    }

    void handleAnalyseMatches(
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
          <PrimerStack
            align="center"
            className="stack-info"
            direction="horizontal"
            justify="space-between"
            style={{
              padding: "var(--stack-padding-condensed)",
            }}
          >
            {collection.photos.length > 0 && (
              <CounterLabel style={{ whiteSpace: "nowrap" }} variant="primary">
                {collection.index + 1} / {collection.photos.length}
              </CounterLabel>
            )}
            {currentPhoto && (
              <IconButton aria-label={currentPhoto.fileName} icon={InfoIcon} size="small" />
            )}
          </PrimerStack>

          {currentPhoto && <StackImage photo={currentPhoto} />}
        </div>
      </div>

      <PrimerStack
        align="center"
        direction="horizontal"
        justify="end"
        style={{
          flexWrap: "wrap",
          gap: "var(--app-spacing)",
          marginTop: "var(--app-spacing)",
        }}
      >
        <div style={{ flexShrink: 0, marginRight: "auto" }}>
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
        </div>

        <ActionBar aria-label={PROJECT_TOOLTIPS.STACK_ACTIONS} flush gap="none" size="small">
          {showAnalysisButton && !!selectedProvider && (
            <ActionBar.IconButton
              aria-label={PROJECT_TOOLTIPS.ANALYSIS_MATCH_STACK}
              disabled={collection.photos.length === 0 || isAnalysing}
              icon={AiModelIcon}
              onClick={handleAnalyseClick}
            />
          )}
          <ActionBar.IconButton
            aria-label={PROJECT_TOOLTIPS.EDIT_PHOTO}
            disabled={collection.photos.length <= 0 || revertingPhoto}
            icon={PencilIcon}
            onClick={(event) => {
              event.preventDefault();
              return handleOpenEdit();
            }}
          />
          <ActionBar.Divider />
          <ActionBar.Menu
            aria-label={PROJECT_TOOLTIPS.OTHER_ACTIONS}
            icon={KebabHorizontalIcon}
            items={[
              {
                label: PROJECT_TOOLTIPS.REVERT_PHOTO,
                leadingVisual: UndoIcon,
                variant: "danger",
                disabled:
                  collection.photos.length <= 0 || revertingPhoto || !currentPhoto?.isEdited,
                onClick: handleRevertPhoto,
              },
            ]}
          />
        </ActionBar>
      </PrimerStack>
    </>
  );
});

export default Stack;

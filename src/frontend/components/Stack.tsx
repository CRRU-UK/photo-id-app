import { useDraggable } from "@dnd-kit/core";
import {
  AiModelIcon,
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

import { PROJECT_TOOLTIPS } from "@/constants";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useSettings } from "@/contexts/SettingsContext";
import type Collection from "@/models/Collection";
import type Photo from "@/models/Photo";

interface StackImageProps {
  photo: Photo;
}

const StackImage = observer(({ photo }: StackImageProps) => (
  <img
    src={photo.thumbnailFullPath}
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
    window.electronAPI.openEditWindow(currentPhoto!.toBody());
  };

  const handleRevertPhoto = async () => {
    if (revertingPhoto) {
      return;
    }

    setRevertingPhoto(true);

    const newData = await window.electronAPI.revertPhotoFile(currentPhoto!.toBody());
    currentPhoto!.updatePhoto(newData);

    setActionsOpen(false);
    setRevertingPhoto(false);
  };

  const handlePrev = () => collection.setPreviousPhoto();
  const handleNext = () => collection.setNextPhoto();

  return (
    <>
      <div className="photo-stack">
        <div
          ref={setDraggableNodeRef}
          {...draggableListeners}
          {...attributes}
          onDoubleClick={handleOpenEdit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleOpenEdit();
            }

            // dnd-kit types SyntheticListenerMap handlers as Function
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            draggableOnKeyDown?.(event);
          }}
        >
          {collection?.currentPhoto && <StackImage photo={currentPhoto!} />}
        </div>
      </div>

      <PrimerStack
        direction="horizontal"
        align="center"
        justify="end"
        style={{ marginTop: "var(--stack-gap-normal)" }}
      >
        <PrimerStack
          direction="horizontal"
          align="end"
          justify="space-between"
          style={{ marginRight: "auto" }}
        >
          {collection.photos.length > 0 && (
            <CounterLabel variant="secondary">
              {collection.index + 1} / {collection.photos.length}
            </CounterLabel>
          )}
        </PrimerStack>

        {showAnalysisButton && !!selectedModel && (
          <IconButton
            icon={AiModelIcon}
            size="small"
            aria-label={PROJECT_TOOLTIPS.ANALYSE_PHOTOS}
            disabled={collection.photos.length === 0 || isAnalysing}
            onClick={handleAnalyseClick}
          />
        )}

        <ButtonGroup>
          <IconButton
            icon={PencilIcon}
            size="small"
            aria-label={PROJECT_TOOLTIPS.EDIT_PHOTO}
            onClick={(event) => {
              event.preventDefault();
              return handleOpenEdit();
            }}
            disabled={collection.photos.length <= 0 || revertingPhoto}
          >
            Edit
          </IconButton>
          <ActionMenu open={actionsOpen} onOpenChange={setActionsOpen}>
            <ActionMenu.Button
              aria-label={PROJECT_TOOLTIPS.MORE_OPTIONS}
              icon={TriangleDownIcon}
              size="small"
              disabled={collection.photos.length <= 0}
            />
            <ActionMenu.Overlay>
              <ActionList>
                <ActionList.Item
                  variant="danger"
                  disabled={
                    collection.photos.length <= 0 || revertingPhoto || !currentPhoto?.isEdited
                  }
                  loading={revertingPhoto}
                  onSelect={handleRevertPhoto}
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

        <ButtonGroup>
          <IconButton
            icon={ChevronLeftIcon}
            size="small"
            aria-label={PROJECT_TOOLTIPS.PREVIOUS_PHOTO}
            onClick={handlePrev}
            disabled={collection.photos.length <= 1}
          />
          <IconButton
            icon={ChevronRightIcon}
            size="small"
            aria-label={PROJECT_TOOLTIPS.NEXT_PHOTO}
            onClick={handleNext}
            disabled={collection.photos.length <= 1}
          />
        </ButtonGroup>
      </PrimerStack>
    </>
  );
});

export default Stack;

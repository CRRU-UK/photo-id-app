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

  const selectedModel = settings?.mlModels?.find((m) => m.id === settings?.selectedModelId);
  const isMlConfigured = !!(selectedModel?.endpoint && selectedModel?.apiKey);

  const handleAnalyseClick = () => {
    if (collection.photos.size === 0) {
      return;
    }

    void handleAnalyse(
      Array.from(collection.photos).map((photo) => photo.toBody()),
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
    disabled: collection.photos.size <= 0,
  });

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
        justify="end"
        style={{ marginTop: "var(--stack-gap-normal)" }}
      >
        <PrimerStack
          direction="horizontal"
          align="end"
          justify="space-between"
          style={{ marginRight: "auto" }}
        >
          {collection.photos.size > 0 && (
            <CounterLabel variant="secondary">
              {collection.index + 1} / {collection.photos.size}
            </CounterLabel>
          )}
        </PrimerStack>

        {showAnalysisButton && isMlConfigured && (
          <IconButton
            icon={AiModelIcon}
            size="small"
            aria-label="Analyse photos"
            disabled={collection.photos.size === 0 || isAnalysing}
            onClick={handleAnalyseClick}
          />
        )}

        <ButtonGroup>
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
                    collection.photos.size <= 0 || revertingPhoto || !currentPhoto?.isEdited
                  }
                  loading={revertingPhoto}
                  onSelect={handleRevertPhoto}
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

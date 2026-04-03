import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ColumnsIcon } from "@primer/octicons-react";
import { SegmentedControl, Stack, UnderlineNav } from "@primer/react";
import { KeybindingHint } from "@primer/react/experimental";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { observer } from "mobx-react-lite";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ASPECT_RATIO, MATCHED_STACKS_PER_PAGE, ROUTES } from "@/constants";
import { AnalysisProvider, useAnalysis } from "@/contexts/AnalysisContext";
import { useProject } from "@/contexts/ProjectContext";
import AnalysisOverlay from "@/frontend/components/AnalysisOverlay";
import ErrorBoundary from "@/frontend/components/ErrorBoundary";
import LoadingOverlay from "@/frontend/components/LoadingOverlay";
import Selections from "@/frontend/components/Selections";
import SettingsOverlay from "@/frontend/components/SettingsOverlay";
import Sidebar from "@/frontend/components/Sidebar";
import { chunkArray, getAlphabetLetter } from "@/helpers";
import type Collection from "@/models/Collection";
import type Photo from "@/models/Photo";
import type { DraggableEndData, DraggableStartData, LoadingData, Match } from "@/types";

// Defined outside ProjectPage to prevent unnecessary unmount/remount on parent re-render
const DraggableImageComponent = ({ photo }: { photo: Photo }) => {
  return (
    <img
      alt=""
      src={photo.thumbnailFullPath}
      style={{
        opacity: 0.7,
        display: "block",
        width: "100%",
        height: "100%",
        aspectRatio: ASPECT_RATIO,
        objectFit: "contain",
      }}
    />
  );
};

const DraggableImage = memo(DraggableImageComponent);

interface MatchedPagesProps {
  currentPage: number;
  matchedArray: Match[];
  onPageChange: (index: number) => void;
}

// Extracted to its own memo component so switching pages doesn't recreate all tab elements
const MatchedPagesComponent = ({ matchedArray, currentPage, onPageChange }: MatchedPagesProps) => {
  return chunkArray(matchedArray, MATCHED_STACKS_PER_PAGE).map((item, index) => {
    // biome-ignore lint/style/noNonNullAssertion: chunkArray guarantees non-empty chunks
    const first = item.at(0)!.id;
    // biome-ignore lint/style/noNonNullAssertion: chunkArray guarantees non-empty chunks
    const last = item.at(-1)!.id;

    return (
      <UnderlineNav.Item
        aria-current={index === currentPage ? "page" : undefined}
        key={`${first}-${last}`}
        leadingVisual={<KeybindingHint keys={String(index + 1)} />}
        onClick={(event) => {
          event.preventDefault();
          onPageChange(index);
        }}
      >
        {getAlphabetLetter(first)}-{getAlphabetLetter(last)}
      </UnderlineNav.Item>
    );
  });
};

const MatchedPages = memo(MatchedPagesComponent);

const ProjectPage = observer(() => {
  const [draggingPhoto, setDraggingPhoto] = useState<Photo | null>(null);
  const [draggingCollectionFrom, setDraggingCollectionFrom] = useState<Collection | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [loading, setLoading] = useState<LoadingData>({ show: false });
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [columns, setColumns] = useState<number>(2);

  // Guards against concurrent drag-end executions (e.g. keyboard + pointer firing simultaneously)
  const isDraggingRef = useRef<boolean>(false);

  const navigate = useNavigate();

  const { project, setProject } = useProject();
  const { isAnalysing, result, error, handleClose: handleCloseAnalysis } = useAnalysis();

  const handleCloseProject = useCallback(() => {
    project?.flushSave();
    setProject(null);

    window.electronAPI.closeProject();

    void navigate({ to: ROUTES.INDEX });
  }, [project, navigate, setProject]);

  const analysisOverlayOpen = isAnalysing || result !== null || error !== null;

  useEffect(() => {
    const handleCloseShortcut = (event: KeyboardEvent) => {
      const modifierKey = event.ctrlKey || event.metaKey;
      if (!modifierKey || event.key !== "w") {
        return;
      }

      event.preventDefault();

      if (settingsOpen) {
        setSettingsOpen(false);
        return;
      }

      if (analysisOverlayOpen) {
        handleCloseAnalysis();
        return;
      }

      handleCloseProject();
    };

    document.addEventListener("keydown", handleCloseShortcut);

    return () => {
      document.removeEventListener("keydown", handleCloseShortcut);
    };
  }, [settingsOpen, analysisOverlayOpen, handleCloseAnalysis, handleCloseProject]);

  useEffect(() => {
    if (project === null) {
      void navigate({ to: ROUTES.INDEX });
    }
  }, [project, navigate]);

  useEffect(() => {
    if (draggingPhoto && isCopying) {
      return document.body.classList.add("copying");
    }

    return document.body.classList.remove("copying");
  }, [draggingPhoto, isCopying]);

  const matchedArray = useMemo<Match[]>(() => (project === null ? [] : project.matched), [project]);

  const matchedPageCount = Math.ceil(matchedArray.length / MATCHED_STACKS_PER_PAGE);

  const handleKeyUp = useCallback(() => setIsCopying(false), []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.ctrlKey || event.altKey) {
        return setIsCopying(true);
      }

      const keyNumber = Number(event.key);
      if (!Number.isInteger(keyNumber)) {
        return;
      }

      const pageIndex = keyNumber - 1;
      if (pageIndex < 0 || pageIndex >= matchedPageCount) {
        return;
      }

      event.preventDefault();
      setCurrentPage(pageIndex);
    },
    [matchedPageCount],
  );

  useEffect(() => {
    const unsubscribeLoadProject = window.electronAPI.onLoadProject(() =>
      setLoading({ show: false }),
    );

    return () => {
      unsubscribeLoadProject();
    };
  }, []);

  useEffect(() => {
    if (project === null) {
      return;
    }

    const unsubscribeUpdatePhoto = window.electronAPI.onUpdatePhoto((data) =>
      project.updatePhoto(data),
    );
    const unsubscribeLoading = window.electronAPI.onLoading((data) => setLoading(data));

    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      unsubscribeUpdatePhoto();
      unsubscribeLoading();

      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [project, handleKeyDown, handleKeyUp]);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });

  const sensors = useSensors(pointerSensor);

  const matchedRows = useMemo(
    () =>
      matchedArray.slice(
        currentPage * MATCHED_STACKS_PER_PAGE,
        (currentPage + 1) * MATCHED_STACKS_PER_PAGE,
      ),
    [matchedArray, currentPage],
  );

  if (project === null) {
    return null;
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { collection, currentPhoto } = event.active.data.current as unknown as DraggableStartData;

    isDraggingRef.current = true;

    setDraggingCollectionFrom(collection);
    setDraggingPhoto(currentPhoto);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    // Prevent concurrent execution if drag-end fires multiple times simultaneously
    if (!isDraggingRef.current) {
      return;
    }

    isDraggingRef.current = false;

    const target = event.over ?? null;

    if (target && draggingPhoto !== null && draggingCollectionFrom !== null) {
      const draggingCollectionTo = (target.data.current as DraggableEndData).collection;

      if (isCopying) {
        setLoading({ show: true, text: "Duplicating photo" });

        try {
          await project.duplicatePhotoToStack(draggingCollectionTo, draggingPhoto);
        } finally {
          setLoading({ show: false });
        }

        setDraggingPhoto(null);
        return;
      }

      project.addPhotoToStack(draggingCollectionFrom, draggingCollectionTo, draggingPhoto);
    }

    setDraggingPhoto(null);
  };

  const handleColumnsChange = (i: number) => setColumns(i + 1);

  return (
    <>
      <LoadingOverlay data={loading} />

      <SettingsOverlay
        onClose={() => setSettingsOpen(false)}
        onOpenRequest={() => setSettingsOpen(true)}
        open={settingsOpen}
      />

      <ErrorBoundary recovery={{ label: "Dismiss", onClick: () => {} }}>
        <AnalysisOverlay />
      </ErrorBoundary>

      <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart} sensors={sensors}>
        <DragOverlay dropAnimation={null}>
          {draggingPhoto ? <DraggableImage photo={draggingPhoto} /> : null}
        </DragOverlay>

        <div className={`project ${isCopying ? "copying" : ""}`} data-testid="project-page">
          <Sidebar onCloseProject={handleCloseProject} />

          <Stack align="center" className="pages" direction="horizontal" gap="none">
            <UnderlineNav aria-label="Pages">
              <MatchedPages
                currentPage={currentPage}
                matchedArray={matchedArray}
                onPageChange={setCurrentPage}
              />
            </UnderlineNav>

            <Stack align="center" className="columns" direction="horizontal" gap="normal">
              <ColumnsIcon size={16} />
              <SegmentedControl aria-label="Columns" onChange={handleColumnsChange}>
                <SegmentedControl.Button selected={columns === 1}>1</SegmentedControl.Button>
                <SegmentedControl.Button selected={columns === 2}>2</SegmentedControl.Button>
              </SegmentedControl>
            </Stack>
          </Stack>

          <div className="content">
            <div className="grid" data-columns={columns}>
              <Selections matches={matchedRows} />
            </div>
          </div>
        </div>
      </DndContext>
    </>
  );
});

const ProjectPageWrapper = () => (
  <AnalysisProvider>
    <ProjectPage />
  </AnalysisProvider>
);

export const Route = createFileRoute(ROUTES.PROJECT)({
  component: ProjectPageWrapper,
});

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { FileMovedIcon, ReplyIcon, ThreeBarsIcon } from "@primer/octicons-react";
import {
  ActionList,
  ActionMenu,
  IconButton,
  Stack as PrimerStack,
  UnderlineNav,
} from "@primer/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import type Collection from "@/models/Collection";
import type Photo from "@/models/Photo";
import type { DraggableEndData, DraggableStartData, LoadingData, ProjectBody } from "@/types";

import { MATCHED_STACKS_PER_PAGE, PROJECT_STORAGE_NAME } from "@/constants";
import DiscardedSelection from "@/frontend/modules/DiscardedSelection";
import LoadingOverlay from "@/frontend/modules/LoadingOverlay";
import MainSelection from "@/frontend/modules/MainSelection";
import RowSelection from "@/frontend/modules/RowSelection";
import { chunkArray, getAlphabetLetter } from "@/helpers";
import ProjectModel from "@/models/Project";

const DraggableImage = ({ photo }: { photo: Photo }) => (
  <img
    src={`file://${photo.getThumbnailFullPath()}?${new Date().getTime()}`}
    style={{
      opacity: 0.7,
      display: "block",
      width: "100%",
      height: "100%",
      aspectRatio: "4/3",
      objectFit: "cover",
    }}
    alt=""
  />
);

const ProjectPage = () => {
  const [draggingPhoto, setDraggingPhoto] = useState<Photo | null>(null);
  const [draggingCollectionFrom, setDraggingCollectionFrom] = useState<Collection | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [loading, setLoading] = useState<LoadingData>({ show: false });
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [actionsOpen, setActionsOpen] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  const project = useMemo(() => {
    const projectData = JSON.parse(
      localStorage.getItem(PROJECT_STORAGE_NAME) as string,
    ) as ProjectBody;
    return new ProjectModel().loadFromJSON(projectData);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const { collection, currentPhoto } = event.active.data.current as unknown as DraggableStartData;
    setDraggingCollectionFrom(collection);
    setDraggingPhoto(currentPhoto);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const target = event.over ?? null;
    if (target) {
      const draggingCollectionTo = (target.data.current as DraggableEndData).collection;

      if (isCopying) {
        setLoading({ show: true, text: "Duplicating photo" });
        await project.duplicatePhotoToStack(draggingCollectionTo, draggingPhoto as Photo);
        setLoading({ show: false });
      } else {
        project.addPhotoToStack(
          draggingCollectionFrom as Collection,
          draggingCollectionTo,
          draggingPhoto as Photo,
        );
      }
    }

    setDraggingPhoto(null);
  };

  const navigate = useNavigate();

  useEffect(() => {
    window.electronAPI.onLoading((data) => setLoading(data));

    /**
     * TODO: Fix this, buggy when navigating back and then to a project
     */
    window.electronAPI.onLoadProject((data) => {
      localStorage.setItem(PROJECT_STORAGE_NAME, JSON.stringify(data));
      window.location.reload();
    });

    document.addEventListener("keyup", () => setIsCopying(false));
    document.addEventListener("keydown", (event) => setIsCopying(event.ctrlKey || event.altKey));
  });

  useEffect(() => {
    if (draggingPhoto && isCopying) {
      return document.body.classList.add("copying");
    }
    return document.body.classList.remove("copying");
  }, [draggingPhoto, isCopying]);

  useEffect(() => {}, [project.unassigned.index]);

  const handleClose = () => navigate({ to: "/" });

  const handleExport = async () => {
    setExporting(true);

    await project.exportMatches();

    setActionsOpen(false);
    setExporting(false);
  };

  const matchedArray = Array.from(project.matched);

  const matchedRows = matchedArray.slice(
    currentPage * MATCHED_STACKS_PER_PAGE,
    (currentPage + 1) * MATCHED_STACKS_PER_PAGE,
  );

  const matchedPages = chunkArray(matchedArray, MATCHED_STACKS_PER_PAGE).map((item, index) => {
    const first = item[0].id;
    const last = item[item.length - 1].id;

    return (
      <UnderlineNav.Item
        aria-current={index === currentPage ? "page" : undefined}
        onClick={(event) => {
          event.preventDefault();
          return setCurrentPage(index);
        }}
        key={`${first}-${last}`}
      >
        {getAlphabetLetter(first)}-{getAlphabetLetter(last)}
      </UnderlineNav.Item>
    );
  });

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const sensors = useSensors(pointerSensor);

  return (
    <>
      <LoadingOverlay show={loading.show} text={loading?.text} />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <DragOverlay dropAnimation={null}>
          {draggingPhoto ? <DraggableImage photo={draggingPhoto} /> : null}
        </DragOverlay>

        <div className={`project ${isCopying ? "copying" : ""}`}>
          <div className="sidebar">
            <PrimerStack
              direction="vertical"
              align="start"
              justify="space-between"
              padding="normal"
              style={{ minHeight: "100%" }}
            >
              <MainSelection collection={project.unassigned} total={project.totalPhotos} />
              <DiscardedSelection collection={project.discarded} />

              <PrimerStack
                direction="horizontal"
                align="start"
                justify="space-between"
                style={{ marginTop: "auto", width: "100%" }}
              >
                <IconButton
                  icon={ReplyIcon}
                  variant="invisible"
                  aria-label="Close project"
                  onClick={() => handleClose()}
                />

                <ActionMenu open={actionsOpen} onOpenChange={setActionsOpen}>
                  <ActionMenu.Button leadingVisual={ThreeBarsIcon}>Actions</ActionMenu.Button>
                  <ActionMenu.Overlay>
                    <ActionList>
                      <ActionList.Item
                        disabled={exporting}
                        loading={exporting}
                        onClick={() => handleExport()}
                      >
                        <ActionList.LeadingVisual>
                          <FileMovedIcon />
                        </ActionList.LeadingVisual>
                        {exporting ? "Exporting..." : "Export matches"}
                      </ActionList.Item>
                    </ActionList>
                  </ActionMenu.Overlay>
                </ActionMenu>
              </PrimerStack>
            </PrimerStack>
          </div>

          <UnderlineNav aria-label="Pages" className="pages">
            {matchedPages}
          </UnderlineNav>

          <div className="content">
            <div className="grid">
              {matchedRows.map((item) => (
                <RowSelection key={item.id} match={item} />
              ))}
            </div>
          </div>
        </div>
      </DndContext>
    </>
  );
};

export const Route = createFileRoute("/project")({
  component: ProjectPage,
});

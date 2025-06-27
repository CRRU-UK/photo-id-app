import type Photo from "@/models/Photo";
import type { DraggableStartData, DraggableEndData, PhotoStack } from "../types";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { type DragStartEvent, type DragEndEvent, DragOverlay, DndContext } from "@dnd-kit/core";
import { Stack as PrimerStack, IconButton, UnderlineNav } from "@primer/react";
import { ReplyIcon } from "@primer/octicons-react";

import { PROJECT_STORAGE_NAME, MATCHED_STACKS_PER_PAGE } from "@/constants";
import ProjectModel from "@/models/Project";
import LoadingOverlay, { type LoadingOverlayProps } from "@/frontend/modules/LoadingOverlay";
import MainSelection from "@/frontend/modules/MainSelection";
import DiscardedSelection from "@/frontend/modules/DiscardedSelection";
import RowSelection from "@/frontend/modules/RowSelection";

import { getAlphabetLetter, chunkArray } from "@/helpers";

const DraggableImage = ({ photo }: { photo: Photo }) => (
  <img
    src={`file://${photo.getThumbnailFullPath()}`}
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
  const [draggingStackFrom, setDraggingStackFrom] = useState<PhotoStack | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [loading, setLoading] = useState<LoadingOverlayProps>({ show: false });

  /**
   * TODO: Review this, refreshing the page or opening the app after standby causes the state to
   * serialize as an object. Even if a project is then initialized from the router state, it will
   * revert to the initial version on subsequent refreshes (using useRouterState).
   */
  const project = useMemo(() => {
    const projectData = JSON.parse(localStorage.getItem(PROJECT_STORAGE_NAME) as string);
    console.log("projectData", projectData);
    return new ProjectModel().loadFromJSON(projectData);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const { stack, currentFile } = event.active.data.current as unknown as DraggableStartData;
    setDraggingStackFrom(stack);
    setDraggingPhoto(currentFile);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const target = event.over ?? null;
    if (target) {
      const draggingStackTo = (target.data.current as DraggableEndData).photos;
      return project.addPhotoToStack(
        draggingStackFrom as PhotoStack,
        draggingStackTo,
        draggingPhoto as Photo,
      );
    }

    setDraggingPhoto(null);
  };

  const navigate = useNavigate();

  useEffect(() => {
    console.log("mounting...");

    window.electronAPI.onLoading((show, text) => setLoading({ show, text }));

    window.electronAPI.onLoadProject((data) => {
      localStorage.setItem(PROJECT_STORAGE_NAME, JSON.stringify(data));
      window.location.reload();
    });
  });

  const handleClose = () => navigate({ to: "/" });

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

  return (
    <>
      <LoadingOverlay show={loading.show} text={loading?.text} />

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <DragOverlay>{draggingPhoto ? <DraggableImage photo={draggingPhoto} /> : null}</DragOverlay>

        <div className="project">
          <div className="sidebar">
            <PrimerStack
              direction="vertical"
              align="start"
              justify="space-between"
              padding="normal"
              style={{ minHeight: "100%" }}
            >
              <MainSelection photos={project.photos} total={project.totalPhotos} />
              <DiscardedSelection photos={project.discarded} />

              <div style={{ marginTop: "auto" }}>
                <IconButton
                  icon={ReplyIcon}
                  variant="invisible"
                  aria-label="Close project"
                  onClick={() => handleClose()}
                />
              </div>
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

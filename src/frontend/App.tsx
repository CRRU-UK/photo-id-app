import type Photo from "@/models/Photo";
import type { DraggableStartData, DraggableEndData, PhotoStack } from "../types";

import { useState, useEffect } from "react";
import { type DragStartEvent, type DragEndEvent, DragOverlay, DndContext } from "@dnd-kit/core";
import { SplitPageLayout, Stack as PrimerStack, Text, BranchName } from "@primer/react";
import { FileDirectoryOpenFillIcon } from "@primer/octicons-react";

import { SIDEBAR_WIDTHS, MATCHED_STACKS_PER_PAGE } from "@/constants";

import Project from "@/models/Project";

import MainSelection from "@/frontend/modules/MainSelection";
import DiscardedSelection from "@/frontend/modules/DiscardedSelection";
import RowSelection from "@/frontend/modules/RowSelection";
import StartPage from "@/frontend/modules/StartPage";

const DraggableImage = ({ photo }: { photo: Photo }) => (
  <img
    src={photo.getFullPath()}
    style={{
      opacity: 0.5,
      display: "block",
      width: "200px",
      height: "auto",
      aspectRatio: "4/3",
      objectFit: "cover",
    }}
    alt=""
  />
);

const App = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [draggingPhoto, setDraggingPhoto] = useState<Photo>(null);
  const [draggingStackFrom, setDraggingStackFrom] = useState<PhotoStack>(null);
  const [currentPage] = useState<number>(0);

  const handleDragStart = (event: DragStartEvent) => {
    const { stack, currentFile } = event.active.data.current as unknown as DraggableStartData;
    setDraggingStackFrom(stack);
    setDraggingPhoto(currentFile);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const target = event.over || null;
    if (target) {
      const draggingStackTo = (target.data.current as DraggableEndData).photos;
      return project.addPhotoToStack(draggingStackFrom, draggingStackTo, draggingPhoto);
    }

    setDraggingPhoto(null);
  };

  useEffect(() => {
    window.electronAPI.onLoadProject((data) => {
      const project = new Project().loadFromJSON(data);
      setProject(project);
    });
  }, []);

  if (!project) {
    return <StartPage />;
  }

  const matchedRows = Array.from(project.matched).slice(
    currentPage * MATCHED_STACKS_PER_PAGE,
    (currentPage + 1) * MATCHED_STACKS_PER_PAGE,
  );

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <DragOverlay>{draggingPhoto ? <DraggableImage photo={draggingPhoto} /> : null}</DragOverlay>

      <div style={{ backgroundColor: "var(--bgColor-default)" }}>
        <SplitPageLayout>
          <SplitPageLayout.Pane
            position="start"
            width={{
              min: `${SIDEBAR_WIDTHS.MIN}px`,
              max: `${SIDEBAR_WIDTHS.MAX}px`,
              default: `${SIDEBAR_WIDTHS.DEFAULT}px`,
            }}
            resizable
            sticky
            style={{ minHeight: "100vh" }}
          >
            <PrimerStack
              direction="vertical"
              align="start"
              justify="space-between"
              style={{ height: "100%" }}
            >
              {project && <MainSelection photos={project.photos} total={project.totalPhotos} />}
              {project && <DiscardedSelection photos={project.discarded} />}

              {project?.directory && (
                <div style={{ marginTop: "auto" }}>
                  <Text
                    size="small"
                    weight="light"
                    sx={{ display: "block", color: "var(--fgColor-muted)" }}
                  >
                    <FileDirectoryOpenFillIcon size="small" />
                    Currently viewing:
                  </Text>
                  <BranchName>{project.directory}</BranchName>
                </div>
              )}
            </PrimerStack>
          </SplitPageLayout.Pane>

          <SplitPageLayout.Content>
            <div className="grid">
              {matchedRows.map((item) => (
                <RowSelection key={item.id} match={item} />
              ))}
            </div>
          </SplitPageLayout.Content>
        </SplitPageLayout>
      </div>
    </DndContext>
  );
};

export default App;

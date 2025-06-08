import type Photo from "@/models/Photo";
import type { DraggableStartData, DraggableEndData, PhotoStack } from "../types";

import { useState, useEffect } from "react";
import { type DragStartEvent, type DragEndEvent, DragOverlay, DndContext } from "@dnd-kit/core";
import { SplitPageLayout, Stack as PrimerStack, Text, BranchName } from "@primer/react";
import { FileDirectoryOpenFillIcon } from "@primer/octicons-react";

import { SIDEBAR_WIDTHS } from "@/constants";

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

  const handleDragStart = (event: DragStartEvent) => {
    const { stack, currentFile } = event.active.data.current as unknown as DraggableStartData;
    setDraggingStackFrom(stack);
    setDraggingPhoto(currentFile);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    console.debug("event", event);

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

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <DragOverlay>{draggingPhoto ? <DraggableImage photo={draggingPhoto} /> : null}</DragOverlay>

      <SplitPageLayout sx={{ backgroundColor: "var(--bgColor-default)", height: "100vh" }}>
        <SplitPageLayout.Pane
          position="start"
          width={{
            min: `${SIDEBAR_WIDTHS.MIN}px`,
            max: `${SIDEBAR_WIDTHS.MAX}px`,
            default: `${SIDEBAR_WIDTHS.DEFAULT}px`,
          }}
          sx={{ height: "100vh" }}
          resizable
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

        <SplitPageLayout.Content
          sx={{ minHeight: "100vh", backgroundColor: "var(--bgColor-inset)" }}
        >
          {Array.from(project.matched).map((item) => (
            <RowSelection key={item.id} match={item} />
          ))}
        </SplitPageLayout.Content>
      </SplitPageLayout>
    </DndContext>
  );
};

export default App;

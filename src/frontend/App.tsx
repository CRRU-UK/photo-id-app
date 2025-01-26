import type Photo from "../models/Photo";

import { useState, useEffect } from "react";
import { type DragStartEvent, type DragEndEvent, DragOverlay, DndContext } from "@dnd-kit/core";
import { SplitPageLayout, Stack, Box, Text, BranchName } from "@primer/react";
import { FileDirectoryOpenFillIcon } from "@primer/octicons-react";

import { DragAreas, SIDEBAR_WIDTHS } from "../helpers/constants";

import Project from "../models/Project";

import MainSelection from "./modules/MainSelection";
import DiscardedSelection from "./modules/DiscardedSelection";
import Placeholder from "./modules/Placeholder";

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

  const handleOpenProjectFolder = () => window.electronAPI.openProjectFolder();
  const handleOpenProjectFile = () => window.electronAPI.openProjectFile();

  const handleDragStart = (event: DragStartEvent) =>
    setDraggingPhoto(event.active.data.current as Photo);

  const handleDragEnd = (event: DragEndEvent) => {
    const id = event.over?.id || null;

    if (id === DragAreas.MainSelection) {
      return project.addPhotoToSelection(draggingPhoto);
    }

    if (id === DragAreas.DiscardedSelection) {
      return project.addPhotoToDiscarded(draggingPhoto);
    }

    setDraggingPhoto(null);
  };

  useEffect(() => {
    window.electronAPI.onLoadProject((data) => {
      const project = new Project().loadFromJSON(data);
      setProject(project);
    });
  }, []);

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
          <Stack
            direction="vertical"
            align="start"
            justify="space-between"
            style={{ height: "100%" }}
          >
            {project && <MainSelection photos={project.photos} total={project.totalPhotos} />}
            {project && <DiscardedSelection photos={project.discarded} />}

            {project?.directory && (
              <Box sx={{ marginTop: "auto" }}>
                <Text
                  size="small"
                  weight="light"
                  sx={{ display: "block", color: "var(--fgColor-muted)" }}
                >
                  <FileDirectoryOpenFillIcon size="small" />
                  Currently viewing:
                </Text>
                <BranchName>{project.directory}</BranchName>
              </Box>
            )}
          </Stack>
        </SplitPageLayout.Pane>

        <SplitPageLayout.Content
          sx={{ minHeight: "100vh", backgroundColor: "var(--bgColor-inset)" }}
        >
          {!project && (
            <Placeholder
              openProjectFolderCallback={handleOpenProjectFolder}
              openProjectFileCallback={handleOpenProjectFile}
            />
          )}
        </SplitPageLayout.Content>
      </SplitPageLayout>
    </DndContext>
  );
};

export default App;

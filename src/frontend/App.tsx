import type Photo from "@/models/Photo";
import type { DraggableStartData, DraggableEndData, PhotoStack } from "../types";

import { useState, useEffect } from "react";
import { type DragStartEvent, type DragEndEvent, DragOverlay, DndContext } from "@dnd-kit/core";
import { Stack as PrimerStack, Text, BranchName, UnderlineNav } from "@primer/react";
import { FileDirectoryOpenFillIcon } from "@primer/octicons-react";

import { MATCHED_STACKS_PER_PAGE } from "@/constants";

import Project from "@/models/Project";

import MainSelection from "@/frontend/modules/MainSelection";
import DiscardedSelection from "@/frontend/modules/DiscardedSelection";
import RowSelection from "@/frontend/modules/RowSelection";
import StartPage from "@/frontend/modules/StartPage";

import { getAlphabetLetter, chunkArray } from "@/helpers";

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
  const [currentPage, setCurrentPage] = useState<number>(0);

  const handleDragStart = (event: DragStartEvent) => {
    const { stack, currentFile } = event.active.data.current as unknown as DraggableStartData;
    setDraggingStackFrom(stack);
    setDraggingPhoto(currentFile);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const target = event.over ?? null;
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
        onClick={() => setCurrentPage(index)}
        key={index}
      >
        {getAlphabetLetter(first)}-{getAlphabetLetter(last)}
      </UnderlineNav.Item>
    );
  });

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <DragOverlay>{draggingPhoto ? <DraggableImage photo={draggingPhoto} /> : null}</DragOverlay>

      <div className="main">
        <div className="sidebar">
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
        </div>

        <div className="content">
          <UnderlineNav aria-label="Pages">{matchedPages}</UnderlineNav>
          <div className="grid">
            {matchedRows.map((item) => (
              <RowSelection key={item.id} match={item} />
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  );
};

export default App;

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { UnderlineNav } from "@primer/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import type Collection from "@/models/Collection";
import type Photo from "@/models/Photo";
import type { DraggableEndData, DraggableStartData, LoadingData, ProjectBody } from "@/types";

import { MATCHED_STACKS_PER_PAGE, PROJECT_STORAGE_NAME } from "@/constants";

import ProjectContext from "@/contexts/ProjectContext";

import LoadingOverlay from "@/frontend/components/LoadingOverlay";
import Selections from "@/frontend/components/Selections";
import Sidebar from "@/frontend/components/Sidebar";

import { chunkArray, getAlphabetLetter } from "@/helpers";

import ProjectModel from "@/models/Project";

const DraggableImage = ({ photo }: { photo: Photo }) => (
  <img
    src={`file://${photo.thumbnailFullPath}`}
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

  const project = useMemo(() => {
    const projectData = JSON.parse(
      localStorage.getItem(PROJECT_STORAGE_NAME) as string,
    ) as ProjectBody;
    return new ProjectModel(projectData);
  }, []);

  useEffect(() => {
    // Rename this and also handle adding edited to photo (but need to account for reversion)
    window.electronAPI.onUpdatePhoto((data) => project.updatePhoto(data));
    window.electronAPI.onLoading((data) => setLoading(data));

    document.addEventListener("keyup", handleKeyDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [project]);

  useEffect(() => {
    if (draggingPhoto && isCopying) {
      return document.body.classList.add("copying");
    }
    return document.body.classList.remove("copying");
  }, [draggingPhoto, isCopying]);

  const handleKeyUp = () => setIsCopying(false);

  const handleKeyDown = (event: KeyboardEvent) => setIsCopying(event.ctrlKey || event.altKey);

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

        return;
      }

      project.addPhotoToStack(
        draggingCollectionFrom as Collection,
        draggingCollectionTo,
        draggingPhoto as Photo,
      );
    }

    setDraggingPhoto(null);
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
    <ProjectContext value={project}>
      <LoadingOverlay show={loading.show} text={loading?.text} />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <DragOverlay dropAnimation={null}>
          {draggingPhoto ? <DraggableImage photo={draggingPhoto} /> : null}
        </DragOverlay>

        <div className={`project ${isCopying ? "copying" : ""}`}>
          <Sidebar />

          <UnderlineNav aria-label="Pages" className="pages">
            {matchedPages}
          </UnderlineNav>

          <div className="content">
            <div className="grid">
              <Selections matches={matchedRows} />
            </div>
          </div>
        </div>
      </DndContext>
    </ProjectContext>
  );
};

export const Route = createFileRoute("/project")({
  component: ProjectPage,
});

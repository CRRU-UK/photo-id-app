import { type DragStartEvent, type DragEndEvent, DragOverlay, DndContext } from "@dnd-kit/core";
import { ReplyIcon, ThreeBarsIcon, FileMovedIcon } from "@primer/octicons-react";
import {
  Stack as PrimerStack,
  ActionMenu,
  ActionList,
  IconButton,
  UnderlineNav,
} from "@primer/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";

import { PROJECT_STORAGE_NAME, MATCHED_STACKS_PER_PAGE } from "@/constants";
import DiscardedSelection from "@/frontend/modules/DiscardedSelection";
import LoadingOverlay from "@/frontend/modules/LoadingOverlay";
import MainSelection from "@/frontend/modules/MainSelection";
import RowSelection from "@/frontend/modules/RowSelection";
import { getAlphabetLetter, chunkArray } from "@/helpers";
import type Photo from "@/models/Photo";
import ProjectModel from "@/models/Project";
import type {
  DraggableStartData,
  DraggableEndData,
  PhotoStack,
  ProjectBody,
  LoadingData,
} from "@/types";

const DraggableImage = ({ photo }: { photo: Photo }) => (
  <img
    src={photo.getThumbnailData()}
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

  useEffect(() => {
    window.electronAPI.onUpdatePhotoData((data) => {
      project.updatePhotoData(data).save();
    });
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { stack, currentFile } = event.active.data.current as unknown as DraggableStartData;
    setDraggingStackFrom(stack);
    setDraggingPhoto(currentFile);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const target = event.over ?? null;
    if (target) {
      const draggingStackTo = (target.data.current as DraggableEndData).photos;

      if (isCopying) {
        setLoading({ show: true, text: "Duplicating photo" });
        await project.duplicatePhotoToStack(draggingStackTo, draggingPhoto as Photo);
        setLoading({ show: false });
      } else {
        project.addPhotoToStack(
          draggingStackFrom as PhotoStack,
          draggingStackTo,
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

  return (
    <>
      <LoadingOverlay show={loading.show} text={loading?.text} />

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <DragOverlay>{draggingPhoto ? <DraggableImage photo={draggingPhoto} /> : null}</DragOverlay>

        <div className={`project ${isCopying ? "copying" : ""}`}>
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

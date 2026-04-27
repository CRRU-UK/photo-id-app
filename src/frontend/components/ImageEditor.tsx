import { EyeClosedIcon, EyeIcon } from "@primer/octicons-react";
import { IconButton, Stack } from "@primer/react";
import { memo, type RefObject, useCallback, useEffect, useRef, useState } from "react";
import {
  EDGE_DETECTION,
  EDITOR_KEYS,
  EDITOR_TOOLTIPS,
  IMAGE_FILTERS,
  KEYBOARD_CODE_TO_PAN_DIRECTION,
  LOUPE,
  UNSAVED_EDITS_MESSAGE,
} from "@/constants";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useSettings } from "@/contexts/SettingsContext";
import LoadingOverlay from "@/frontend/components/LoadingOverlay";
import Slider from "@/frontend/components/Slider";
import Toolbar from "@/frontend/components/Toolbar";
import useImageEditor from "@/frontend/hooks/useImageEditor";
import { computeIsEdited } from "@/helpers";
import type { EditorNavigation, PhotoBody } from "@/types";

interface CanvasImageProps {
  handlePointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerLeave: () => void;
  handlePointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: () => void;
  loupeEnabled: boolean;
}

const CanvasImage = ({
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handlePointerLeave,
  loupeEnabled,
  ref,
}: CanvasImageProps & { ref?: RefObject<HTMLCanvasElement | null> }) => {
  return (
    <canvas
      className={loupeEnabled ? "canvas-photo loupe-active" : "canvas-photo"}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={ref}
    />
  );
};

CanvasImage.displayName = "CanvasImage";

interface ImageEditorProps {
  data: PhotoBody;
  image: File;
  onError?: () => void;
  onImageLoaded?: () => void;
  setQueryCallback: React.Dispatch<React.SetStateAction<string>>;
}

const ImageEditor = ({
  data,
  image,
  setQueryCallback,
  onImageLoaded,
  onError,
}: ImageEditorProps) => {
  console.debug("Loaded photo edit data:", data);

  const [saving, setSaving] = useState<boolean>(false);
  const [navigating, setNavigating] = useState<boolean>(false);
  const [loupeEnabled, setLoupeEnabled] = useState<boolean>(false);

  const navigatingRef = useRef<boolean>(false);

  const edits = data.edits;

  /**
   * Tracks the last saved edits so hasUnsavedEdits can compare against them. Updated on save
   * because the edit window does not receive UPDATE_PHOTO (only the main window does). Only reset
   * from props when the photo changes (navigation), not on every render.
   */
  const savedEditsRef = useRef(edits);

  const photoId = `${data.directory}/${data.name}`;
  const previousPhotoIdForEditsRef = useRef(photoId);

  if (previousPhotoIdForEditsRef.current !== photoId) {
    previousPhotoIdForEditsRef.current = photoId;
    savedEditsRef.current = edits;
  }

  const [sliderInitials, setSliderInitials] = useState({
    brightness: edits.brightness,
    contrast: edits.contrast,
    saturate: edits.saturate,
  });

  const { settings } = useSettings();
  const selectedProvider = settings?.analysisProviders?.find(
    ({ id }) => id === settings?.selectedAnalysisProviderId,
  );

  const {
    handleAnalyse,
    handleClose: handleCloseAnalysis,
    isAnalysing,
    result,
    error,
  } = useAnalysis();

  const analysisOverlayOpen = isAnalysing || result !== null || error !== null;

  const { refs, state, getters, filters, handlers, actions } = useImageEditor({
    file: image,
    loupeEnabled,
    onError,
  });

  const handleCanvasPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      handlers.handlePointerMove(event);
      handlers.handleLoupeMove(event);
    },
    [handlers.handlePointerMove, handlers.handleLoupeMove],
  );

  const handleCanvasPointerLeave = useCallback(() => {
    handlers.handlePointerUp();
    handlers.handleLoupeLeave();
  }, [handlers.handlePointerUp, handlers.handleLoupeLeave]);

  const handleToggleLoupe = useCallback(() => {
    setLoupeEnabled((prev) => {
      if (prev) {
        handlers.handleLoupeLeave();
      }

      return !prev;
    });
  }, [handlers.handleLoupeLeave]);

  const [edgeDetectionEnabled, setEdgeDetectionEnabled] = useState<boolean>(false);
  const edgeDetectionValueRef = useRef<number>(EDGE_DETECTION.DEFAULT);

  const handleToggleEdgeDetection = useCallback(() => {
    const newEnabled = !edgeDetectionEnabled;
    setEdgeDetectionEnabled(newEnabled);

    if (newEnabled) {
      return filters.setEdgeDetection({ enabled: true, value: edgeDetectionValueRef.current });
    }

    // When toggling off, just disable it (but keep the value in the ref)
    return filters.setEdgeDetection({ enabled: false });
  }, [edgeDetectionEnabled, filters]);

  const handleEdgeDetectionValue = useCallback(
    (value: number) => {
      edgeDetectionValueRef.current = value;
      filters.setEdgeDetection({ enabled: true, value });
    },
    [filters],
  );

  const resetEdgeDetection = useCallback(() => {
    setEdgeDetectionEnabled(false);
    edgeDetectionValueRef.current = EDGE_DETECTION.DEFAULT;
    filters.setEdgeDetection({ enabled: false });
  }, [filters]);

  const handleReset = useCallback(() => {
    actions.resetAll();
    resetEdgeDetection();
    setLoupeEnabled(false);
    setSliderInitials({
      brightness: IMAGE_FILTERS.BRIGHTNESS.DEFAULT,
      contrast: IMAGE_FILTERS.CONTRAST.DEFAULT,
      saturate: IMAGE_FILTERS.SATURATE.DEFAULT,
    });
  }, [actions, resetEdgeDetection]);

  const handleSave = useCallback(async () => {
    setSaving(true);

    try {
      const currentFilters = getters.getFilters();
      const transform = getters.getTransform();

      const edits = {
        brightness: currentFilters.brightness,
        contrast: currentFilters.contrast,
        saturate: currentFilters.saturate,
        zoom: transform.zoom,
        pan: transform.pan,
      };

      await window.electronAPI.savePhotoFile({
        ...data,
        edits,
        isEdited: computeIsEdited(edits),
      });

      savedEditsRef.current = edits;
    } catch (error) {
      console.error("Failed to save edited photo file:", error);
    } finally {
      setSaving(false);
    }
  }, [data, getters]);

  const handleAnalysis = useCallback(() => {
    if (!selectedProvider) {
      return;
    }

    const currentFilters = getters.getFilters();
    const transform = getters.getTransform();

    const currentEdits = {
      brightness: currentFilters.brightness,
      contrast: currentFilters.contrast,
      saturate: currentFilters.saturate,
      zoom: transform.zoom,
      pan: transform.pan,
    };

    void handleAnalyse(
      [{ ...data, edits: currentEdits, isEdited: computeIsEdited(currentEdits) }],
      data.name,
    );
  }, [data, getters, handleAnalyse, selectedProvider]);

  /**
   * Ref ensures the dirty check always reads the latest getters without re-subscribing on every
   * change. Used by `beforeunload` and navigation confirmation.
   */
  const gettersRef = useRef(getters);
  gettersRef.current = getters;

  const hasUnsavedEdits = useCallback((): boolean => {
    const saved = savedEditsRef.current;
    const currentFilters = gettersRef.current.getFilters();
    const currentTransform = gettersRef.current.getTransform();

    return (
      currentFilters.brightness !== saved.brightness ||
      currentFilters.contrast !== saved.contrast ||
      currentFilters.saturate !== saved.saturate ||
      currentTransform.zoom !== saved.zoom ||
      currentTransform.pan.x !== saved.pan.x ||
      currentTransform.pan.y !== saved.pan.y
    );
  }, []);

  const handleEditorNavigation = useCallback(
    async (direction: EditorNavigation) => {
      if (navigatingRef.current) {
        return;
      }

      if (hasUnsavedEdits()) {
        const discard = window.confirm(UNSAVED_EDITS_MESSAGE);
        if (!discard) {
          return;
        }
      }

      handleCloseAnalysis();

      navigatingRef.current = true;
      setNavigating(true);

      const result = await window.electronAPI.navigateEditorPhoto(data, direction);

      navigatingRef.current = false;
      setNavigating(false);

      if (result) {
        setQueryCallback(result);
      }
    },
    [data, setQueryCallback, hasUnsavedEdits, handleCloseAnalysis],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const modifierKey = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (modifierKey) {
        if (key === EDITOR_KEYS.RESET.code) {
          event.preventDefault();
          return handleReset();
        }

        if (key === EDITOR_KEYS.SAVE.code) {
          event.preventDefault();
          return handleSave();
        }

        if (key === EDITOR_KEYS.ZOOM_OUT.code) {
          event.preventDefault();
          return handlers.handleZoomOut();
        }

        if (key === EDITOR_KEYS.ZOOM_IN.code) {
          event.preventDefault();
          return handlers.handleZoomIn();
        }

        if (key === EDITOR_KEYS.ANALYSE.code) {
          event.preventDefault();
          return handleAnalysis();
        }

        return;
      }

      const panDirection = KEYBOARD_CODE_TO_PAN_DIRECTION?.[event.code];
      if (panDirection) {
        event.preventDefault();
        return handlers.handleDirectionalPan(panDirection);
      }

      if (key === EDITOR_KEYS.PREVIOUS_PHOTO.code) {
        event.preventDefault();
        return handleEditorNavigation("prev");
      }

      if (key === EDITOR_KEYS.NEXT_PHOTO.code) {
        event.preventDefault();
        return handleEditorNavigation("next");
      }

      const isInteractiveTarget =
        event.target instanceof HTMLButtonElement ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement;

      if (!isInteractiveTarget && event.code === EDITOR_KEYS.TOGGLE_LOUPE.code) {
        event.preventDefault();
        return handleToggleLoupe();
      }

      if (key === EDITOR_KEYS.TOGGLE_EDGE_DETECTION.code) {
        event.preventDefault();
        return handleToggleEdgeDetection();
      }
    },
    [
      handlers.handleDirectionalPan,
      handleEditorNavigation,
      handleToggleLoupe,
      handleToggleEdgeDetection,
      handleReset,
      handleSave,
      handleAnalysis,
      handlers.handleZoomOut,
      handlers.handleZoomIn,
    ],
  );

  const previousPhotoIdRef = useRef<string>(`${data.directory}/${data.name}`);
  const loadedPhotoIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentPhotoId = `${data.directory}/${data.name}`;

    if (previousPhotoIdRef.current !== currentPhotoId) {
      previousPhotoIdRef.current = currentPhotoId;
    }
  }, [data.directory, data.name]);

  useEffect(() => {
    const currentPhotoId = `${data.directory}/${data.name}`;
    let frameId: number | undefined;

    if (state.imageLoaded && loadedPhotoIdRef.current !== currentPhotoId) {
      loadedPhotoIdRef.current = currentPhotoId;

      actions.applyEdits(edits);
      setSliderInitials({
        brightness: edits.brightness,
        contrast: edits.contrast,
        saturate: edits.saturate,
      });

      resetEdgeDetection();
      setLoupeEnabled(false);

      actions.draw();

      frameId = requestAnimationFrame(() => {
        setNavigating(false);
        onImageLoaded?.();
      });
    }

    return () => {
      if (frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [
    data.directory,
    data.name,
    state.imageLoaded,
    actions,
    resetEdgeDetection,
    edits,
    onImageLoaded,
  ]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally omit refs.canvasRef so this effect only re-runs when handleWheel or handleKeyDown change
  useEffect(() => {
    const canvas = refs.canvasRef.current;

    if (!canvas) {
      return;
    }

    canvas.addEventListener("wheel", handlers.handleWheel, { passive: false });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      canvas.removeEventListener("wheel", handlers.handleWheel);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handlers.handleWheel, handleKeyDown]);

  // Close the analysis overlay when it is open instead of closing the window
  useEffect(() => {
    const handleCloseShortcut = (event: KeyboardEvent) => {
      const modifierKey = event.ctrlKey || event.metaKey;
      if (!modifierKey || event.key.toLowerCase() !== "w") {
        return;
      }

      if (analysisOverlayOpen) {
        event.preventDefault();
        handleCloseAnalysis();
      }
    };

    document.addEventListener("keydown", handleCloseShortcut);

    return () => {
      document.removeEventListener("keydown", handleCloseShortcut);
    };
  }, [analysisOverlayOpen, handleCloseAnalysis]);

  // Warn the user before closing the edit window when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedEdits()) {
        event.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedEdits]);

  return (
    <>
      <LoadingOverlay data={{ show: navigating }} />

      <div className="edit">
        <CanvasImage
          handlePointerDown={handlers.handlePointerDown}
          handlePointerLeave={handleCanvasPointerLeave}
          handlePointerMove={handleCanvasPointerMove}
          handlePointerUp={handlers.handlePointerUp}
          loupeEnabled={loupeEnabled}
          ref={refs.canvasRef}
        />

        <div className="loupe" ref={refs.loupeContainerRef}>
          <canvas
            className="canvas-loupe"
            height={LOUPE.SIZE}
            ref={refs.loupeCanvasRef}
            width={LOUPE.SIZE}
          />
        </div>

        <Stack align="center" className="edge-toggle" direction="horizontal" spacing="none">
          <IconButton
            aria-label={
              edgeDetectionEnabled
                ? EDITOR_TOOLTIPS.DISABLE_EDGE_DETECTION
                : EDITOR_TOOLTIPS.ENABLE_EDGE_DETECTION
            }
            icon={edgeDetectionEnabled ? EyeIcon : EyeClosedIcon}
            keybindingHint={EDITOR_KEYS.TOGGLE_EDGE_DETECTION.hint}
            onClick={handleToggleEdgeDetection}
            size="medium"
            variant={edgeDetectionEnabled ? "primary" : "default"}
          />

          {edgeDetectionEnabled && (
            <Slider
              callback={handleEdgeDetectionValue}
              initial={edgeDetectionValueRef.current}
              key={`edge-detection-${state.resetKey}`}
              max={EDGE_DETECTION.MAX}
              min={EDGE_DETECTION.MIN}
              name="Edge Detection"
              simple
            />
          )}
        </Stack>

        <Toolbar
          edgeDetectionEnabled={edgeDetectionEnabled}
          isAnalysing={isAnalysing}
          loupeEnabled={loupeEnabled}
          onAnalyse={handleAnalysis}
          onDirectionalPan={handlers.handleDirectionalPan}
          onNavigate={handleEditorNavigation}
          onReset={handleReset}
          onSave={handleSave}
          onSetBrightness={filters.setBrightness}
          onSetContrast={filters.setContrast}
          onSetSaturate={filters.setSaturate}
          onToggleLoupe={handleToggleLoupe}
          onZoomIn={handlers.handleZoomIn}
          onZoomOut={handlers.handleZoomOut}
          resetKey={state.resetKey}
          saving={saving}
          selectedProvider={selectedProvider}
          sliderInitials={sliderInitials}
        />
      </div>
    </>
  );
};

export default memo(ImageEditor);

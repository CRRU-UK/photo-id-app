import { EyeClosedIcon, EyeIcon } from "@primer/octicons-react";
import { IconButton, Stack } from "@primer/react";
import { memo, type RefObject, useCallback, useEffect, useRef, useState } from "react";
import {
  EDGE_DETECTION,
  EDITOR_KEYS,
  EDITOR_TOOLTIPS,
  IMAGE_FILTERS,
  LOUPE,
  UNSAVED_EDITS_MESSAGE,
} from "@/constants";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useSettings } from "@/contexts/SettingsContext";
import LoadingOverlay from "@/frontend/components/LoadingOverlay";
import Slider from "@/frontend/components/Slider";
import Toolbar from "@/frontend/components/Toolbar";
import { useEditorKeyboard } from "@/frontend/hooks/imageEditor/useEditorKeyboard";
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
  const [saving, setSaving] = useState<boolean>(false);
  const [navigating, setNavigating] = useState<boolean>(false);
  const [loupeEnabled, setLoupeEnabled] = useState<boolean>(false);

  const navigatingRef = useRef<boolean>(false);

  const edits = data.edits;

  /**
   * Tracks the last saved edits so hasUnsavedEdits can compare against them. Updated on save
   * because the edit window does not receive UPDATE_PHOTO (only the main window does). Reset from
   * props in an effect when the photo changes (navigation), so the dirty check resets to the new
   * photo's persisted edits.
   */
  const savedEditsRef = useRef(edits);

  const photoId = `${data.directory}/${data.name}`;

  // biome-ignore lint/correctness/useExhaustiveDependencies: edits intentionally captured at the moment of the photo change
  useEffect(() => {
    savedEditsRef.current = edits;
  }, [photoId]);

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
    handleAnalyseMatches,
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

  const getCurrentEdits = useCallback(() => {
    const currentFilters = getters.getFilters();
    const transform = getters.getTransform();

    return {
      brightness: currentFilters.brightness,
      contrast: currentFilters.contrast,
      saturate: currentFilters.saturate,
      zoom: transform.zoom,
      pan: transform.pan,
    };
  }, [getters]);

  const handleSave = useCallback(async () => {
    setSaving(true);

    try {
      const edits = getCurrentEdits();

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
  }, [data, getCurrentEdits]);

  const handleAnalysis = useCallback(() => {
    if (!selectedProvider) {
      return;
    }

    const currentEdits = getCurrentEdits();

    void handleAnalyseMatches(
      [{ ...data, edits: currentEdits, isEdited: computeIsEdited(currentEdits) }],
      data.name,
    );
  }, [data, getCurrentEdits, handleAnalyseMatches, selectedProvider]);

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

      try {
        const result = await window.electronAPI.navigateEditorPhoto(data, direction);
        if (result) {
          setQueryCallback(result);
        }
      } catch (error) {
        console.error("Failed to navigate editor photo:", error);
      } finally {
        navigatingRef.current = false;
        setNavigating(false);
      }
    },
    [data, setQueryCallback, hasUnsavedEdits, handleCloseAnalysis],
  );

  const handleNavigateAsync = useCallback(
    (direction: EditorNavigation) => {
      void handleEditorNavigation(direction);
    },
    [handleEditorNavigation],
  );

  useEditorKeyboard({
    analysisOverlayOpen,
    onAnalyse: handleAnalysis,
    onCloseAnalysis: handleCloseAnalysis,
    onDirectionalPan: handlers.handleDirectionalPan,
    onNavigate: handleNavigateAsync,
    onReset: handleReset,
    onSave: handleSave,
    onToggleEdgeDetection: handleToggleEdgeDetection,
    onToggleLoupe: handleToggleLoupe,
    onZoomIn: handlers.handleZoomIn,
    onZoomOut: handlers.handleZoomOut,
  });

  const previousPhotoIdRef = useRef<string>(`${data.directory}/${data.name}`);
  const loadedPhotoIdRef = useRef<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: log fires once per photo id change; data is intentionally captured at that moment
  useEffect(() => {
    const currentPhotoId = `${data.directory}/${data.name}`;

    if (previousPhotoIdRef.current !== currentPhotoId) {
      previousPhotoIdRef.current = currentPhotoId;
    }

    console.debug("Loaded photo edit data:", data);
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally omit refs.canvasRef so this effect only re-runs when handleWheel changes
  useEffect(() => {
    const canvas = refs.canvasRef.current;

    if (!canvas) {
      return;
    }

    canvas.addEventListener("wheel", handlers.handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handlers.handleWheel);
    };
  }, [handlers.handleWheel]);

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

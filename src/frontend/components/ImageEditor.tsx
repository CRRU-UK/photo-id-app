import { EyeClosedIcon, EyeIcon } from "@primer/octicons-react";
import { IconButton, Stack } from "@primer/react";
import { memo, type RefObject, useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_SETTINGS,
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
  directory: string;
  image: File;
  onError?: () => void;
  onImageLoaded?: () => void;
  setQueryCallback: React.Dispatch<React.SetStateAction<string>>;
}

const ImageEditor = ({
  data,
  directory,
  image,
  setQueryCallback,
  onImageLoaded,
  onError,
}: ImageEditorProps) => {
  const [saving, setSaving] = useState<boolean>(false);
  const [navigating, setNavigating] = useState<boolean>(false);
  const [loupeEnabled, setLoupeEnabled] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const navigatingRef = useRef<boolean>(false);

  /**
   * Edits live in refs inside the editor hook (not React state), so the component does not
   * re-render on change. This ref lets the hook's `onEdit` callback recompute the reactive dirty
   * flag without the hook needing a reference to `hasUnsavedEdits`, which is defined further down.
   */
  const refreshDirtyRef = useRef<() => void>(() => {});
  const handleEdit = useCallback(() => {
    refreshDirtyRef.current();
  }, []);

  const edits = data.edits;

  /**
   * Tracks the last saved edits so hasUnsavedEdits can compare against them. Updated on save
   * because the edit window does not receive UPDATE_PHOTO (only the main window does). Reset from
   * props in an effect when the photo changes (navigation), so the dirty check resets to the new
   * photo's persisted edits.
   */
  const savedEditsRef = useRef(edits);

  const photoId = `${directory}/${data.name}`;

  // biome-ignore lint/correctness/useExhaustiveDependencies: edits intentionally captured at the moment of the photo change
  useEffect(() => {
    savedEditsRef.current = edits;
    setIsDirty(false);
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

  /**
   * Whether to show the unsaved-edits discard warning. Read through a ref so the `beforeunload`
   * and navigation handlers see the latest value without re-binding listeners on every change.
   */
  const showUnsavedWarningRef = useRef<boolean>(DEFAULT_SETTINGS.showUnsavedWarning);
  showUnsavedWarningRef.current =
    settings?.showUnsavedWarning ?? DEFAULT_SETTINGS.showUnsavedWarning;

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
    onEdit: handleEdit,
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

    /**
     * `resetAll` bypasses the hook's onEdit (it is a programmatic reset), so refresh the dirty flag
     * here: resetting to defaults is itself an unsaved change unless the photo was already default.
     */
    refreshDirtyRef.current();
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
      setIsDirty(false);
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

  // Keep the reactive dirty flag (drives the Save button) in sync with the ref-based edit state
  refreshDirtyRef.current = () => {
    setIsDirty(hasUnsavedEdits());
  };

  const handleEditorNavigation = useCallback(
    async (direction: EditorNavigation) => {
      if (navigatingRef.current) {
        return;
      }

      if (showUnsavedWarningRef.current && hasUnsavedEdits()) {
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

  const previousPhotoIdRef = useRef<string>(`${directory}/${data.name}`);
  const loadedPhotoIdRef = useRef<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: log fires once per photo id change; data is intentionally captured at that moment
  useEffect(() => {
    const currentPhotoId = `${directory}/${data.name}`;

    if (previousPhotoIdRef.current !== currentPhotoId) {
      previousPhotoIdRef.current = currentPhotoId;
    }

    console.debug("Loaded photo edit data:", data);
  }, [directory, data.name]);

  useEffect(() => {
    const currentPhotoId = `${directory}/${data.name}`;
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
  }, [directory, data.name, state.imageLoaded, actions, resetEdgeDetection, edits, onImageLoaded]);

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

  /**
   * Warn the user before closing the edit window when there are unsaved changes. Gating
   * preventDefault on the setting means the backend's native close dialog (which only fires in
   * response to `will-prevent-unload`) is suppressed too when the warning is off.
   */
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (showUnsavedWarningRef.current && hasUnsavedEdits()) {
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
          isDirty={isDirty}
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

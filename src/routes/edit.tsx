import { createFileRoute } from "@tanstack/react-router";
import type { SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_WINDOW_TITLE, ROUTES } from "@/constants";
import { AnalysisContextProvider } from "@/contexts/AnalysisContext";
import AnalysisMatchOverlay from "@/frontend/components/AnalysisMatchOverlay";
import ErrorBoundary from "@/frontend/components/ErrorBoundary";
import ImageEditor from "@/frontend/components/ImageEditor";
import LoadingOverlay from "@/frontend/components/LoadingOverlay";
import { buildPhotoUrl, decodeEditPayload, getProjectDirectoryName } from "@/helpers";
import type { EditPayload, LoadingData } from "@/types";

const fetchLocalFile = async (directory: string, photo: EditPayload["photo"]) => {
  const response = await fetch(buildPhotoUrl(directory, photo.name));

  if (!response.ok) {
    throw new Error(`Photo load failed: ${response.status}`);
  }

  const blob = await response.blob();
  return new File([blob], photo.name, { type: blob.type || "image/*" });
};

const getDataParamFromSearch = (): string | null =>
  new URLSearchParams(window.location.search).get("data");

const getInitialLoading = (): LoadingData => ({
  show: getDataParamFromSearch() !== null,
});

const getInitialError = (): string | null =>
  getDataParamFromSearch() === null ? "Missing photo data" : null;

const EditPage = () => {
  const [query, setQuery] = useState<string | null>(getDataParamFromSearch);
  const [loading, setLoading] = useState<LoadingData>(getInitialLoading);
  const [payload, setPayload] = useState<EditPayload | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(getInitialError);

  const setQueryCallback = useCallback((next: SetStateAction<string>) => {
    setQuery((prev) => {
      const value = typeof next === "function" ? next(prev ?? "") : next;
      const search = `?data=${encodeURIComponent(value)}`;

      window.history.replaceState(
        undefined,
        "",
        `${window.location.pathname}${search}#${ROUTES.EDIT}`,
      );

      return value;
    });
  }, []);

  useEffect(() => {
    const queryValue = query;

    if (queryValue === null) {
      return;
    }

    async function fetchData(encoded: string) {
      setLoading({ show: true });
      setError(null);
      setFile(null);

      try {
        const parsedPayload = decodeEditPayload(encoded);
        const projectName = getProjectDirectoryName(parsedPayload.directory);
        document.title = `${projectName} - ${parsedPayload.photo.name} - ${DEFAULT_WINDOW_TITLE}`;

        const response = await fetchLocalFile(parsedPayload.directory, parsedPayload.photo);

        setPayload(parsedPayload);
        setFile(response);
      } catch (err) {
        console.error("Error loading edit data:", err);
        setError("Failed to load photo");
        setLoading({ show: false });
      }
    }

    void fetchData(queryValue);
  }, [query]);

  const handleImageLoaded = useCallback(() => {
    setLoading({ show: false });
  }, []);

  const handleImageError = useCallback(() => {
    setError("Failed to load image: the file may be corrupt or in an unsupported format.");
    setLoading({ show: false });
  }, []);

  if (error) {
    return (
      <>
        <LoadingOverlay data={{ show: false }} />
        <div style={{ padding: "var(--stack-gap-spacious)", textAlign: "center" }}>{error}</div>
      </>
    );
  }

  return (
    <AnalysisContextProvider>
      <LoadingOverlay data={loading} />
      <AnalysisMatchOverlay />
      {payload && file && (
        <ErrorBoundary recovery={{ label: "Reload photo", onClick: () => setError(null) }}>
          <ImageEditor
            data={payload.photo}
            directory={payload.directory}
            image={file}
            onError={handleImageError}
            onImageLoaded={handleImageLoaded}
            setQueryCallback={setQueryCallback}
          />
        </ErrorBoundary>
      )}
    </AnalysisContextProvider>
  );
};

export const Route = createFileRoute("/edit")({
  component: EditPage,
});

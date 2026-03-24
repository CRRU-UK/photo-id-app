import { createFileRoute } from "@tanstack/react-router";
import type { SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";

import type { LoadingData, PhotoBody } from "@/types";

import { DEFAULT_WINDOW_TITLE, ROUTES } from "@/constants";
import { buildPhotoUrl, decodeEditPayload } from "@/helpers";

import ErrorBoundary from "@/frontend/components/ErrorBoundary";
import ImageEditor from "@/frontend/components/ImageEditor";
import LoadingOverlay from "@/frontend/components/LoadingOverlay";

const fetchLocalFile = async (data: PhotoBody) => {
  const response = await fetch(buildPhotoUrl(data.directory, data.name));

  if (!response.ok) {
    throw new Error(`Photo load failed: ${response.status}`);
  }

  const blob = await response.blob();
  return new File([blob], data.name, { type: blob.type || "image/*" });
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
  const [data, setData] = useState<PhotoBody | null>(null);
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
        const parsedData = decodeEditPayload(encoded);
        document.title = `${DEFAULT_WINDOW_TITLE} - ${parsedData.directory}/${parsedData.name}`;

        const response = await fetchLocalFile(parsedData);

        setData(parsedData);
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
    <>
      <LoadingOverlay data={loading} />
      {data && file && (
        <ErrorBoundary recovery={{ label: "Reload photo", onClick: () => setError(null) }}>
          <ImageEditor
            data={data}
            image={file}
            setQueryCallback={setQueryCallback}
            onImageLoaded={handleImageLoaded}
            onError={handleImageError}
          />
        </ErrorBoundary>
      )}
    </>
  );
};

export const Route = createFileRoute(ROUTES.EDIT)({
  component: EditPage,
});

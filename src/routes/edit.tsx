import { createFileRoute } from "@tanstack/react-router";
import type { SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";

import type { LoadingData, PhotoBody } from "@/types";

import { DEFAULT_WINDOW_TITLE } from "@/constants";
import { decodeEditPayload } from "@/helpers";

import ImageEditor from "@/frontend/components/ImageEditor";
import LoadingOverlay from "@/frontend/components/LoadingOverlay";

const fetchLocalFile = async (data: PhotoBody) => {
  const response = await fetch(`file://${data.directory}/${data.name}`);
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

      window.history.replaceState(undefined, "", `${window.location.pathname}${search}#/edit`);

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

    fetchData(queryValue);
  }, [query]);

  const handleImageLoaded = useCallback(() => {
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
        <ImageEditor
          data={data}
          image={file}
          setQueryCallback={setQueryCallback}
          onImageLoaded={handleImageLoaded}
        />
      )}
    </>
  );
};

export const Route = createFileRoute("/edit")({
  component: EditPage,
});

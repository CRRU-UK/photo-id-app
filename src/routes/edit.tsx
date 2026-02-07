import { createFileRoute } from "@tanstack/react-router";
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

const EditPage = () => {
  const dataParam = new URLSearchParams(window.location.search).get("data");
  const [query, setQuery] = useState<string | null>(dataParam);
  const [loading, setLoading] = useState<LoadingData>({ show: true });
  const [data, setData] = useState<PhotoBody | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryValue = query;

    if (queryValue === null) {
      setLoading({ show: false });
      setError("Missing photo data");
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
      } finally {
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
          setQueryCallback={(next) => setQuery(next)}
          onImageLoaded={handleImageLoaded}
        />
      )}
    </>
  );
};

export const Route = createFileRoute("/edit")({
  component: EditPage,
});

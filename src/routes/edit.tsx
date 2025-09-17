import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import type { LoadingData, PhotoBody } from "@/types";

import { DEFAULT_WINDOW_TITLE } from "@/constants";

import ImageEditor from "@/frontend/components/ImageEditor";
import LoadingOverlay from "@/frontend/components/LoadingOverlay";

const fetchLocalFile = async (data: PhotoBody) => {
  const response = await fetch(`file://${data.directory}/${data?.edited || data.name}`);
  const blob = await response.blob();
  return new File([blob], data.name, { type: blob.type || "image/*" });
};

const EditPage = () => {
  const [query, setQuery] = useState<string>(
    new URLSearchParams(window.location.search).get("data")!,
  );
  const [loading, setLoading] = useState<LoadingData>({ show: true });
  const [data, setData] = useState<PhotoBody | null>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    async function fetchData() {
      const parsedData = JSON.parse(atob(query)) as PhotoBody;
      setData(parsedData);

      document.title = `${DEFAULT_WINDOW_TITLE} - ${parsedData.directory}/${parsedData.name}`;

      const response = await fetchLocalFile(parsedData);
      setFile(response);

      setLoading({ show: false });
    }

    fetchData();
  }, [query]);

  return (
    <>
      <LoadingOverlay data={loading} />
      {data && file && <ImageEditor data={data} image={file} setQueryCallback={setQuery} />}
    </>
  );
};

export const Route = createFileRoute("/edit")({
  component: EditPage,
});

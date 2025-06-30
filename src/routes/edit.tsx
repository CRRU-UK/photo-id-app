import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";

import ImageEditor from "@/frontend/modules/ImageEditor";
import LoadingOverlay, { type LoadingOverlayProps } from "@/frontend/modules/LoadingOverlay";
import type { PhotoBody } from "@/types";

const fetchLocalFile = async (data: PhotoBody) => {
  const response = await fetch(`file://${data.directory}/${data.edited}`);
  const blob = await response.blob();
  return new File([blob], data.name, { type: blob.type || "image/*" });
};

const EditPage = () => {
  const [loading, setLoading] = useState<LoadingOverlayProps>({ show: true });
  const [data, setData] = useState<PhotoBody | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // For hash routing
  const queryValue = new URLSearchParams(window.location.search).get("data")!;

  useEffect(() => {
    async function fetchData() {
      const parsedData: PhotoBody = JSON.parse(atob(queryValue));
      setData(parsedData);

      const response = await fetchLocalFile(parsedData);
      setFile(response);

      setLoading({ show: false });
    }

    fetchData();
  }, [queryValue]);

  return (
    <>
      <LoadingOverlay show={loading.show} />
      {data && file && <ImageEditor data={data} image={file} />}
    </>
  );
};

export const Route = createFileRoute("/edit")({
  component: EditPage,
});

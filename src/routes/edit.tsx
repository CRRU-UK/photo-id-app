import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import ImageEditor from "@/frontend/components/ImageEditor";
import LoadingOverlay from "@/frontend/components/LoadingOverlay";
import type { LoadingData, PhotoBody } from "@/types";

const fetchLocalFile = async (data: PhotoBody) => {
  const response = await fetch(`file://${data.directory}/${data?.edited || data.name}`);
  const blob = await response.blob();
  return new File([blob], data.name, { type: blob.type || "image/*" });
};

const EditPage = () => {
  const [loading, setLoading] = useState<LoadingData>({ show: true });
  const [data, setData] = useState<PhotoBody | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // For hash routing
  const queryValue = new URLSearchParams(window.location.search).get("data")!;

  useEffect(() => {
    async function fetchData() {
      const parsedData = JSON.parse(atob(queryValue)) as PhotoBody;
      setData(parsedData);

      const response = await fetchLocalFile(parsedData);
      setFile(response);

      setLoading({ show: false });
    }

    fetchData();
  }, [queryValue]);

  return (
    <>
      <LoadingOverlay data={loading} />
      {data && file && <ImageEditor data={data} image={file} />}
    </>
  );
};

export const Route = createFileRoute("/edit")({
  component: EditPage,
});

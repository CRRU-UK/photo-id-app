import type { EditWindowData } from "@/types";

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";

import ImageEditor from "@/frontend/modules/ImageEditor";

const fetchLocalFile = async (data: EditWindowData) => {
  const response = await fetch(`file://${data.path}`);
  const blob = await response.blob();
  return new File([blob], data.name, { type: blob.type || "image/*" });
};

const Edit = () => {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<EditWindowData | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get("data")!;

  useEffect(() => {
    async function fetchData() {
      const parsedData: EditWindowData = JSON.parse(atob(query));
      setData(parsedData);

      const response = await fetchLocalFile(parsedData);
      setFile(response);
    }

    fetchData();
  }, [query]);

  return file && data && <ImageEditor image={file} data={data} />;
};

export const Route = createFileRoute("/edit")({
  component: Edit,
});

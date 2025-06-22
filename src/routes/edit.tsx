import type { EditWindowData } from "@/types";

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";

import ImageEditor from "@/frontend/modules/ImageEditor";

const fetchLocalFile = async (data: EditWindowData) => {
  const response = await fetch(data.file);
  const blob = await response.blob();
  return new File([blob], data.name, { type: blob.type || "image/*" });
};

const Edit = () => {
  const [file, setFile] = useState<File | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const data = urlParams.get("data")!;

  useEffect(() => {
    async function fetchData() {
      const parsedData: EditWindowData = JSON.parse(atob(data));
      const response = await fetchLocalFile(parsedData);
      setFile(response);
    }
    fetchData();
  }, [data]);

  return file && <ImageEditor image={file} />;
};

export const Route = createFileRoute("/edit")({
  component: Edit,
});

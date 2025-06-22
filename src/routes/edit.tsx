import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";

import ImageEditor from "@/frontend/modules/ImageEditor";

const fetchLocalFile = async (url: string) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], "???", { type: blob.type || "image/*" });
};

const Edit = () => {
  const [file, setFile] = useState<File | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const data = atob(urlParams.get("data")!);

  useEffect(() => {
    async function fetchData() {
      const response = await fetchLocalFile(data);
      setFile(response);
    }
    fetchData();
  }, [data]);

  return file && <ImageEditor image={file} />;
};

export const Route = createFileRoute("/edit")({
  component: Edit,
});

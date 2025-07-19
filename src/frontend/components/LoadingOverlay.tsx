import { Stack as PrimerStack, ProgressBar, Spinner } from "@primer/react";
import { memo } from "react";

import { LoadingData } from "@/types";

const LoadingOverlay = ({ show, text, progress = false }: LoadingData) => {
  if (!show) {
    return null;
  }

  console.log("progress", progress);

  return (
    <div className="loading">
      <PrimerStack
        direction="vertical"
        align="center"
        gap="spacious"
        sx={{ width: "100%", maxWidth: "600px" }}
      >
        {progress === false && <Spinner size="large" />}
        {text && <span className="text">{text}</span>}
        {progress !== false && (
          <ProgressBar animated progress={progress} barSize="large" style={{ width: "100%" }} />
        )}
      </PrimerStack>
    </div>
  );
};

export default memo(LoadingOverlay);

import { Stack as PrimerStack, ProgressBar, Spinner, Text } from "@primer/react";
import { memo } from "react";

import type { LoadingData } from "@/types";

interface ProgressProps {
  label?: string;
  value: number;
}

const Progress = ({ value, label }: ProgressProps) => (
  <>
    <ProgressBar animated barSize="large" progress={value} style={{ width: "100%" }} />
    {label && (
      <Text style={{ color: "var(--fgColor-muted)", font: "var(--text-body-shorthand-medium)" }}>
        {label}
      </Text>
    )}
  </>
);

interface LoadingOverlayProps {
  data: LoadingData;
}

const LoadingOverlay = ({ data }: LoadingOverlayProps) => {
  const { show, text, progressValue = null, progressText } = data;

  if (!show) {
    return null;
  }

  return (
    <div className="loading">
      <PrimerStack
        align="center"
        direction="vertical"
        gap="spacious"
        style={{ width: "100%", maxWidth: "600px" }}
      >
        {progressValue === null && <Spinner size="large" />}
        {text && <span className="text">{text}</span>}
        {progressValue !== null && <Progress label={progressText} value={progressValue} />}
      </PrimerStack>
    </div>
  );
};

export default memo(LoadingOverlay);

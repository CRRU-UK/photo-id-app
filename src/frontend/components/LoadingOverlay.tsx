import { Stack as PrimerStack, ProgressBar, Spinner, Text } from "@primer/react";
import { memo } from "react";

import { LoadingData } from "@/types";

interface ProgressProps {
  value: number;
  label?: string;
}

const Progress = ({ value, label }: ProgressProps) => (
  <ProgressBar
    animated
    progress={value}
    barSize="large"
    style={{ width: "100%" }}
    aria-label={label}
  />
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
        direction="vertical"
        align="center"
        gap="spacious"
        sx={{ width: "100%", maxWidth: "600px" }}
      >
        {progressValue === null && <Spinner size="large" />}
        {text && <span className="text">{text}</span>}
        {progressValue !== null && <Progress value={progressValue} animated size="large" />}
        {progressText && (
          <Text sx={{ color: "var(--fgColor-muted)", font: "var(--text-body-shorthand-medium)" }}>
            {progressText}
          </Text>
        )}
      </PrimerStack>
    </div>
  );
};

export default memo(LoadingOverlay);

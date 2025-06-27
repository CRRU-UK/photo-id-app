import { Spinner } from "@primer/react";

interface LoadingOverlayProps {
  active: boolean;
}

const LoadingOverlay = ({ active }: LoadingOverlayProps) => {
  if (!active) {
    return null;
  }

  return (
    <div className="loading">
      <Spinner size="large" />
    </div>
  );
};

export default LoadingOverlay;

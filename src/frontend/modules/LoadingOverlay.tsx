import { Spinner } from "@primer/react";

export interface LoadingOverlayProps {
  show: boolean;
  text?: string;
}

const LoadingOverlay = ({ show, text }: LoadingOverlayProps) => {
  if (!show) {
    return null;
  }

  return (
    <div className="loading">
      <Spinner size="large" />
      {text && <span className="text">{text}</span>}
    </div>
  );
};

export default LoadingOverlay;

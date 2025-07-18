import { Spinner } from "@primer/react";

import { LoadingData } from "@/types";

// TODO: Move to provider
const LoadingOverlay = ({ show, text }: LoadingData) => {
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

import { Spinner } from "@primer/react";
import { memo } from "react";

import { LoadingData } from "@/types";

// TODO: Move to provider
const LoadingOverlay = ({ show, text }: LoadingData) => {
  console.log("LoadingOverlay ------->");

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

export default memo(LoadingOverlay);

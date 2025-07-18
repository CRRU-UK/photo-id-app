import { Spinner } from "@primer/react";
import { memo } from "react";

import { LoadingData } from "@/types";

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

export default memo(LoadingOverlay);

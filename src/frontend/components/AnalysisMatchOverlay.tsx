import { Dialog } from "@primer/react";

import { useAnalysis } from "@/contexts/AnalysisContext";
import AnalysisMatchResults from "@/frontend/components/AnalysisMatchResults";

const AnalysisMatchOverlay = () => {
  const { isAnalysing, isOpen, handleClose } = useAnalysis();

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog
      footerButtons={
        isAnalysing
          ? [{ buttonType: "danger", content: "Cancel", onClick: handleClose }]
          : [{ buttonType: "default", content: "Close", onClick: handleClose }]
      }
      onClose={handleClose}
      title="Match Analysis"
      width="900px"
    >
      <AnalysisMatchResults />
    </Dialog>
  );
};

export default AnalysisMatchOverlay;
